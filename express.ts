import express from 'express';
import cors from 'cors';
import ccxt from 'ccxt';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Try to import CCXT Pro, fallback if not available
let ccxtPro: any = null;
try {
  ccxtPro = (ccxt as any).pro;
} catch (error) {
  console.warn('⚠️ CCXT Pro not available, WebSocket features will be disabled');
}

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins to bypass CORS issues
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));
app.use(express.json());

// Authentication middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Simple token validation - in production use proper JWT validation
  const validToken = process.env.API_TOKEN || 'your-secret-token';
  if (token !== validToken) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  next();
};

// Apply authentication to all routes except health check
app.use((req, res, next) => {
  if (req.path === '/health') {
    next();
  } else {
    authenticateToken(req, res, next);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CCXT instance cache
const instanceCache = new Map<string, any>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

// WebSocket subscriptions management
interface WebSocketSubscription {
  id: string;
  socketId: string;
  exchangeId: string;
  symbol: string;
  dataType: 'ticker' | 'trades' | 'orderbook' | 'ohlcv' | 'balance';
  timeframe?: string;
  config: CCXTInstanceConfig;
  isActive: boolean;
  ccxtInstance?: any;
}

const activeSubscriptions = new Map<string, WebSocketSubscription>();
const socketSubscriptions = new Map<string, Set<string>>(); // socketId -> subscriptionIds

// Create subscription key
const createSubscriptionKey = (exchangeId: string, symbol: string, dataType: string, timeframe?: string): string => {
  const parts = [exchangeId, symbol, dataType];
  if (timeframe) parts.push(timeframe);
  return parts.join(':');
};

// Start WebSocket subscription
const startWebSocketSubscription = async (subscription: WebSocketSubscription): Promise<void> => {
  try {
    const instance = await getCCXTInstance(subscription.config);
    subscription.ccxtInstance = instance;

    console.log(`🔄 Starting WebSocket subscription: ${subscription.id}`);

    const watchData = async () => {
      try {
        let data: any;

        switch (subscription.dataType) {
          case 'ticker':
            if (!instance.has['watchTicker']) {
              throw new Error(`${subscription.exchangeId} does not support watchTicker`);
            }
            data = await instance.watchTicker(subscription.symbol);
            break;

          case 'trades':
            if (!instance.has['watchTrades']) {
              throw new Error(`${subscription.exchangeId} does not support watchTrades`);
            }
            data = await instance.watchTrades(subscription.symbol);
            break;

          case 'orderbook':
            if (!instance.has['watchOrderBook']) {
              throw new Error(`${subscription.exchangeId} does not support watchOrderBook`);
            }
            data = await instance.watchOrderBook(subscription.symbol);
            break;

          case 'ohlcv':
            if (!instance.has['watchOHLCV']) {
              throw new Error(`${subscription.exchangeId} does not support watchOHLCV`);
            }
            if (!subscription.timeframe) {
              throw new Error('Timeframe is required for OHLCV subscription');
            }
            data = await instance.watchOHLCV(subscription.symbol, subscription.timeframe);
            break;

          case 'balance':
            if (!instance.has['watchBalance']) {
              throw new Error(`${subscription.exchangeId} does not support watchBalance`);
            }
            data = await instance.watchBalance();
            break;

          default:
            throw new Error(`Unsupported data type: ${subscription.dataType}`);
        }

        // Emit data to specific socket
        io.to(subscription.socketId).emit('data', {
          subscriptionId: subscription.id,
          dataType: subscription.dataType,
          exchange: subscription.exchangeId,
          symbol: subscription.symbol,
          timeframe: subscription.timeframe,
          data: data,
          timestamp: Date.now()
        });

        // Continue watching if subscription is still active
        if (subscription.isActive) {
          setImmediate(watchData);
        }

      } catch (error) {
        console.error(`❌ WebSocket error for ${subscription.id}:`, error);

        // Emit error to client
        io.to(subscription.socketId).emit('error', {
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Retry after delay if subscription is still active
        if (subscription.isActive) {
          setTimeout(watchData, 5000); // Retry after 5 seconds
        }
      }
    };

    // Start watching
    watchData();

  } catch (error) {
    console.error(`❌ Failed to start WebSocket subscription ${subscription.id}:`, error);
    throw error;
  }
};

// Stop WebSocket subscription
const stopWebSocketSubscription = (subscriptionId: string): void => {
  const subscription = activeSubscriptions.get(subscriptionId);
  if (subscription) {
    subscription.isActive = false;
    activeSubscriptions.delete(subscriptionId);
    console.log(`🛑 Stopped WebSocket subscription: ${subscriptionId}`);
  }
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Initialize socket subscriptions
  socketSubscriptions.set(socket.id, new Set());

  // Handle authentication
  socket.on('authenticate', (data) => {
    const { token } = data;
    const validToken = process.env.API_TOKEN || 'your-secret-token';

    if (token !== validToken) {
      socket.emit('auth_error', { error: 'Invalid token' });
      socket.disconnect();
      return;
    }

    socket.emit('authenticated', { success: true });
    console.log(`✅ Client authenticated: ${socket.id}`);
  });

  // Handle WebSocket subscription
  socket.on('subscribe', async (data) => {
    try {
      const { exchangeId, symbol, dataType, timeframe, config } = data;

      if (!exchangeId || !symbol || !dataType) {
        socket.emit('subscription_error', { error: 'Missing required parameters' });
        return;
      }

      const subscriptionKey = createSubscriptionKey(exchangeId, symbol, dataType, timeframe);
      const subscriptionId = `${socket.id}:${subscriptionKey}`;

      // Check if subscription already exists
      if (activeSubscriptions.has(subscriptionId)) {
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
        config: {
          ...config,
          ccxtType: 'pro' // Force pro for WebSocket
        },
        isActive: true
      };

      // Add to active subscriptions
      activeSubscriptions.set(subscriptionId, subscription);
      socketSubscriptions.get(socket.id)?.add(subscriptionId);

      // Start WebSocket subscription
      await startWebSocketSubscription(subscription);

      socket.emit('subscribed', {
        subscriptionId,
        exchangeId,
        symbol,
        dataType,
        timeframe
      });

      console.log(`📡 New subscription: ${subscriptionId}`);

    } catch (error) {
      socket.emit('subscription_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Handle unsubscribe
  socket.on('unsubscribe', (data) => {
    const { subscriptionId } = data;

    if (!subscriptionId) {
      socket.emit('unsubscribe_error', { error: 'Missing subscriptionId' });
      return;
    }

    stopWebSocketSubscription(subscriptionId);
    socketSubscriptions.get(socket.id)?.delete(subscriptionId);

    socket.emit('unsubscribed', { subscriptionId });
    console.log(`📡 Unsubscribed: ${subscriptionId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);

    // Stop all subscriptions for this socket
    const subscriptions = socketSubscriptions.get(socket.id);
    if (subscriptions) {
      for (const subscriptionId of subscriptions) {
        stopWebSocketSubscription(subscriptionId);
      }
      socketSubscriptions.delete(socket.id);
    }
  });
});

interface CCXTInstanceConfig {
  exchangeId: string;
  marketType: string;
  ccxtType: 'regular' | 'pro';
  apiKey?: string;
  secret?: string;
  password?: string;
  sandbox?: boolean;
}

// Create cache key for CCXT instance
const createCacheKey = (config: CCXTInstanceConfig): string => {
  const keyParts = [
    config.exchangeId,
    config.marketType,
    config.ccxtType,
    config.sandbox ? 'sandbox' : 'live'
  ];
  
  if (config.apiKey) {
    keyParts.push(config.apiKey.substring(0, 8)); // First 8 chars for uniqueness
  }
  
  return keyParts.join(':');
};

// Get or create CCXT instance
const getCCXTInstance = async (config: CCXTInstanceConfig): Promise<any> => {
  const cacheKey = createCacheKey(config);
  const cached = instanceCache.get(cacheKey);
  
  // Check cache validity
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`📋 Using cached instance for ${cacheKey}`);
    return cached.instance;
  }
  
  console.log(`🔄 Creating new instance for ${cacheKey}`);
  
  // Select CCXT library
  let ccxtLib: any;
  let ExchangeClass: any;

  if (config.ccxtType === 'pro') {
    if (!ccxtPro) {
      throw new Error('CCXT Pro not available');
    }
    ccxtLib = ccxtPro;
    ExchangeClass = ccxtLib[config.exchangeId];
  } else {
    ccxtLib = ccxt;
    ExchangeClass = ccxtLib[config.exchangeId];
  }

  if (!ExchangeClass) {
    throw new Error(`Exchange ${config.exchangeId} not found in CCXT${config.ccxtType === 'pro' ? ' Pro' : ''}`);
  }
  
  // Create instance config
  const instanceConfig: any = {
    enableRateLimit: true,
    sandbox: config.sandbox || false,
    // Configure for server-side usage to bypass CORS
    headers: {
      'User-Agent': 'CCXT-Express-Server/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    // Disable browser-specific features
    agent: false, // Disable HTTP agent for server usage
    timeout: 30000,
  };
  
  // Add credentials if provided
  if (config.apiKey && config.secret) {
    instanceConfig.apiKey = config.apiKey;
    instanceConfig.secret = config.secret;
    if (config.password) {
      instanceConfig.password = config.password;
    }
  }
  
  // Set market type
  if (config.marketType === 'futures') {
    instanceConfig.defaultType = 'future';
  } else if (config.marketType === 'spot') {
    instanceConfig.defaultType = 'spot';
  }
  
  const exchangeInstance = new ExchangeClass(instanceConfig);
  
  // Load markets
  try {
    await exchangeInstance.loadMarkets();
    console.log(`✅ Markets loaded for ${config.exchangeId}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load markets for ${config.exchangeId}:`, error);
  }
  
  // Cache instance
  instanceCache.set(cacheKey, {
    instance: exchangeInstance,
    timestamp: Date.now()
  });
  
  return exchangeInstance;
};

// Get exchange instance endpoint
app.post('/api/exchange/instance', async (req, res) => {
  try {
    const config: CCXTInstanceConfig = req.body;
    
    if (!config.exchangeId) {
      return res.status(400).json({ error: 'exchangeId is required' });
    }
    
    const instance = await getCCXTInstance(config);
    
    res.json({
      success: true,
      exchangeId: config.exchangeId,
      marketType: config.marketType || 'spot',
      ccxtType: config.ccxtType || 'regular',
      sandbox: config.sandbox || false,
      hasCredentials: !!(config.apiKey && config.secret)
    });
  } catch (error) {
    console.error('Failed to create exchange instance:', error);
    res.status(500).json({ 
      error: 'Failed to create exchange instance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fetch market data endpoints
app.post('/api/exchange/fetchTicker', async (req, res) => {
  try {
    const { config, symbol } = req.body;
    const instance = await getCCXTInstance(config);
    const ticker = await instance.fetchTicker(symbol);
    res.json({ success: true, data: ticker });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch ticker',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/fetchOrderBook', async (req, res) => {
  try {
    const { config, symbol, limit } = req.body;
    const instance = await getCCXTInstance(config);
    const orderbook = await instance.fetchOrderBook(symbol, limit);
    res.json({ success: true, data: orderbook });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch orderbook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/fetchTrades', async (req, res) => {
  try {
    const { config, symbol, limit } = req.body;
    const instance = await getCCXTInstance(config);
    const trades = await instance.fetchTrades(symbol, undefined, limit);
    res.json({ success: true, data: trades });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch trades',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/fetchOHLCV', async (req, res) => {
  try {
    const { config, symbol, timeframe, limit } = req.body;
    const instance = await getCCXTInstance(config);
    const ohlcv = await instance.fetchOHLCV(symbol, timeframe, undefined, limit);
    res.json({ success: true, data: ohlcv });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch OHLCV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Trading endpoints (require credentials)
app.post('/api/exchange/fetchBalance', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config.apiKey || !config.secret) {
      return res.status(400).json({ error: 'API credentials required for balance' });
    }
    
    const instance = await getCCXTInstance(config);
    const balance = await instance.fetchBalance();
    res.json({ success: true, data: balance });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// WebSocket endpoints for CCXT Pro
app.post('/api/exchange/watchTicker', async (req, res) => {
  try {
    const { config, symbol } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchTicker']) {
      return res.status(400).json({ error: 'Exchange does not support watchTicker' });
    }

    const ticker = await instance.watchTicker(symbol);
    res.json({ success: true, data: ticker });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch ticker',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/watchOrderBook', async (req, res) => {
  try {
    const { config, symbol, limit } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchOrderBook']) {
      return res.status(400).json({ error: 'Exchange does not support watchOrderBook' });
    }

    const orderbook = await instance.watchOrderBook(symbol, limit);
    res.json({ success: true, data: orderbook });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch orderbook',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/watchTrades', async (req, res) => {
  try {
    const { config, symbol } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchTrades']) {
      return res.status(400).json({ error: 'Exchange does not support watchTrades' });
    }

    const trades = await instance.watchTrades(symbol);
    res.json({ success: true, data: trades });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch trades',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/watchOHLCV', async (req, res) => {
  try {
    const { config, symbol, timeframe } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchOHLCV']) {
      return res.status(400).json({ error: 'Exchange does not support watchOHLCV' });
    }

    const ohlcv = await instance.watchOHLCV(symbol, timeframe);
    res.json({ success: true, data: ohlcv });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch OHLCV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/exchange/watchBalance', async (req, res) => {
  try {
    const { config } = req.body;

    if (config.ccxtType !== 'pro') {
      return res.status(400).json({ error: 'WebSocket requires CCXT Pro' });
    }

    if (!config.apiKey || !config.secret) {
      return res.status(400).json({ error: 'API credentials required for balance watching' });
    }

    const instance = await getCCXTInstance(config);

    if (!instance.has['watchBalance']) {
      return res.status(400).json({ error: 'Exchange does not support watchBalance' });
    }

    const balance = await instance.watchBalance();
    res.json({ success: true, data: balance });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to watch balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get exchange capabilities
app.post('/api/exchange/capabilities', async (req, res) => {
  try {
    const { config } = req.body;
    const instance = await getCCXTInstance(config);

    res.json({
      success: true,
      data: {
        has: instance.has,
        markets: Object.keys(instance.markets || {}),
        symbols: instance.symbols || [],
        timeframes: instance.timeframes || {},
        fees: instance.fees || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get capabilities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generic HTTP proxy endpoint for bypassing CORS
app.post('/api/proxy/request', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🌐 [Proxy] ${method} ${url}`);

    // Add CORS-bypass headers
    const proxyHeaders = {
      'User-Agent': 'CCXT-Express-Server/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: proxyHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseData = await response.text();
    let parsedData;

    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    res.status(response.status).json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: parsedData
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      res.status(408).json({
        error: 'Request timeout',
        details: `Request timed out after ${req.body.timeout || 30000}ms`
      });
    } else {
      res.status(500).json({
        error: 'Proxy request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Cleanup cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of instanceCache.entries()) {
    if ((now - cached.timestamp) > CACHE_TTL) {
      instanceCache.delete(key);
      console.log(`🧽 Cleaned up expired instance: ${key}`);
    }
  }
}, 10 * 60 * 1000); // Every 10 minutes

server.listen(PORT, () => {
  console.log(`🚀 CCXT Express Server running on port ${PORT}`);
  console.log(`🔑 API Token: ${process.env.API_TOKEN || 'your-secret-token'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server ready for connections`);
});
