import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { enableMapSet } from 'immer';

import type { DataProviderStore, DataProviderState } from './types';
import type { CCXTBrowserProvider } from '../types/dataProviders';

// Actions imports
import { createProviderActions } from './actions/providerActions';
import { createSubscriptionActions } from './actions/subscriptionActions';
import { createDataActions } from './actions/dataActions';
import { createFetchingActions } from './actions/fetchingActions';
import { createCCXTActions } from './actions/ccxtActions';
import { createEventActions } from './actions/eventActions';

// Enable Map and Set support in Immer
enableMapSet();

export const useDataProviderStore = create<DataProviderStore>()(
  subscribeWithSelector(
    immer((set, get, store) => {
      // Create default universal provider
      const defaultProvider: CCXTBrowserProvider = {
        id: 'universal-browser',
        type: 'ccxt-browser',
        name: 'Universal Browser Provider',
        status: 'connected',
        exchanges: ['*'], // Поддерживает все биржи
        priority: 100, // Низкий приоритет (используется как fallback)
        config: {
          sandbox: false
        }
      };

      // Initial state
      const initialState: DataProviderState = {
        providers: {
          [defaultProvider.id]: defaultProvider
        },
        activeProviderId: defaultProvider.id, // Deprecated, kept for compatibility
        dataFetchSettings: {
          method: 'websocket',
          restIntervals: {
            trades: 1000,   // 1 second
            candles: 5000,  // 5 seconds
            orderbook: 500  // 0.5 seconds
          }
        },
        activeSubscriptions: {},
        restCycles: {},
        marketData: {
          candles: {}, // [exchange][market][symbol][timeframe] -> Candle[]
          trades: {},  // [exchange][market][symbol] -> Trade[]
          orderbook: {} // [exchange][market][symbol] -> OrderBook
        },
        chartUpdateListeners: {}, // Event system for Chart widgets
        loading: false,
        error: null
      };

      return {
        ...initialState,
        ...createProviderActions(set, get, store),
        ...createSubscriptionActions(set, get, store),
        ...createDataActions(set, get, store),
        ...createFetchingActions(set, get, store),
        ...createCCXTActions(set, get, store),
        ...createEventActions(set, get, store)
      };
    })
  )
); 