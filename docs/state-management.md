# State Management

## Overview

Profitmaker uses **Zustand 5** for global state management. Each domain has its own store file. Stores use middleware for immutable updates (Immer), persistence (localStorage), and reactive subscriptions.

## Store Architecture

```
src/store/
├── dashboardStore.ts          # Dashboards and widgets
├── userStore.ts               # Users and exchange accounts
├── dataProviderStore.ts       # Data providers, subscriptions, market data
├── groupStore.ts              # Widget groups (shared context)
├── chartWidgetStore.ts        # Per-widget chart settings
├── orderBookWidgetStore.ts    # Per-widget orderbook settings
├── tradesWidgetStore.ts       # Per-widget trades settings
├── userBalancesWidgetStore.ts # Per-widget balance settings
├── userTradingDataWidgetStore.ts # Per-widget trading data settings
├── placeOrderStore.ts         # Order form state
├── notificationStore.ts       # Toast/notification queue
├── settingsDrawerStore.ts     # Settings panel open/close state
├── types.ts                   # DataProviderStore type definitions
├── actions/                   # Split action modules for dataProviderStore
│   ├── providerActions.ts
│   ├── subscriptionActions.ts
│   ├── dataActions.ts
│   ├── fetchingActions.ts
│   ├── ccxtActions.ts
│   └── eventActions.ts
├── providers/                 # Provider implementation helpers
└── utils/                     # Store utility functions
```

## Core Stores

### dashboardStore

Manages dashboards and their widgets. Persisted to `dashboard-store` in localStorage.

**State:**
```typescript
{
  dashboards: Dashboard[];       // All dashboards
  activeDashboardId?: string;    // Currently visible dashboard
}
```

**Key actions:**
- `addDashboard(data)` / `removeDashboard(id)` / `duplicateDashboard(id)`
- `setActiveDashboard(id)`
- `addWidget(dashboardId, widget)` / `removeWidget(dashboardId, widgetId)`
- `moveWidget(dashboardId, widgetId, x, y)`
- `resizeWidget(dashboardId, widgetId, width, height)`
- `bringWidgetToFront(dashboardId, widgetId)`
- `toggleWidgetVisibility(dashboardId, widgetId)`
- `toggleWidgetMinimized(dashboardId, widgetId)`
- `updateWidgetTitle(dashboardId, widgetId, userTitle)`

**Middleware:** `persist` + `immer`

On first load, `initializeWithDefault()` creates a default dashboard with Chart, Portfolio, Order Form, and Transaction History widgets.

### userStore

Manages users and their exchange accounts. API keys are encrypted at rest.

**State:**
```typescript
{
  users: User[];
  activeUserId?: string;
  isLocked: boolean;              // Whether encryption is locked
  needsMasterPassword: boolean;   // Whether master password needs setup
}
```

**Key actions:**
- `addUser(data)` / `removeUser(id)` / `updateUser(id, data)`
- `addAccount(userId, account)` / `removeAccount(userId, accountId)`
- `setupMasterPassword(password)` -- first-time encryption setup
- `unlockStore(password)` / `lockStore()` -- encryption lock/unlock
- `getDecryptedAccount(userId, accountId)` -- returns decrypted credentials
- `encryptAllAccounts()` / `migrateUnencryptedData()`

**Middleware:** `persist` + `immer`

Persisted data includes users and accounts (with encrypted API keys). The `isLocked` flag is reset to `true` on page reload -- the user must re-enter the master password.

### dataProviderStore

The largest and most complex store. Manages data providers, subscriptions, and all market data.

**State:**
```typescript
{
  providers: Record<string, DataProvider>;
  activeProviderId: string | null;  // Deprecated, kept for compat
  dataFetchSettings: {
    method: 'websocket' | 'rest';
    restIntervals: {
      trades: 1000,     // ms
      candles: 5000,
      orderbook: 500,
      balance: 30000,
      ticker: 600000
    }
  };
  activeSubscriptions: Record<string, ActiveSubscription>;
  restCycles: Record<string, RestCycleManager>;
  marketData: {
    candles: { [exchange][market][symbol][timeframe]: Candle[] };
    trades: { [exchange][market][symbol]: Trade[] };
    orderbook: { [exchange][market][symbol]: OrderBook };
    balance: { [accountId][walletType]: ExchangeBalances };
    ticker: { [exchange][market][symbol]: Ticker };
  };
  chartUpdateListeners: Record<string, ChartUpdateListener[]>;
}
```

**Key action categories:**

Provider management:
- `addProvider()` / `removeProvider()` / `createProvider()`
- `getProviderForExchange(exchange)` -- finds best provider by priority

Subscriptions (with deduplication):
- `subscribe(subscriberId, exchange, symbol, dataType, timeframe?, market?)`
- `unsubscribe(subscriberId, exchange, symbol, dataType, timeframe?, market?)`

Data retrieval:
- `getCandles(exchange, symbol, timeframe?, market?)`
- `getTrades(exchange, symbol, market?)`
- `getOrderBook(exchange, symbol, market?)`
- `getBalance(accountId, walletType?)`
- `getTicker(exchange, symbol, market?, maxAge?)`

Data initialization (REST fetch on widget mount):
- `initializeChartData()` / `initializeTradesData()` / `initializeOrderBookData()`
- `initializeBalanceData()` / `initializeTickerData()`
- `loadHistoricalCandles()` -- for infinite scroll

**Middleware:** `persist` + `subscribeWithSelector` + `immer`

Only provider configs and fetch settings are persisted. Market data is NOT persisted.

**Actions are split** into separate files in `store/actions/` for maintainability:
- `providerActions.ts` -- provider CRUD
- `subscriptionActions.ts` -- subscribe/unsubscribe with ref counting
- `dataActions.ts` -- data retrieval and updates
- `fetchingActions.ts` -- REST/WebSocket fetching logic
- `ccxtActions.ts` -- CCXT-specific operations
- `eventActions.ts` -- chart update event system

### groupStore

Manages widget groups that share trading context.

**State:**
```typescript
{
  groups: Group[];
  selectedGroupId?: string;
}
```

**Key actions:**
- `createGroup(data)` / `deleteGroup(id)`
- `selectGroup(groupId)`
- `setExchange(groupId, exchange)` / `setMarket(groupId, market)`
- `setTradingPair(groupId, pair)` / `setAccount(groupId, account)`

## Patterns

### Middleware Stack

Most stores use this pattern:

```typescript
export const useMyStore = create<MyStore>()(
  persist(
    immer((set, get) => ({
      // state + actions
    })),
    {
      name: 'my-store',           // localStorage key
      partialize: (state) => ({   // only persist what matters
        field1: state.field1,
      }),
      merge: (persisted, current) => {
        // Validate with Zod on load
        try {
          const parsed = MySchema.parse(persisted);
          return { ...current, ...parsed };
        } catch {
          return current;  // invalid data -> use defaults
        }
      },
    }
  )
);
```

### Selectors

Always use selectors to minimize re-renders:

```typescript
// Good -- only re-renders when activeDashboardId changes
const id = useDashboardStore(s => s.activeDashboardId);

// Bad -- re-renders on ANY store change
const store = useDashboardStore();
```

### Immer Updates

Immer lets you write "mutable" code that produces immutable updates:

```typescript
set((state) => {
  const widget = state.dashboards
    .find(d => d.id === dashboardId)
    ?.widgets.find(w => w.id === widgetId);
  if (widget) {
    widget.position.x = newX;  // looks mutable, but Immer handles it
    widget.position.y = newY;
  }
});
```

### Zod Validation on Rehydration

Stores validate persisted data with Zod schemas on load. If the schema doesn't match (e.g., after a code update changes the shape), the store falls back to defaults instead of crashing:

```typescript
merge: (persisted, current) => {
  try {
    const parsed = DashboardStoreStateSchema.parse(persisted);
    return { ...current, ...parsed };
  } catch {
    return current;
  }
},
```

### enableMapSet

The dataProviderStore uses `enableMapSet()` from Immer to support Map and Set in state updates (used for subscription tracking).
