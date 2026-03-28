![Profitmaker Story](public/images/generated/comic-strip-profitmaker.png)

# Profitmaker v3 -- Open Source Crypto Trading Terminal

[![License](https://img.shields.io/badge/license-MIT%20with%20Commons%20Clause-blue.svg)](./LICENSE)
[![Discord](https://img.shields.io/discord/430374279343898624.svg?color=4D64BA&label=discord)](https://discord.gg/2PtuMAg)

Modular, widget-based trading terminal with support for **100+ crypto exchanges** via [CCXT](https://github.com/ccxt/ccxt). API keys never leave your machine -- everything is encrypted locally with AES-256-GCM.

**[Live Demo](https://v3-demo.profitmaker.cc/)** | **[Docs](https://www.profitmaker.cc/docs/)** | **[Discord](https://discord.gg/2PtuMAg)** | **[Telegram](https://t.me/suenot)**

---

## API-First Architecture

Profitmaker is an **API-managed project**. All functionality is exposed through a REST/WebSocket API on the backend. This design enables:

- **LLM Integration** -- AI agents (Claude Code, etc.) can manage the entire platform via API: create dashboards, place orders, manage providers, subscribe to market data
- **Headless Mode** -- run the backend without the browser UI for automated trading, data collection, or bot integration
- **Multi-Client** -- the same API serves the React frontend, CLI tools, mobile apps, or third-party integrations
- **Testability** -- every feature is testable via API without rendering a browser

The backend is built with **Bun + Elysia** (the fastest Bun-native HTTP framework) and **Socket.IO** for real-time WebSocket streaming.

```bash
# Get BTC price from Binance in one line
curl -s -X POST http://localhost:3001/api/exchange/fetchTicker \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"config":{"exchangeId":"binance","marketType":"spot","ccxtType":"regular"},"symbol":"BTC/USDT"}'
```

See [docs/server-api.md](docs/server-api.md) for the full API reference.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18, TypeScript |
| Build | Vite 5 + SWC |
| Components | shadcn/ui (Radix UI + Tailwind CSS) |
| State | Zustand 5 + Immer (12 stores, persisted to localStorage) |
| Data Fetching | TanStack React Query |
| Charts | Night Vision (OHLCV candlestick) + Recharts (pie, bar) |
| Exchange API | CCXT 4.4 (100+ exchanges, REST + WebSocket) |
| Backend | **Bun + Elysia** (HTTP API) + Socket.IO (WebSocket streaming) |
| Encryption | Web Crypto API -- AES-256-GCM with master password |
| Testing | Vitest + JSDOM |
| Monorepo | Bun workspaces (4 packages) |

## Features

### Widget System
- **Drag & drop** positioning with snap-to-grid and snap-to-widget alignment
- **Resize** from all 8 directions (edges + corners)
- **Maximize, minimize, collapse** -- collapsed widgets dock to bottom bar
- **Multiple dashboards** with tab navigation, create/duplicate/rename/delete
- **Right-click context menu** to add new widgets
- **Widget settings drawer** with per-widget configuration
- **Editable titles** -- double-click any widget header

### Trading Widgets

| Widget | Description |
|--------|-------------|
| **Chart** | OHLCV candlestick chart (Night Vision), 13 timeframes (1m--1M), theme-aware colors, infinite scroll for history |
| **Order Book** | Real-time bid/ask depth with cumulative volume, spread display, price level highlighting |
| **Trades** | Live trade feed with filtering and sorting, aggregated mode |
| **Order Form** | Market, limit, stop-loss, take-profit, trailing stop, iceberg orders. Validation against exchange constraints |
| **Portfolio** | Balance overview across all connected accounts |
| **User Balances** | Detailed balance view with pie chart breakdown by currency |
| **User Trading Data** | My trades, open orders, positions (futures) per account |
| **Deals** | Deal tracking with entry/exit analysis and statistics |
| **Transaction History** | Full transaction log with filtering |

### Data Provider System
- **CCXT Browser** -- direct exchange API calls from the browser (limited by CORS)
- **CCXT Server** -- proxied through Elysia backend, bypasses CORS, supports WebSocket via CCXT Pro
- **Pluggable architecture** -- provider priority system, automatic fallback from WebSocket to REST
- **Subscription deduplication** -- multiple widgets sharing the same data stream get a single connection
- **Market data types**: candles, trades, order book, ticker, balance
- **13 timeframes**: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d, 1w, 1M

### Groups (Instrument Linking)
Color-coded groups link widgets to the same instrument (exchange + market + pair + account). Change the pair in one widget -- all widgets in that group follow.

### Security
- **API keys encrypted** with AES-256-GCM using a user-set master password (Web Crypto API)
- **Keys never leave your machine** -- stored in browser localStorage, encrypted at rest
- **Bearer token auth** on the API server

### Other
- Dark / light theme with Tailwind CSS variables
- Notification system with history (success, error, warning, info)
- Exchange capabilities detection (spot, futures, margin, options, swap)

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) 1.0+

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API server port |
| `API_TOKEN` | `your-secret-token` | Bearer token for API authentication |

### Install & Run

```bash
# Clone
git clone https://github.com/suenot/profitmaker.git
cd profitmaker

# Install dependencies
bun install

# Start the frontend (port 8080)
bun dev

# Start the API server (port 3001)
bun server:dev
```

Open http://localhost:8080

### Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start Vite dev server (port 8080) |
| `bun run build` | Production build |
| `bun server` | Start Elysia API server (port 3001) |
| `bun server:dev` | Start API server with auto-reload |
| `bun test` | Run tests (Vitest) |
| `bun lint` | ESLint check |

## Architecture

### Monorepo Structure

```
profitmaker/
├── packages/
│   ├── client/             # @profitmaker/client -- React frontend (Vite + SWC)
│   │   └── src/
│   │       ├── components/widgets/  # 20+ trading widgets
│   │       ├── store/
│   │       │   ├── actions/
│   │       │   │   ├── data/        # Settings, getters, updaters, initializers, user trading
│   │       │   │   ├── fetching/    # WebSocket + REST data fetching
│   │       │   │   └── provider/    # CRUD + query provider management
│   │       │   ├── providers/       # CCXT Browser & Server implementations
│   │       │   └── utils/           # Instance manager, account manager
│   │       ├── types/               # TypeScript interfaces
│   │       └── hooks/               # Custom React hooks
│   ├── server/             # @profitmaker/server -- Elysia API server
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── health.ts        # Health check
│   │       │   ├── exchange.ts      # Market data REST endpoints
│   │       │   ├── websocket.ts     # CCXT Pro watch endpoints
│   │       │   └── proxy.ts         # CORS proxy
│   │       ├── services/
│   │       │   ├── ccxtCache.ts     # CCXT instance cache (24h TTL)
│   │       │   └── wsSubscriptions.ts # WebSocket subscription manager
│   │       ├── middleware/
│   │       │   └── auth.ts          # Bearer token authentication
│   │       └── index.ts             # Server entry point
│   ├── types/              # @profitmaker/types -- shared TypeScript types + Zod schemas
│   └── core/               # @profitmaker/core -- shared utilities (encryption, formatters, CCXT)
├── package.json            # Bun workspace root
└── vite.config.ts          # Frontend build config
```

### Data Flow

```
Exchange API
    │
    ├─── CCXT Browser Provider ──┐
    │    (direct, limited CORS)  │
    │                            ├──> dataProviderStore ──> Widget Components
    └─── CCXT Server Provider ───┘         │
         (Elysia API + Socket.IO)          │
                                     Zustand stores
                                     (candles, trades,
                                      orderbook, ticker,
                                      balance)
```

### API Server (port 3001)

REST endpoints (POST, Bearer token auth):

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (no auth) |
| `/api/exchange/instance` | Create/get cached CCXT instance |
| `/api/exchange/fetchTicker` | Fetch ticker data |
| `/api/exchange/fetchOrderBook` | Fetch order book |
| `/api/exchange/fetchTrades` | Fetch recent trades |
| `/api/exchange/fetchOHLCV` | Fetch candlestick data |
| `/api/exchange/fetchBalance` | Fetch account balance (requires API keys) |
| `/api/exchange/capabilities` | Get exchange capabilities |
| `/api/exchange/watch*` | WebSocket watch endpoints (CCXT Pro) |
| `/api/proxy/request` | Generic HTTP proxy for CORS bypass |

Socket.IO events: `subscribe`, `unsubscribe`, `data`, `error`

## Supported Exchanges

100+ exchanges via CCXT including: Binance, Bybit, OKX, Coinbase, Kraken, Bitfinex, Gate.io, KuCoin, MEXC, Huobi, Bitget, and many more.

## Related Projects

- **[profitmaker.cc](https://profitmaker.cc/)** -- open source crypto terminal + modular server for custom metrics
- **[marketmaker.cc](https://marketmaker.cc/)** -- commercial trading platform with profitmaker integration

## Team

- **Eugen Soloviov** -- maintainer -- [GitHub](https://github.com/suenot) | [Telegram](https://t.me/suenot)

## License

MIT License with Commons Clause.

**Allowed**: use for any purpose, modify, distribute, create products built with Profitmaker.

**Not allowed**: sell Profitmaker itself, offer it as a hosted service, create competing products based on it.

See [LICENSE](./LICENSE) for full text. For commercial licensing -- [Telegram](https://t.me/suenot) or [email](mailto:suenot@gmail.com).

---

[![MarketMaker.cc](public/images/generated/banner-marketmaker.png)](https://marketmaker.cc/)

**[MarketMaker.cc](https://marketmaker.cc/)** -- commercial trading platform with AI-powered analytics, automated bots, and Profitmaker integration.
