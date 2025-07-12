# CCXT Express Provider

This document describes the new CCXT Express Provider, which allows moving CCXT operations to a separate Express server.

## ✅ Implementation Status

**FULLY IMPLEMENTED:**
- ✅ Express server with CCXT integration
- ✅ CCXT Server Provider for browser application
- ✅ Integration with existing provider architecture
- ✅ Support for all main methods (fetchTicker, fetchOrderBook, fetchTrades, fetchOHLCV)
- ✅ **Full WebSocket support** (watchTicker, watchTrades, watchOrderBook, watchOHLCV, watchBalance)
- ✅ **Unified logic** between browser and server providers
- ✅ **CORS Bypass** - main function for bypassing browser restrictions
- ✅ CCXT instances caching on server
- ✅ Token-based authentication
- ✅ Error handling and timeouts
- ✅ Test components for functionality verification
- ✅ Complete documentation

## Architecture

### Browser Provider vs Server Provider

**Browser Provider** (existing):
- CCXT executes directly in the browser
- Uses CDN version of CCXT
- All operations happen on the client

**Server Provider** (new):
- CCXT executes on Express server
- Browser sends HTTP requests to server
- Server can be run anywhere (locally, on another server)
- **Main goal: bypass browser CORS restrictions**
- Server proxies requests to exchanges with proper headers

## Installation and Setup

### 1. Install Dependencies

Dependencies are already added to the project:
```bash
npm install express cors ccxt @types/express @types/cors tsx
```

### 2. Start Express Server

```bash
# Regular start
npm run server

# Start with auto-reload on changes
npm run server:dev
```

Server will start on port 3001 (or PORT from environment variables).

### 3. Authentication Setup

By default, server uses simple token authentication:

```bash
# Set your own token
export API_TOKEN=your-secret-token

# Or use default
# Token: your-secret-token
```

## Usage in Application

### 1. Create Server Provider

```typescript
import { useDataProviderStore } from './store/dataProviderStore';

const { createProvider } = useDataProviderStore();

// Create server provider
createProvider('ccxt-server', 'My CCXT Server', ['*'], {
  serverUrl: 'http://localhost:3001',
  token: 'your-secret-token',
  timeout: 30000,
  sandbox: true
});
```

### 2. Configuration Parameters

```typescript
interface CCXTServerConfig {
  serverUrl: string;    // Server URL (required)
  token?: string;       // Authentication token
  timeout?: number;     // Request timeout (default 30000ms)
  sandbox?: boolean;    // Sandbox mode
}
```

### 3. Testing

#### TestProviderIntegration Component
The application has a `TestProviderIntegration` component with "Create Server Provider" button for quick testing.

#### TestServerProvider Component
A special `TestServerProvider` component was created for complete server provider testing:
- Server connection test
- Exchange instance creation test
- Ticker data retrieval test
- Server provider creation in application

Import and use the component:
```tsx
import TestServerProvider from './components/TestServerProvider';

// In your component
<TestServerProvider />
```

## Server API

### Authentication

All requests (except `/health`) require header:
```
Authorization: Bearer your-secret-token
```

### Main Endpoints

#### Health Check
```
GET /health
```

#### Create Exchange Instance
```
POST /api/exchange/instance
{
  "exchangeId": "binance",
  "marketType": "spot",
  "ccxtType": "regular",
  "sandbox": false
}
```

#### Data Retrieval
```
POST /api/exchange/fetchTicker
{
  "config": { ... },
  "symbol": "BTC/USDT"
}

POST /api/exchange/fetchOrderBook
{
  "config": { ... },
  "symbol": "BTC/USDT",
  "limit": 100
}

POST /api/exchange/fetchTrades
{
  "config": { ... },
  "symbol": "BTC/USDT",
  "limit": 100
}

POST /api/exchange/fetchOHLCV
{
  "config": { ... },
  "symbol": "BTC/USDT",
  "timeframe": "1m",
  "limit": 100
}
```

#### WebSocket (Real-time Streaming)

**Server WebSocket Connection:**
```javascript
// Frontend connects to server WebSocket
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Authenticate
socket.emit('authenticate', { token: 'your-secret-token' });

// Subscribe to real-time ticker
socket.emit('subscribe', {
  exchangeId: 'kraken',
  symbol: 'BTC/USD',
  dataType: 'ticker',
  config: {
    exchangeId: 'kraken',
    ccxtType: 'pro',
    marketType: 'spot',
    sandbox: false
  }
});

// Receive real-time data
socket.on('data', (data) => {
  console.log('Real-time ticker:', data);
  // data.data contains the ticker information
  // data.subscriptionId, data.exchange, data.symbol, etc.
});

// Handle errors
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

**Available WebSocket Data Types:**
- `ticker` - Real-time price updates
- `trades` - Live trade stream
- `orderbook` - Order book updates
- `ohlcv` - Candlestick data (requires timeframe)
- `balance` - Account balance updates (requires API keys)

**Legacy HTTP Endpoints (single request):**
```
POST /api/exchange/watchTicker    # Returns single ticker
POST /api/exchange/watchTrades    # Returns single trades array
POST /api/exchange/watchOrderBook # Returns single orderbook
POST /api/exchange/watchOHLCV     # Returns single OHLCV array
POST /api/exchange/watchBalance   # Returns single balance
```

#### CORS Proxy (main function)
```
POST /api/proxy/request
{
  "url": "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
  "method": "GET",
  "headers": {
    "Accept": "application/json"
  },
  "timeout": 30000
}
```

#### Trading Operations (require API keys)
```
POST /api/exchange/fetchBalance
{
  "config": {
    "exchangeId": "binance",
    "apiKey": "your-api-key",
    "secret": "your-secret",
    "sandbox": true
  }
}
```

## Supported Operations

**REST API:**
- ✅ `fetchTicker` - get ticker data
- ✅ `fetchOrderBook` - get order book
- ✅ `fetchTrades` - get trades
- ✅ `fetchOHLCV` - get candlestick data
- ✅ `fetchBalance` - get balance (with API keys)

**WebSocket (CCXT Pro) - Real-time Streaming:**
- ✅ `watchTicker` - real-time ticker updates via WebSocket
- ✅ `watchOrderBook` - live order book updates via WebSocket
- ✅ `watchTrades` - live trade stream via WebSocket
- ✅ `watchOHLCV` - real-time candlestick updates via WebSocket
- ✅ `watchBalance` - live balance updates via WebSocket (with API keys)

**CORS Proxy:**
- ✅ Universal HTTP proxy for any exchange requests

## Server Provider Benefits

1. **🎯 CORS Bypass**: Main advantage - solving browser CORS issues
2. **Performance**: CCXT executes on server with Node.js, which is faster than browser
3. **Security**: API keys don't get transmitted to browser
4. **Scalability**: One server can serve multiple clients
5. **Caching**: Server caches CCXT instances and markets
6. **Flexibility**: Server can be run anywhere
7. **Universal Proxy**: Can proxy any HTTP requests to exchanges

## Caching

Server automatically caches:
- CCXT instances (TTL: 24 hours)
- Markets data (TTL: 1 hour)

Cache is automatically cleaned every 10 minutes.

## Поддерживаемые операции

**REST API:**
- ✅ `fetchTicker` - получение тикера
- ✅ `fetchOrderBook` - получение стакана
- ✅ `fetchTrades` - получение сделок
- ✅ `fetchOHLCV` - получение свечей
- ✅ `fetchBalance` - получение баланса (с API ключами)

**WebSocket (CCXT Pro):**
- ✅ `watchTicker` - подписка на тикер
- ✅ `watchOrderBook` - подписка на стакан
- ✅ `watchTrades` - подписка на сделки
- ✅ `watchOHLCV` - подписка на свечи
- ✅ `watchBalance` - подписка на баланс (с API ключами)

**CORS Proxy:**
- ✅ Универсальный HTTP прокси для любых запросов к биржам

## Limitations

1. **Simple Authentication**: Uses simple token (JWT needed for production)
2. **Error Handling**: Basic error handling

## Integration with Existing Code

Server Provider is fully compatible with existing architecture:

- Uses the same interfaces and types
- Works with the same provider system
- Supports automatic provider selection
- Integrates with fetchingActions and dataActions

## Deployment

### Local Deployment
```bash
npm run server
```

### Docker (example)
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "server"]
```

### Environment Variables
```bash
PORT=3001
API_TOKEN=your-secret-token
NODE_ENV=production
```

## Security

⚠️ **Important**: For production, make sure to:

1. Use HTTPS
2. Implement JWT authentication
3. Add rate limiting
4. Configure CORS properly
5. Use environment variables for secrets

## Monitoring

Server logs:
- Creation/usage of cached instances
- HTTP requests and errors
- Cache cleanup

For production, it's recommended to add:
- Structured logging (Winston, Pino)
- Metrics (Prometheus)
- Health checks
- Error tracking (Sentry)
