# Contributing to Profitmaker

Thanks for your interest in contributing! Profitmaker is an open source crypto trading terminal.

## Getting Started

```bash
# Fork and clone
git clone https://github.com/<your-username>/profitmaker.git
cd profitmaker

# Install dependencies (Bun required)
bun install

# Start development
bun dev          # Client on port 8080
bun server:dev   # Server on port 3001 (optional)
```

## Project Structure

```
packages/
├── types/    # @profitmaker/types -- shared TypeScript types
├── core/     # @profitmaker/core -- CCXT wrappers, encryption, formatters
├── server/   # @profitmaker/server -- Express + Socket.IO backend
└── client/   # @profitmaker/client -- React + Vite frontend (widgets, stores, UI)
```

## Pull Request Process

1. Create a feature branch from `master`
2. Make your changes
3. Run tests: `bun test`
4. Run lint: `bun lint`
5. Ensure production build works: `bun run build`
6. Open a PR with a clear description of what changed and why

## Code Style

See [CRUSH.md](./CRUSH.md) for detailed coding guidelines. Key points:

- TypeScript for all files
- shadcn/ui for UI components
- Zustand for state management
- Use selectors: `useStore(s => s.field)` not `useStore()`
- Virtual scroll for lists >50 items

## Adding a Widget

1. Create component in `packages/client/src/components/widgets/YourWidget.tsx`
2. Register in `packages/client/src/pages/TradingTerminal.tsx` (widgetComponents map)
3. Add widget type to `packages/types/src/dashboard.ts` (WidgetSchema type enum)
4. Add to widget menu in `packages/client/src/components/WidgetMenu.tsx`

## Reporting Issues

- **Bugs**: open a GitHub issue with steps to reproduce
- **Security vulnerabilities**: email [suenot@gmail.com](mailto:suenot@gmail.com) directly

## License

By contributing, you agree that your contributions will be licensed under the MIT License with Commons Clause.
