import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Server as SocketIOServer } from 'socket.io';

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { dashboardRoutes } from './routes/dashboards';
import { widgetRoutes } from './routes/widgets';
import { groupRoutes } from './routes/groups';
import { accountRoutes } from './routes/accounts';
import { settingsRoutes } from './routes/settings';
import { providerRoutes } from './routes/providers';
import { exchangeRoutes } from './routes/exchange';
import { websocketRoutes } from './routes/websocket';
import { proxyRoutes } from './routes/proxy';
import { cleanupCache } from './services/ccxtCache';
import { validateSession, deleteExpiredSessions } from './services/auth';
import { db } from './db';
import {
  createSubscriptionKey,
  startWebSocketSubscription,
  addSubscription,
  hasSubscription,
  removeSubscriptionFromSocket,
  removeSocketSubscriptions,
  type WebSocketSubscription,
} from './services/wsSubscriptions';

const PORT = Number(process.env.PORT) || 3001;
const API_TOKEN = process.env.API_TOKEN || 'your-secret-token';

// Elysia HTTP server
const app = new Elysia()
  .use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }))
  .use(healthRoutes)
  .use(authRoutes)
  .onBeforeHandle(async ({ request, set }) => {
    const pathname = new URL(request.url).pathname;

    // Skip auth for health and auth routes
    if (pathname === '/health' || pathname.startsWith('/api/auth')) return;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      set.status = 401;
      return { error: 'Access token required' };
    }

    // Allow server-to-server API_TOKEN
    if (token === API_TOKEN) return;

    // Allow valid user session token
    const user = await validateSession(db, token);
    if (user) return;

    set.status = 403;
    return { error: 'Invalid token' };
  })
  .use(dashboardRoutes)
  .use(widgetRoutes)
  .use(groupRoutes)
  .use(accountRoutes)
  .use(settingsRoutes)
  .use(providerRoutes)
  .use(exchangeRoutes)
  .use(websocketRoutes)
  .use(proxyRoutes)
  .listen(PORT);

// Socket.IO attaches to the same Bun server via its underlying http handling
const io = new SocketIOServer(PORT + 1, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('authenticate', (data) => {
    if (data.token !== API_TOKEN) {
      socket.emit('auth_error', { error: 'Invalid token' });
      socket.disconnect();
      return;
    }
    socket.emit('authenticated', { success: true });
  });

  socket.on('subscribe', async (data) => {
    const { exchangeId, symbol, dataType, timeframe, config } = data;
    if (!exchangeId || !symbol || !dataType) {
      socket.emit('subscription_error', { error: 'Missing required parameters' });
      return;
    }

    const subscriptionKey = createSubscriptionKey(exchangeId, symbol, dataType, timeframe);
    const subscriptionId = `${socket.id}:${subscriptionKey}`;

    if (hasSubscription(subscriptionId)) {
      socket.emit('subscription_error', { error: 'Subscription already exists' });
      return;
    }

    const subscription: WebSocketSubscription = {
      id: subscriptionId,
      socketId: socket.id,
      exchangeId,
      symbol,
      dataType,
      timeframe,
      config: { ...config, ccxtType: 'pro' as const },
      isActive: true,
    };

    addSubscription(subscription);

    try {
      await startWebSocketSubscription(
        subscription,
        (sid, d) => io.to(sid).emit('data', d),
        (sid, d) => io.to(sid).emit('error', d)
      );
      socket.emit('subscribed', { subscriptionId, exchangeId, symbol, dataType, timeframe });
    } catch (error) {
      // Clean up orphan subscription on failure
      removeSubscriptionFromSocket(socket.id, subscriptionId);
      socket.emit('subscription_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  socket.on('unsubscribe', (data) => {
    const { subscriptionId } = data;
    if (!subscriptionId) {
      socket.emit('unsubscribe_error', { error: 'Missing subscriptionId' });
      return;
    }
    removeSubscriptionFromSocket(socket.id, subscriptionId);
    socket.emit('unsubscribed', { subscriptionId });
  });

  socket.on('disconnect', () => {
    removeSocketSubscriptions(socket.id);
  });
});

// Cleanup cache every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

// Cleanup expired sessions every hour
setInterval(() => deleteExpiredSessions(db), 60 * 60 * 1000);

console.log(`Profitmaker API server running on port ${PORT} (Elysia/Bun)`);
console.log(`WebSocket server running on port ${PORT + 1} (Socket.IO)`);
console.log(`Health check: http://localhost:${PORT}/health`);
