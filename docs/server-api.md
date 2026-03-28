# Profitmaker API Reference

Profitmaker is an **API-first, API-managed** platform. All functionality is accessible via REST and WebSocket APIs, enabling LLM agents (Claude Code, etc.), CLI tools, bots, and custom integrations to control the platform programmatically.

## Design Principles

1. **Every feature has an API endpoint** -- if the UI can do it, the API can do it
2. **Stateless REST + stateful WebSocket** -- REST for commands, WebSocket for real-time streams
3. **LLM-friendly** -- consistent JSON request/response format, predictable error handling
4. **Bun + Elysia** -- the fastest Bun-native HTTP framework for minimal latency

## Server

- **HTTP API**: `http://localhost:3001` (Elysia)
- **WebSocket**: `http://localhost:3002` (Socket.IO)
- **Authentication**: Bearer token in `Authorization` header

```bash
# Start the server
bun server:dev

# Health check
curl http://localhost:3001/health
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP API port |
| `API_TOKEN` | `your-secret-token` | Bearer token for authentication |

```bash
API_TOKEN=my-secure-token PORT=4000 bun server:dev
```

## Authentication

All endpoints except `/health` require a Bearer token:

```bash
curl -X POST http://localhost:3001/api/exchange/fetchTicker \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"config": {"exchangeId": "binance", "marketType": "spot", "ccxtType": "regular"}, "symbol": "BTC/USDT"}'
```

## REST Endpoints

### Health Check

```
GET /health
```

No authentication required.

**Response:**
```json
{"status": "ok", "timestamp": "2026-03-27T12:00:00.000Z"}
```

### Exchange Instance

```
POST /api/exchange/instance
```

Create or retrieve a cached CCXT exchange instance. Instances are cached for 24 hours.

**Body:**
```json
{
  "exchangeId": "binance",
  "marketType": "spot",
  "ccxtType": "regular",
  "apiKey": "optional",
  "secret": "optional",
  "password": "optional",
  "sandbox": false
}
```

### Market Data

All market data endpoints accept the same `config` object plus data-specific parameters.

#### Fetch Ticker
```
POST /api/exchange/fetchTicker
Body: { "config": {...}, "symbol": "BTC/USDT" }
Response: { "success": true, "data": { "bid": 65000, "ask": 65001, ... } }
```

#### Fetch Order Book
```
POST /api/exchange/fetchOrderBook
Body: { "config": {...}, "symbol": "BTC/USDT", "limit": 25 }
Response: { "success": true, "data": { "bids": [...], "asks": [...] } }
```

#### Fetch Trades
```
POST /api/exchange/fetchTrades
Body: { "config": {...}, "symbol": "BTC/USDT", "limit": 100 }
Response: { "success": true, "data": [...] }
```

#### Fetch OHLCV (Candlestick)
```
POST /api/exchange/fetchOHLCV
Body: { "config": {...}, "symbol": "BTC/USDT", "timeframe": "1h", "limit": 500 }
Response: { "success": true, "data": [[timestamp, open, high, low, close, volume], ...] }
```

#### Fetch Balance (requires API keys)
```
POST /api/exchange/fetchBalance
Body: { "config": { "exchangeId": "binance", "apiKey": "...", "secret": "...", "ccxtType": "regular" } }
Response: { "success": true, "data": { "BTC": { "free": 0.5, "used": 0, "total": 0.5 }, ... } }
```

#### Exchange Capabilities
```
POST /api/exchange/capabilities
Body: { "config": {...} }
Response: { "success": true, "data": { "has": {...}, "markets": [...], "symbols": [...], "timeframes": {...} } }
```

### WebSocket Watch Endpoints (CCXT Pro)

These endpoints make a single WebSocket call and return the result. For continuous streaming, use the Socket.IO interface.

```
POST /api/exchange/watchTicker
POST /api/exchange/watchOrderBook
POST /api/exchange/watchTrades
POST /api/exchange/watchOHLCV
POST /api/exchange/watchBalance
```

All require `ccxtType: "pro"` in the config.

### CORS Proxy

```
POST /api/proxy/request
Body: {
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {},
  "body": null,
  "timeout": 30000
}
```

## WebSocket (Socket.IO)

Connect to `http://localhost:3002` for real-time streaming.

### Authentication

```javascript
const socket = io('http://localhost:3002');
socket.emit('authenticate', { token: 'your-secret-token' });
socket.on('authenticated', () => console.log('Connected'));
```

### Subscribe to Stream

```javascript
socket.emit('subscribe', {
  exchangeId: 'binance',
  symbol: 'BTC/USDT',
  dataType: 'trades',      // 'ticker' | 'trades' | 'orderbook' | 'ohlcv' | 'balance'
  timeframe: '1m',         // required for ohlcv
  config: {
    exchangeId: 'binance',
    marketType: 'spot',
    ccxtType: 'pro'
  }
});

socket.on('data', (msg) => {
  console.log(msg.dataType, msg.data);
});

socket.on('error', (msg) => {
  console.error(msg.error);
});
```

### Unsubscribe

```javascript
socket.emit('unsubscribe', { subscriptionId: 'socket-id:binance:BTC/USDT:trades' });
```

## Error Handling

All errors follow the same format:

```json
{
  "error": "Human-readable error message",
  "details": "Technical details from the underlying library"
}
```

HTTP status codes:
- `400` -- bad request (missing params, unsupported feature)
- `401` -- missing auth token
- `403` -- invalid auth token
- `408` -- request timeout (proxy)
- `500` -- server error

## LLM Integration Guide

This API is designed to be consumed by LLM agents. Here's how to use it:

1. **Start the server**: `bun server:dev`
2. **Authenticate**: include `Authorization: Bearer <token>` in all requests
3. **Discover capabilities**: call `/api/exchange/capabilities` to see what an exchange supports
4. **Fetch data**: use the appropriate endpoint for your data type
5. **Stream data**: connect via Socket.IO for real-time updates

Example workflow for a trading bot:
```
1. GET /health                          -- verify server is running
2. POST /api/exchange/capabilities      -- discover exchange features
3. POST /api/exchange/fetchTicker       -- get current price
4. POST /api/exchange/fetchOrderBook    -- analyze market depth
5. POST /api/exchange/fetchBalance      -- check available funds
6. Socket.IO subscribe to trades        -- monitor real-time trades
```
