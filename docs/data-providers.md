# Data Providers

## Overview

Profitmaker supports multiple data providers that fetch market data from exchanges. The provider system abstracts away the difference between running CCXT in the browser vs. on a server.

## Provider Types

| Type | Class | Location | Description |
|------|-------|----------|-------------|
| `ccxt-browser` | `CCXTBrowserProviderImpl` | `packages/core/src/ccxtBrowserProvider.ts` | CCXT runs directly in the browser |
| `ccxt-server` | `CCXTServerProviderImpl` | `packages/core/src/ccxtServerProvider.ts` | CCXT runs on Express server, browser sends HTTP requests |
| `marketmaker.cc` | -- | Planned | External data provider |
| `custom-server-with-adapter` | -- | Planned | Custom server with adapter interface |

## Browser Provider (default)

The browser provider is created automatically on first load:

```typescript
{
  id: 'universal-browser',
  type: 'ccxt-browser',
  name: 'Universal Browser Provider',
  status: 'connected',
  exchanges: ['*'],    // supports all exchanges
  priority: 100,       // low priority (fallback)
  config: { sandbox: false }
}
```

**How it works:**
1. CCXT library loads in the browser
2. Exchange instances are created and cached in `ccxtInstanceManager`
3. REST calls go directly from browser to exchange API
4. WebSocket connections (CCXT Pro) also run in browser

**Limitations:**
- Some exchanges block browser requests (CORS)
- Browser has limited connection capacity
- API keys are used in browser memory (encrypted at rest in localStorage)

## Server Provider

The server provider routes all CCXT operations through the Express server, bypassing CORS restrictions.

**Setup:**

1. Start the server: `bun server:dev`
2. Add a server provider in the UI (Data Provider Settings widget) or programmatically:

```typescript
const provider = dataProviderStore.getState().createProvider(
  'ccxt-server',
  'My Server Provider',
  ['binance', 'bybit'],  // or ['*'] for all
  {
    serverUrl: 'http://localhost:3001',
    apiToken: 'your-secret-token'
  }
);
```

**How it works:**
1. Browser sends HTTP POST to `http://localhost:3001/api/exchange/<method>`
2. Server creates/reuses a CCXT instance
3. Server calls the exchange API (no CORS issues)
4. Server returns the response to the browser

**Advantages:**
- No CORS problems
- Server can run CCXT Pro for WebSocket streaming
- API keys can stay on the server (not in browser)
- Server can be deployed separately

## Provider Selection

When a widget subscribes to data, the store picks the best provider:

1. Find all providers that support the requested exchange
2. Sort by priority (lower number = higher priority)
3. Use the first enabled provider

You can control this by:
- Setting provider priority: `updateProviderPriority(providerId, priority)`
- Enabling/disabling providers: `toggleProvider(providerId)`
- Restricting exchanges per provider: set `exchanges` array

## Data Types

| DataType | REST Method | WebSocket Method | Description |
|----------|------------|------------------|-------------|
| `candles` | `fetchOHLCV` | `watchOHLCV` | OHLCV candlestick data |
| `trades` | `fetchTrades` | `watchTrades` | Recent trades feed |
| `orderbook` | `fetchOrderBook` | `watchOrderBook` | Order book depth |
| `ticker` | `fetchTicker` | `watchTicker` | 24h ticker summary |
| `balance` | `fetchBalance` | `watchBalance` | Account balances (requires API key) |

## WebSocket vs REST

The `dataFetchSettings.method` controls the default strategy:

### WebSocket mode (`'websocket'`)

- Real-time streaming via CCXT Pro
- Lower latency, more efficient
- Requires CCXT Pro support on the exchange
- Falls back to REST if WebSocket unavailable

### REST mode (`'rest'`)

- Polling at configurable intervals
- Works with all exchanges
- Default intervals (configurable per data type):

```typescript
restIntervals: {
  trades: 1000,     // 1 second
  candles: 5000,    // 5 seconds
  orderbook: 500,   // 0.5 seconds
  balance: 30000,   // 30 seconds
  ticker: 600000    // 10 minutes
}
```

### Fallback

If WebSocket is selected but the exchange doesn't support it for a given data type, the system automatically falls back to REST polling.

## Subscription System

Subscriptions are deduplicated by key: `{exchange}:{market}:{symbol}:{dataType}:{timeframe}`

```typescript
// Widget subscribes
await subscribe(
  'chart-widget-abc',    // subscriberId (unique per widget instance)
  'binance',             // exchange
  'BTC/USDT',           // symbol
  'candles',            // dataType
  '1h',                 // timeframe (for candles)
  'spot'                // market type
);

// Widget unsubscribes on unmount
unsubscribe('chart-widget-abc', 'binance', 'BTC/USDT', 'candles', '1h', 'spot');
```

Multiple widgets subscribing to the same key share one data stream. The stream is closed only when the last subscriber unsubscribes.

## Data Initialization

Widgets typically need initial data before streaming begins. Use the `initialize*` methods:

```typescript
// Fetch initial candles for a chart
const candles = await initializeChartData('binance', 'BTC/USDT', '1h', 'spot');

// Fetch initial trades
const trades = await initializeTradesData('binance', 'BTC/USDT', 'spot', 50);

// Fetch initial orderbook
const orderbook = await initializeOrderBookData('binance', 'BTC/USDT', 'spot');

// Load more historical candles (infinite scroll)
const older = await loadHistoricalCandles('binance', 'BTC/USDT', '1h', 'spot', beforeTimestamp);
```

## Chart Update Events

The store includes an event system specifically for Chart widgets. When new candles arrive via WebSocket, the store emits events that Night Vision chart instances can listen to:

```typescript
// Register listener
addChartUpdateListener('binance', 'BTC/USDT', '1h', 'spot', listener);

// Remove listener
removeChartUpdateListener('binance', 'BTC/USDT', '1h', 'spot', listener);
```

## CCXT Instance Management

Exchange instances are cached in `packages/core/src/ccxtInstanceManager.ts`:

- Instances are keyed by: `{exchangeId}:{marketType}:{ccxtType}:{sandbox}:{apiKeyPrefix}`
- Server-side cache TTL: 24 hours, cleanup every 10 minutes
- Browser-side: instances persist for the page session
- Markets are loaded on first instance creation (`exchange.loadMarkets()`)

## Intelligent Method Selection

For order book fetching, the store includes `selectOptimalOrderBookMethod()` which checks exchange capabilities and selects the best available method (some exchanges support `fetchOrderBook` but not `watchOrderBook`, or have different depth limits).

## Supported Exchanges

CCXT v4.4 supports 100+ exchanges. Common ones:

binance, bybit, okx, bitget, kucoin, gate, mexc, huobi, kraken, coinbase, bitfinex, bitmex, phemex, deribit, and many more.

Use `getAllSupportedExchanges()` to get the full list from the current CCXT version.
