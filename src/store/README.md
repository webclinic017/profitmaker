# DataProvider Store - Modular Architecture

This document describes the modular architecture of DataProvider Store after refactoring from large monolithic files to logically separated modules.

## 🎯 Refactoring Goals

- **Readability**: Split 809-line file into logical modules
- **Maintainability**: Easier to find and edit specific functionality  
- **Extensibility**: Simpler to add new features without conflicts
- **Testability**: Ability to unit-test individual modules

## 📁 File Structure

```
src/store/
├── dataProviderStore.ts      # Main store (65 lines)
├── types.ts                  # Store types (75 lines)
├── utils/
│   └── ccxtUtils.ts         # CCXT utilities (29 lines)
└── actions/
    ├── providerActions.ts   # Provider management (55 lines)
    ├── subscriptionActions.ts # Subscription management (77 lines)  
    ├── dataActions.ts       # Data operations (153 lines)
    ├── fetchingActions.ts   # WebSocket/REST fetching (318 lines)
    └── ccxtActions.ts       # CCXT specific methods (67 lines)
```

## 🔧 Modules

### 1. Main Store (`dataProviderStore.ts`)
- Creating Zustand store with middleware (immer, subscribeWithSelector)
- Composition of all action modules
- Initial state definition with default provider

### 2. Types (`types.ts`) 
- `DataProviderState` - state interface
- `DataProviderActions` - actions interface
- `DataProviderStore` - main store type

### 3. Utils (`utils/ccxtUtils.ts`)
- `getCCXT()` - get CCXT from global object
- `getCCXTPro()` - get CCXT Pro for WebSocket

### 4. Actions

#### Provider Actions (`providerActions.ts`)
Data provider management:
- `addProvider()` - add provider  
- `removeProvider()` - remove provider
- `setActiveProvider()` - set active provider

#### Subscription Actions (`subscriptionActions.ts`) 
Subscription management with deduplication:
- `subscribe()` - create subscription with smart deduplication
- `unsubscribe()` - unsubscribe with subscriber counting

#### Data Actions (`dataActions.ts`)
Data operations and settings:
- `setDataFetchMethod()` - change data fetching method (WebSocket/REST)
- `setRestInterval()` - configure REST request intervals
- `getCandles()`, `getTrades()`, `getOrderBook()` - get data
- `updateCandles()`, `updateTrades()`, `updateOrderBook()` - update data
- Utilities for working with subscription keys

#### Fetching Actions (`fetchingActions.ts`)
WebSocket and REST data fetching:
- `startDataFetching()` - start data fetching for subscription
- `stopDataFetching()` - stop data fetching
- `startWebSocketFetching()` - WebSocket streams via CCXT Pro
- `startRestFetching()` - REST polling via CCXT

#### CCXT Actions (`ccxtActions.ts`)
CCXT specific methods:
- `selectOptimalOrderBookMethod()` - intelligent orderbook method selection
- `cleanup()` - store cleanup

## 🔄 Usage

Import and usage remains exactly the same:

```typescript
import { useDataProviderStore } from './store/dataProviderStore';

// In component
const { subscribe, getCandles, setDataFetchMethod } = useDataProviderStore();
```

## ⚡ New Architecture Benefits

1. **Modularity**: Each file is responsible for specific functionality area
2. **Isolation**: Changes in one module don't affect others  
3. **Reusability**: Actions can be reused in other stores
4. **Typing**: Clear separation of state and action types
5. **Debugging**: Easier to find problem sources by file name
6. **Code Review**: Easier to review changes in specific areas

## 🚀 Compatibility

✅ **Full backward compatibility** - all existing components work without changes.

TypeScript compilation passes without errors, all types match the previous version. 