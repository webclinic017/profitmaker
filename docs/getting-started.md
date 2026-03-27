# Getting Started

## Prerequisites

- **Bun** 1.0+ -- runtime and package manager ([bun.sh](https://bun.sh))
- **Node.js** 18+ -- some dependencies still require it
- **Git**

## Install

```bash
git clone https://github.com/nickolaylavrinenko/profitmaker.git
cd profitmaker
bun install
```

`bun install` resolves all workspace dependencies across the four packages.

## Project Structure

```
profitmaker/
├── packages/
│   ├── types/    # @profitmaker/types -- shared TypeScript types + Zod schemas
│   ├── core/     # @profitmaker/core  -- CCXT wrappers, providers, encryption, formatters
│   ├── server/   # @profitmaker/server -- Express 5 + Socket.IO backend
│   └── client/   # @profitmaker/client -- React + Vite frontend
├── src/          # Client source (legacy location, used by Vite via client package)
├── package.json  # Root workspace config
└── docs/         # This documentation
```

## Development

### Start the client (Vite dev server)

```bash
bun dev
```

Opens at **http://localhost:8080**. Hot module replacement enabled.

### Start the server (optional, for CORS bypass)

```bash
bun server:dev
```

Runs Express + Socket.IO on **http://localhost:3001** with file watching.

The server is optional -- the client can use CCXT directly in the browser. The server is needed when exchanges block browser requests (CORS) or for WebSocket streaming via CCXT Pro.

### Both together

Open two terminals:

```bash
# Terminal 1
bun dev

# Terminal 2
bun server:dev
```

## Build

```bash
bun run build
```

Produces a production Vite build for the client.

## Testing

```bash
# Run all tests (Vitest for client, bun:test for core)
bun test

# Run specific test file
bun test packages/core/src/__tests__/ccxt-bun.test.ts
```

## Linting

```bash
bun lint
```

Runs ESLint on the client package.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `API_TOKEN` | `your-secret-token` | Bearer token for server API authentication |

No `.env` file is required for basic development. The client uses browser-side CCXT by default.

## First Run Checklist

1. `bun install`
2. `bun dev` -- open http://localhost:8080
3. You'll see the default dashboard with Chart, Portfolio, Order Form, and Transaction History widgets
4. Right-click the canvas to add more widgets
5. (Optional) Set up a master password to encrypt API keys -- see [Security](security.md)
6. (Optional) Add exchange accounts in the user drawer to trade with real data
