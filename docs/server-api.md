# Server API

## Overview

`@profitmaker/server` is an Express 5 + Socket.IO server that proxies CCXT operations. It runs on **port 3001** by default.

**Primary purpose:** Bypass browser CORS restrictions when calling exchange APIs.

## Starting the Server

```bash
# Production
bun server

# Development (auto-reload on changes)
bun server:dev
```

## Authentication

All endpoints except `/health` require a Bearer token.

```
Authorization: Bearer <token>
```

Default token: `your-secret-token` (set via `API_TOKEN` environment variable).

Socket.IO connections must authenticate via the `authenticate` event after connecting.

## REST Endpoints

All exchange endpoints accept POST with JSON body.

### Health Check

```
GET /health
```

No authentication required.

**Response:**
```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

### Create/Get Exchange Instance

```
POST /api/exchange/instance
```

Creates or retrieves a cached CCXT instance. Call this to verify connectivity.

**Body:**
```json
{
  "exchangeId": "binance",
  "marketType": "spot",          // "spot" | "futures"
  "ccxtType": "regular",         // "regular" | "pro"
  "apiKey": "optional",
  "secret": "optional",
  "password": "optional",
  "sandbox": false
}
```

**Response:**
```json
{
  "success": true,
  "exchangeId": "binance",
  "marketType": "spot",
  "ccxtType": "regular",
  "sandbox": false,
  "hasCredentials": false
}
```

### Fetch Ticker

```
POST /api/exchange/fetchTicker
```

**Body:**
```json
{
  "config": { "exchangeId": "binance", "marketType": "spot", "ccxtType": "regular" },
  "symbol": "BTC/USDT"
}
```

### Fetch Order Book

```
POST /api/exchange/fetchOrderBook
```

**Body:**
```json
{
  "config": { "exchangeId": "binance", "marketType": "spot", "ccxtType": "regular" },
  "symbol": "BTC/USDT",
  "limit": 20
}
```

### Fetch Trades

```
POST /api/exchange/fetchTrades
```

**Body:**
```json
{
  "config": { "exchangeId": "binance", "marketType": "spot", "ccxtType": "regular" },
  "symbol": "BTC/USDT",
  "limit": 50
}
```

### Fetch OHLCV

```
POST /api/exchange/fetchOHLCV
```

**Body:**
```json
{
  "config": { "exchangeId": "binance", "marketType": "spot", "ccxtType": "regular" },
  "symbol": "BTC/USDT",
  "timeframe": "1h",
  "limit": 100
}
```

### Fetch Balance (requires credentials)

```
POST /api/exchange/fetchBalance
```

**Body:**
```json
{
  "config": {
    "exchangeId": "binance",
    "marketType": "spot",
    "ccxtType": "regular",
    "apiKey": "your-api-key",
    "secret": "your-secret"
  }
}
```

### Get Exchange Capabilities

```
POST /api/exchange/capabilities
```

Returns supported methods, markets, symbols, timeframes, and fees for an exchange.

**Body:**
```json
{
  "config": { "exchangeId": "binance", "marketType": "spot", "ccxtType": "regular" }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "has": { "fetchTicker": true, "watchTicker": true, ... },
    "markets": ["BTC/USDT", "ETH/USDT", ...],
    "symbols": ["BTC/USDT", "ETH/USDT", ...],
    "timeframes": { "1m": "1m", "5m": "5m", "1h": "1h", ... },
    "fees": { ... }
  }
}
```

### WebSocket Watch Endpoints (CCXT Pro)

These endpoints require `ccxtType: "pro"` in the config. They make a single WebSocket read and return the result. For continuous streaming, use Socket.IO instead.

| Endpoint | Method |
|----------|--------|
| `POST /api/exchange/watchTicker` | `watchTicker(symbol)` |
| `POST /api/exchange/watchOrderBook` | `watchOrderBook(symbol, limit)` |
| `POST /api/exchange/watchTrades` | `watchTrades(symbol)` |
| `POST /api/exchange/watchOHLCV` | `watchOHLCV(symbol, timeframe)` |
| `POST /api/exchange/watchBalance` | `watchBalance()` (requires credentials) |

### CORS Proxy

```
POST /api/proxy/request
```

Generic HTTP proxy for bypassing CORS on any URL.

**Body:**
```json
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {},
  "body": null,
  "timeout": 30000
}
```

## Socket.IO Events

### Client -> Server

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | `{ token: string }` | Authenticate the connection |
| `subscribe` | `{ exchangeId, symbol, dataType, timeframe?, config }` | Start a WebSocket subscription |
| `unsubscribe` | `{ subscriptionId }` | Stop a subscription |

### Server -> Client

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticated` | `{ success: true }` | Authentication successful |
| `auth_error` | `{ error: string }` | Authentication failed (disconnects) |
| `subscribed` | `{ subscriptionId, exchangeId, symbol, dataType, timeframe }` | Subscription started |
| `subscription_error` | `{ error: string }` | Subscription failed |
| `data` | `{ subscriptionId, dataType, exchange, symbol, timeframe?, data, timestamp }` | Market data update |
| `error` | `{ subscriptionId, error: string }` | Stream error (auto-retries after 5s) |
| `unsubscribed` | `{ subscriptionId }` | Subscription stopped |

### Subscription Data Types

| dataType | CCXT Pro Method | Description |
|----------|----------------|-------------|
| `ticker` | `watchTicker` | Real-time ticker |
| `trades` | `watchTrades` | Live trade feed |
| `orderbook` | `watchOrderBook` | Order book updates |
| `ohlcv` | `watchOHLCV` | Candle updates (requires timeframe) |
| `balance` | `watchBalance` | Account balance updates (requires credentials) |

### Example: Socket.IO Client Usage

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Authenticate
socket.emit('authenticate', { token: 'your-secret-token' });

socket.on('authenticated', () => {
  // Subscribe to BTC/USDT ticker on Binance
  socket.emit('subscribe', {
    exchangeId: 'binance',
    symbol: 'BTC/USDT',
    dataType: 'ticker',
    config: {
      exchangeId: 'binance',
      marketType: 'spot',
      ccxtType: 'pro'
    }
  });
});

socket.on('data', (msg) => {
  console.log(`${msg.dataType} update:`, msg.data);
});

socket.on('error', (msg) => {
  console.error(`Stream error:`, msg.error);
});
```

## Instance Caching

The server caches CCXT instances to avoid recreating them on every request.

- **Cache key:** `{exchangeId}:{marketType}:{ccxtType}:{sandbox|live}:{apiKeyPrefix}`
- **TTL:** 24 hours
- **Cleanup:** Every 10 minutes, expired instances are removed
- **Markets:** Loaded on first instance creation (`loadMarkets()`)

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": "Human-readable error message",
  "details": "Technical error details from CCXT or Node"
}
```

HTTP status codes:
- `400` -- Bad request (missing params, wrong ccxtType)
- `401` -- No token provided
- `403` -- Invalid token
- `408` -- Proxy request timeout
- `500` -- Server/CCXT error
