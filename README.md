```
 ____            __ _ _                   _
|  _ \ _ __ ___ / _(_) |_ _ __ ___   __ _| | _____ _ __ ___ ___
| |_) | '__/ _ \ |_| | __| '_ ` _ \ / _` | |/ / _ \ '__/ __/ __|
|  __/| | | (_) |  _| | |_| | | | | | (_| |   <  __/ | | (_| (__
|_|   |_|  \___/|_| |_|\__|_| |_| |_|\__,_|_|\_\___|_|(_)___\___|
```

# Profitmaker v3 -- Open Source Crypto Trading Terminal

[![License](https://img.shields.io/badge/license-MIT%20with%20Commons%20Clause-blue.svg)](./LICENSE)
[![Discord](https://img.shields.io/discord/430374279343898624.svg?color=4D64BA&label=discord)](https://discord.gg/2PtuMAg)

Modular, widget-based trading terminal with support for **100+ crypto exchanges** via [CCXT](https://github.com/ccxt/ccxt). API keys never leave your machine -- everything is encrypted locally with AES-256-GCM.

**[Live Demo](http://v3-demo.profitmaker.cc/)** | **[Discord](https://discord.gg/2PtuMAg)** | **[Telegram](https://t.me/suenot)**

---

## The Story

![Profitmaker Story](public/images/generated/comic-strip-profitmaker.png)

---

## Overview

Profitmaker is a browser-based trading workspace where you compose your own dashboards from draggable, resizable widgets -- charts, order books, trade feeds, order forms, portfolio views, and more. Data flows in real-time via WebSocket (CCXT Pro) with REST fallback.

The app runs entirely in your browser. An optional Express server proxies exchange APIs to bypass CORS and enables server-side WebSocket subscriptions via Socket.IO.

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
| Backend | Express 5 + Socket.IO (optional CORS proxy) |
| Encryption | Web Crypto API -- AES-256-GCM with master password |
| Testing | Vitest + JSDOM |

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
| **Transaction History** | Full transaction log |

### Data Provider System
- **CCXT Browser** -- direct exchange API calls from the browser (limited by CORS)
- **CCXT Server** -- proxied through Express backend, bypasses CORS, supports WebSocket via CCXT Pro
- **Pluggable architecture** -- provider priority system, automatic fallback from WebSocket to REST
- **Subscription deduplication** -- multiple widgets sharing the same data stream get a single connection
- **Market data types**: candles, trades, order book, ticker, balance
- **13 timeframes**: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d, 1w, 1M

### Groups (Instrument Linking)
Color-coded groups link widgets to the same instrument (exchange + market + pair + account). Change the pair in one widget -- all widgets in that group follow. The transparent group acts as the global default.

### Security
- **API keys encrypted** with AES-256-GCM using a user-set master password (Web Crypto API)
- **Keys never leave your machine** -- stored in browser localStorage, encrypted at rest
- **Master password lock/unlock** -- lock the terminal when stepping away
- **Credential tiers** -- safe (read-only), notSafe (trading), danger (withdrawal)
- **Bearer token auth** on the Express server

### Other
- Dark / light theme with Tailwind CSS variables
- Cookie consent notification
- Notification system with history (success, error, warning, info)
- Exchange capabilities detection (spot, futures, margin, options, swap)
- Request logging for debugging

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) 1.0+ (recommended) or Node.js 20+

### Install & Run

```bash
# Clone
git clone https://github.com/suenot/profitmaker.git
cd profitmaker

# Install dependencies
bun install

# Start the frontend (port 8080)
bun dev

# (Optional) Start the Express server for CORS proxy + WebSocket (port 3001)
bun server:dev
```

Open http://localhost:8080

### Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start Vite dev server (port 8080) |
| `bun run build` | Production build |
| `bun preview` | Preview production build |
| `bun server` | Start Express server (port 3001) |
| `bun server:dev` | Start Express server with auto-reload |
| `bun test` | Run tests (Vitest) |
| `bun test:ui` | Run tests with UI |
| `bun lint` | ESLint check |

## Architecture

```
src/
├── pages/                  # Route pages (Index -> TradingTerminal, NotFound)
├── components/
│   ├── widgets/            # 20+ trading widgets (Chart, OrderBook, Trades, OrderForm, ...)
│   ├── ui/                 # shadcn/ui components + InstrumentSelector, TimeframeSelect, GroupSelector
│   ├── WidgetSimple.tsx    # Base widget container (drag, resize, snap, collapse, maximize)
│   ├── WidgetMenu.tsx      # Right-click context menu for adding widgets
│   └── TabNavigation.tsx   # Dashboard tabs + user/theme/notification controls
├── store/
│   ├── dashboardStore.ts   # Dashboards & widgets layout (Zustand + Immer + persist)
│   ├── dataProviderStore.ts # Market data subscriptions & centralized data cache
│   ├── userStore.ts        # Users & encrypted exchange accounts
│   ├── groupStore.ts       # Color-coded instrument linking groups
│   ├── placeOrderStore.ts  # Order form state & validation
│   ├── notificationStore.ts # Notification system with history
│   ├── actions/            # Store action modules (ccxt, data, subscriptions, fetching, events)
│   ├── providers/          # CCXT Browser & Server provider implementations
│   └── utils/              # CCXT instance manager, account manager, WebSocket utils
├── types/                  # TypeScript types (orders, candles, dashboard, deals, groups)
├── services/               # Order execution & validation service
├── hooks/                  # Custom hooks (useTheme, useWidgetDrag, useDataProvider, ...)
├── utils/                  # Encryption (AES-256-GCM), formatters, exchange limits
└── context/                # Widget context for inter-widget communication
```

### Data Flow

```
Exchange API
    │
    ├─── CCXT Browser Provider ──┐
    │    (direct, limited CORS)  │
    │                            ├──> dataProviderStore ──> Widget Components
    └─── CCXT Server Provider ───┘         │
         (Express proxy + Socket.IO)       │
                                     ┌─────┘
                                     │
                                  Zustand stores
                                  (candles, trades,
                                   orderbook, ticker,
                                   balance)
```

### Express Server API (port 3001)

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

Full list: [CCXT Supported Exchanges](https://github.com/ccxt/ccxt#supported-cryptocurrency-exchange-markets)

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
