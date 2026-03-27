# Widgets

## Overview

Widgets are the building blocks of the trading terminal. Each dashboard contains a collection of widgets that can be freely positioned, resized, minimized, and grouped.

## Widget Types

All widget types are defined in `src/types/dashboard.ts` as a Zod enum:

| Type | Component | Description |
|------|-----------|-------------|
| `chart` | `Chart.tsx` | OHLCV candlestick chart (Night Vision library) |
| `portfolio` | `Portfolio.tsx` | Account portfolio overview |
| `userBalances` | `UserBalancesWidget.tsx` | Exchange balances with pie chart (Recharts) |
| `userTradingData` | `UserTradingDataWidget.tsx` | Tabs: orders, trades, positions |
| `orderForm` | `OrderForm.tsx` | Place buy/sell orders |
| `transactionHistory` | `TransactionHistory.tsx` | Recent transaction log |
| `orderbook` | `OrderBookWidget.tsx` | Live order book (bid/ask depth) |
| `trades` | `TradesWidget.tsx` | Live trade feed |
| `deals` | `DealsWidget.tsx` | Aggregated deals/positions tracking |
| `dataProviderSettings` | `DataProviderSettingsWidget.tsx` | Configure data providers |
| `dataProviderSetup` | `DataProviderSetupWidget.tsx` | Initial provider setup wizard |
| `dataProviderDebug` | `DataProviderDebugWidget.tsx` | Debug provider state |
| `dataProviderDemo` | `DataProviderDemoWidget.tsx` | Demo of provider capabilities |
| `exchanges` | `ExchangesWidget.tsx` | Exchange browser/selector |
| `markets` | `MarketsWidget.tsx` | Market type selector (spot/futures) |
| `pairs` | `PairsWidget.tsx` | Trading pair browser |
| `notificationTest` | `NotificationTestWidget.tsx` | Test notification system |
| `debugUserData` | `DebugUserData.tsx` | Debug user store |
| `debugCCXTCache` | `DebugCCXTCache.tsx` | Debug CCXT instance cache |
| `debugBingX` | `DebugBingXWidget.tsx` | Debug BingX exchange API |

## Widget Container: WidgetSimple

Every widget is wrapped in `WidgetSimple` (`src/components/WidgetSimple.tsx`), which provides:

- **Drag** -- click and drag the title bar
- **Resize** -- 8 resize handles (edges + corners)
- **Minimize** -- collapses to a small bar at the bottom
- **Maximize** -- fills the viewport, restores on second click
- **Title editing** -- double-click the title to rename
- **Close** -- removes the widget from the dashboard
- **Settings** -- gear icon, opens widget-specific settings panel
- **Group selector** -- colored circle showing the widget's group
- **Z-index** -- click brings widget to front

### Props

```typescript
interface WidgetSimpleProps {
  id: string;
  title: string;
  defaultTitle: string;
  userTitle?: string;
  children: ReactNode;          // The actual widget content
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isActive: boolean;
  groupId?: string;
  widgetType: string;
  showGroupSelector?: boolean;
  headerActions?: ReactNode;    // Extra buttons in the title bar
  onRemove: () => void;
}
```

## Widget Grouping

Widgets can be assigned to groups via the `groupStore`. A group shares context (exchange, market, trading pair, account) across all its widgets. This means selecting "BTC/USDT on Binance" in one group member automatically updates all others.

Groups are identified by a color indicator on each widget's title bar.

## How to Create a New Widget

### 1. Add the widget type

In `src/types/dashboard.ts`, add your type to the `WidgetSchema` type enum:

```typescript
type: z.enum([
  'chart', 'portfolio', /* ... existing types ... */,
  'myNewWidget'  // <-- add here
]),
```

### 2. Create the component

Create `src/components/widgets/MyNewWidget.tsx`:

```typescript
import React from 'react';

const MyNewWidget: React.FC = () => {
  return (
    <div className="p-4 h-full overflow-auto">
      <h3 className="text-sm font-medium text-terminal-text">My Widget</h3>
      {/* Widget content */}
    </div>
  );
};

export default MyNewWidget;
```

### 3. Export from the widget index

In `src/components/widgets/index.ts`:

```typescript
export { default as MyNewWidget } from './MyNewWidget';
```

### 4. Register in TradingTerminal

In `src/pages/TradingTerminal.tsx`, add to the `widgetComponents` map:

```typescript
import MyNewWidget from '@/components/widgets/MyNewWidget';

const widgetComponents: Record<string, React.FC<any>> = {
  // ... existing entries
  myNewWidget: MyNewWidget,
};
```

### 5. Add to widget menu (optional)

Add an entry in the widget menu/right-click context menu so users can add your widget to their dashboard.

### 6. Use market data (optional)

If your widget needs market data, use the data provider store:

```typescript
import { useDataProviderStore } from '@/store/dataProviderStore';

const MyNewWidget: React.FC = () => {
  const subscribe = useDataProviderStore(s => s.subscribe);
  const unsubscribe = useDataProviderStore(s => s.unsubscribe);
  const getTrades = useDataProviderStore(s => s.getTrades);

  useEffect(() => {
    const widgetId = 'my-widget-123';
    subscribe(widgetId, 'binance', 'BTC/USDT', 'trades', undefined, 'spot');

    return () => {
      unsubscribe(widgetId, 'binance', 'BTC/USDT', 'trades', undefined, 'spot');
    };
  }, []);

  const trades = getTrades('binance', 'BTC/USDT', 'spot');
  // render trades...
};
```

## Widget-Specific Stores

Some complex widgets have their own dedicated Zustand stores:

| Store | File | Purpose |
|-------|------|---------|
| `chartWidgetStore` | `store/chartWidgetStore.ts` | Chart settings per widget instance |
| `orderBookWidgetStore` | `store/orderBookWidgetStore.ts` | Order book display settings |
| `tradesWidgetStore` | `store/tradesWidgetStore.ts` | Trades feed settings |
| `userBalancesWidgetStore` | `store/userBalancesWidgetStore.ts` | Balance display preferences |
| `userTradingDataWidgetStore` | `store/userTradingDataWidgetStore.ts` | Trading data tab state |
| `placeOrderStore` | `store/placeOrderStore.ts` | Order form state |

## Performance Notes

- Widgets with large data sets (trades, orderbook) use **TanStack Virtual** for virtualized scrolling
- Pre-calculate row heights for the virtualizer to avoid layout thrashing
- Use Zustand selectors (`useStore(s => s.field)`) to avoid re-rendering on unrelated state changes
- Subscription deduplication ensures multiple widgets watching the same stream share a single connection
