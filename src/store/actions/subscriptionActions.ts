import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataType, ProviderOperationResult, Timeframe, MarketType, SubscriptionConfig } from '../../types/dataProviders';

export interface SubscriptionActions {
  subscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType, config?: SubscriptionConfig) => Promise<ProviderOperationResult>;
  unsubscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType, config?: Pick<SubscriptionConfig, 'providerId'>) => void;
  forceCloseSubscription: (subscriptionKey: string) => void;
}

function findSubscriptionKey(
  activeSubscriptions: DataProviderStore['activeSubscriptions'],
  exchange: string,
  symbol: string,
  dataType: DataType,
  timeframe: Timeframe | undefined,
  market: MarketType,
  providerId?: string
): string | undefined {
  return Object.entries(activeSubscriptions).find(([, subscription]) => (
    subscription.key.exchange === exchange &&
    subscription.key.symbol === symbol &&
    subscription.key.dataType === dataType &&
    subscription.key.timeframe === timeframe &&
    subscription.key.market === market &&
    (!providerId || subscription.providerId === providerId)
  ))?.[0];
}

export const createSubscriptionActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  SubscriptionActions
> = (set, get) => ({
  // Deduplicated subscriptions management
  subscribe: async (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market: MarketType = 'spot', config?: SubscriptionConfig): Promise<ProviderOperationResult> => {
    const currentMethod = get().dataFetchSettings.method;
    const { providerId, ...subscriptionConfig } = config ?? {};
    const effectiveProviderId = providerId ?? get().getProviderForExchange(exchange)?.id;
    const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market, effectiveProviderId);
    const hasSubscriptionConfig = Object.keys(subscriptionConfig).length > 0;

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
            lastUpdate: 0,
            providerId: effectiveProviderId,
            config: hasSubscriptionConfig ? subscriptionConfig : undefined
          };
          needsStart = true;
                      console.log(`🆕 New subscription created: ${subscriptionKey} for subscriber ${subscriberId} (method: ${currentMethod}, config:`, config, ')');
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

  unsubscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market: MarketType = 'spot', config?: Pick<SubscriptionConfig, 'providerId'>) => {
    const effectiveProviderId = config?.providerId ?? get().getProviderForExchange(exchange)?.id;
    const providerSubscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market, effectiveProviderId);
    const legacySubscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);
    const activeSubscriptions = get().activeSubscriptions;
    const subscriptionKey = activeSubscriptions[providerSubscriptionKey]
      ? providerSubscriptionKey
      : activeSubscriptions[legacySubscriptionKey]
        ? legacySubscriptionKey
        : findSubscriptionKey(activeSubscriptions, exchange, symbol, dataType, timeframe, market, effectiveProviderId) ?? providerSubscriptionKey;

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
  },

  forceCloseSubscription: (subscriptionKey: string) => {
    console.log(`🔨 Force closing subscription: ${subscriptionKey}`);

    // Stop data fetching immediately
    get().stopDataFetching(subscriptionKey);

    // Remove from active subscriptions
    set(state => {
      if (state.activeSubscriptions[subscriptionKey]) {
        console.log(`🗑️ Force removed subscription: ${subscriptionKey} (had ${state.activeSubscriptions[subscriptionKey].subscriberCount} subscribers)`);
        delete state.activeSubscriptions[subscriptionKey];
      }
    });
  }
});
