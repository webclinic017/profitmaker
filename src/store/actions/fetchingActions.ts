// Re-export all fetching actions from split modules for backwards compatibility
import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataProvider, DataType, Timeframe, MarketType, WalletType } from '../../types/dataProviders';

import { createWsFetchingActions, type WsFetchingActions } from './fetching/wsFetchingActions';
import { createRestFetchingActions, type RestFetchingActions } from './fetching/restFetchingActions';

export interface FetchingActions {
  startDataFetching: (subscriptionKey: string) => Promise<void>;
  stopDataFetching: (subscriptionKey: string) => void;
  startWebSocketFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  startRestFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  fetchBalance: (accountId: string, walletType: WalletType) => Promise<void>;
}

export const createFetchingActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  FetchingActions
> = (set, get, store) => ({
  ...createWsFetchingActions(set, get, store),
  ...createRestFetchingActions(set, get, store),

  startDataFetching: async (subscriptionKey: string): Promise<void> => {
    const subscription = get().activeSubscriptions[subscriptionKey];
    if (!subscription || subscription.isActive) return;

    const { exchange, symbol, dataType, timeframe, market } = subscription.key;

    let provider = subscription.providerId
      ? get().providers[subscription.providerId]
      : get().getProviderForExchange(exchange);

    if (!subscription.providerId && provider) {
      set(state => {
        if (state.activeSubscriptions[subscriptionKey]) {
          state.activeSubscriptions[subscriptionKey].providerId = provider!.id;
        }
      });
    }

    if (!provider) {
      console.error(`No suitable provider found for exchange ${exchange}`);
      return;
    }

    set(state => { state.activeSubscriptions[subscriptionKey].isActive = true; });

    try {
      if (subscription.method === 'websocket') {
        await get().startWebSocketFetching(exchange, symbol, dataType, provider, timeframe, market);
      } else {
        await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
      }
    } catch (error) {
      console.error(`Failed to start data fetching for ${subscriptionKey}:`, error);
      set(state => { state.activeSubscriptions[subscriptionKey].isActive = false; });
    }
  },

  stopDataFetching: (subscriptionKey: string) => {
    const subscription = get().activeSubscriptions[subscriptionKey];
    if (!subscription || !subscription.isActive) return;

    if (subscription.wsConnection) subscription.wsConnection.close();
    if (subscription.intervalId) clearInterval(subscription.intervalId);

    set(state => {
      state.activeSubscriptions[subscriptionKey].isActive = false;
      delete state.activeSubscriptions[subscriptionKey].intervalId;
      delete state.activeSubscriptions[subscriptionKey].wsConnection;
    });
  },
});
