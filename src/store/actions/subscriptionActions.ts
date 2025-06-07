import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataType, ProviderOperationResult, Timeframe, MarketType } from '../../types/dataProviders';

export interface SubscriptionActions {
  subscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType) => Promise<ProviderOperationResult>;
  unsubscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType) => void;
}

export const createSubscriptionActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  SubscriptionActions
> = (set, get) => ({
  // Deduplicated subscriptions management
  subscribe: async (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market: MarketType = 'spot'): Promise<ProviderOperationResult> => {
    const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);
    const currentMethod = get().dataFetchSettings.method;
    
    try {
      let needsStart = false;
      let needsRestart = false;
      
      set(state => {
        // Look for existing subscription
        if (state.activeSubscriptions[subscriptionKey]) {
          // Increase subscriber count
          state.activeSubscriptions[subscriptionKey].subscriberCount++;
          console.log(`📈 Subscriber ${subscriberId} added to existing subscription: ${subscriptionKey} (count: ${state.activeSubscriptions[subscriptionKey].subscriberCount})`);
          
          // IMPORTANT: Check if subscription method matches current settings
          if (state.activeSubscriptions[subscriptionKey].method !== currentMethod) {
            console.log(`🔄 Subscription ${subscriptionKey} method outdated (${state.activeSubscriptions[subscriptionKey].method} -> ${currentMethod})`);
            state.activeSubscriptions[subscriptionKey].method = currentMethod;
            needsRestart = true;
          }
        } else {
          // Create new subscription with current method
          state.activeSubscriptions[subscriptionKey] = {
            key: { exchange, symbol, dataType, timeframe, market },
            subscriberCount: 1,
            method: currentMethod,
            isFallback: false, // Initially not fallback
            isActive: false,
            lastUpdate: 0
          };
          needsStart = true;
          console.log(`🆕 New subscription created: ${subscriptionKey} for subscriber ${subscriberId} (method: ${currentMethod})`);
        }
      });

      // Restart if method changed
      if (needsRestart) {
        console.log(`🔄 Restarting subscription ${subscriptionKey} due to method change`);
        get().stopDataFetching(subscriptionKey);
        await new Promise(resolve => setTimeout(resolve, 100));
        await get().startDataFetching(subscriptionKey);
      }
      // Start data fetching if subscription is new
      else if (needsStart) {
        await get().startDataFetching(subscriptionKey);
      }

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to create subscription ${subscriptionKey}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  unsubscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market: MarketType = 'spot') => {
    const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);
    
    set(state => {
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].subscriberCount--;
        console.log(`📉 Subscriber ${subscriberId} removed from subscription: ${subscriptionKey} (count: ${state.activeSubscriptions[subscriptionKey].subscriberCount})`);
        
        // If no subscribers left - stop data fetching
        if (state.activeSubscriptions[subscriptionKey].subscriberCount <= 0) {
          get().stopDataFetching(subscriptionKey);
          delete state.activeSubscriptions[subscriptionKey];
          console.log(`🗑️ Subscription removed: ${subscriptionKey}`);
        }
      }
    });
  }
}); 