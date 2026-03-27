# Profitmaker v3 Documentation

Crypto trading terminal supporting 100+ exchanges via CCXT. Built with React, Express, and Bun.

## Table of Contents

| Document | Description |
|----------|-------------|
| [Getting Started](getting-started.md) | Install, setup, first run |
| [Architecture](architecture.md) | Workspace structure, data flow, tech stack |
| [Widgets](widgets.md) | All widget types, creating new widgets |
| [State Management](state-management.md) | Zustand stores, patterns, persistence |
| [Data Providers](data-providers.md) | CCXT integration, browser vs server provider, WebSocket vs REST |
| [Server API](server-api.md) | Express endpoints, Socket.IO events |
| [Security](security.md) | API key encryption, master password, credential tiers |
| [Theming](theming.md) | Dark/light mode, CSS variables, terminal palette |

## Quick Links

- **Source code**: `packages/` directory (types, core, server, client)
- **Dev commands**: `bun dev` (client :8080), `bun server:dev` (server :3001)
- **Tech stack**: Bun + React 18 + Vite + Zustand + Express 5 + Socket.IO + CCXT
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
