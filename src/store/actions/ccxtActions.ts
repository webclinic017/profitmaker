import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { OrderBookMethodSelection, CCXTMethodCapabilities } from '../../types/dataProviders';

export interface CCXTActions {
  selectOptimalOrderBookMethod: (exchange: string, exchangeInstance: any) => OrderBookMethodSelection;
  cleanup: () => void;
}

export const createCCXTActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  CCXTActions
> = (set, get) => ({
  // Intelligent CCXT method selection
  selectOptimalOrderBookMethod: (exchange: string, exchangeInstance: any): OrderBookMethodSelection => {
    console.log(`🔍 Analyzing ${exchange} capabilities to select optimal orderbook method...`);
    
    // Check available exchange capabilities
    const capabilities: CCXTMethodCapabilities = {
      watchOrderBookForSymbols: !!exchangeInstance.has?.['watchOrderBookForSymbols'],
      watchOrderBook: !!exchangeInstance.has?.['watchOrderBook'],
      fetchOrderBook: !!exchangeInstance.has?.['fetchOrderBook']
    };

    console.log(`📊 ${exchange} capabilities:`, capabilities);

    // Priority 1: watchOrderBookForSymbols (diff updates, most efficient)
    if (capabilities.watchOrderBookForSymbols) {
      return {
        selectedMethod: 'watchOrderBookForSymbols',
        reason: 'Optimal choice: supports diff updates for multiple pairs',
        capabilities,
        isOptimal: true
      };
    }

    // Priority 2: watchOrderBook (full orderbook, standard efficiency)
    if (capabilities.watchOrderBook) {
      return {
        selectedMethod: 'watchOrderBook',
        reason: 'Standard WebSocket: full orderbook snapshots',
        capabilities,
        isOptimal: true
      };
    }

    // Fallback: fetchOrderBook (REST requests)
    return {
      selectedMethod: 'fetchOrderBook',
      reason: 'Fallback: REST requests, WebSocket methods not supported',
      capabilities,
      isOptimal: false
    };
  },

  // Cleanup
  cleanup: () => {
    const subscriptions = get().activeSubscriptions;
    Object.keys(subscriptions).forEach(key => {
      get().stopDataFetching(key);
    });

    set(state => {
      state.activeSubscriptions = {};
      state.restCycles = {};
      state.marketData = {
        candles: {},
        trades: {},
        orderbook: {}
      };
    });

    console.log(`🧹 Data provider store cleaned up`);
  }
}); 