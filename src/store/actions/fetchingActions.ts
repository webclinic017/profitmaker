import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataProvider, DataType, CCXTBrowserProvider, CCXTServerProvider, Timeframe, MarketType } from '../../types/dataProviders';
import { getCCXT, getCCXTPro } from '../utils/ccxtUtils';
import { useUserStore } from '../userStore';
import { getAccountForExchange, convertAccountForProvider, createExchangeInstance } from '../utils/providerUtils';

export interface FetchingActions {
  startDataFetching: (subscriptionKey: string) => Promise<void>;
  stopDataFetching: (subscriptionKey: string) => void;
  startWebSocketFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  startRestFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
}



export const createFetchingActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  FetchingActions
> = (set, get) => ({
  // Internal data flow management functions
  startDataFetching: async (subscriptionKey: string): Promise<void> => {
    const subscription = get().activeSubscriptions[subscriptionKey];
    if (!subscription || subscription.isActive) {
      return;
    }

    const { exchange, symbol, dataType, timeframe, market } = subscription.key;
    
    // NEW: Get provider for specific exchange (not just active provider)
    let provider: DataProvider | null = null;
    
    if (subscription.providerId) {
      // Use specific provider if set
      provider = get().providers[subscription.providerId];
    } else {
      // Auto-select optimal provider for this exchange
      provider = get().getProviderForExchange(exchange);
      
      // Save selected provider to subscription
      if (provider) {
        set(state => {
          if (state.activeSubscriptions[subscriptionKey]) {
            state.activeSubscriptions[subscriptionKey].providerId = provider!.id;
          }
        });
      }
    }
    
    if (!provider) {
      console.error(`❌ No suitable provider found for exchange ${exchange} (subscription ${subscriptionKey})`);
      return;
    }

    console.log(`🚀 Starting data fetching for ${subscriptionKey} using ${subscription.method} method`);

    set(state => {
      state.activeSubscriptions[subscriptionKey].isActive = true;
    });

    try {
      if (subscription.method === 'websocket') {
        await get().startWebSocketFetching(exchange, symbol, dataType, provider, timeframe, market);
      } else {
        await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
      }
    } catch (error) {
      console.error(`❌ Failed to start data fetching for ${subscriptionKey}:`, error);
      set(state => {
        state.activeSubscriptions[subscriptionKey].isActive = false;
      });
    }
  },

  stopDataFetching: (subscriptionKey: string) => {
    const subscription = get().activeSubscriptions[subscriptionKey];
    if (!subscription || !subscription.isActive) {
      return;
    }

    console.log(`🛑 Stopping data fetching for ${subscriptionKey}`);

    // Stop WebSocket connection
    if (subscription.wsConnection) {
      subscription.wsConnection.close();
      console.log(`🔌 WebSocket connection closed for ${subscriptionKey}`);
    }

    // Stop REST cycle
    if (subscription.intervalId) {
      clearInterval(subscription.intervalId);
      console.log(`⏰ REST interval cleared for ${subscriptionKey}`);
    }

    set(state => {
      state.activeSubscriptions[subscriptionKey].isActive = false;
      delete state.activeSubscriptions[subscriptionKey].intervalId;
      delete state.activeSubscriptions[subscriptionKey].wsConnection;
    });
  },

  // Start WebSocket data fetching via CCXT Pro
  startWebSocketFetching: async (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe: Timeframe = '1m', market: MarketType = 'spot') => {
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      console.warn(`⚠️ WebSocket not supported for provider type ${provider.type}`);
      return;
    }

    const ccxtPro = getCCXTPro();
    if (!ccxtPro) {
      console.warn(`⚠️ CCXT Pro unavailable, switching to REST`);
      await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
      return;
    }

    try {
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxtPro);
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);

      // CCXT Pro supports WebSocket by default for all major exchanges
      console.log(`📡 Starting CCXT Pro WebSocket stream: ${exchange} ${symbol} ${dataType}`);
      
      // Check available methods in CCXT Pro
      console.log(`🔍 CCXT Pro ${exchange} available methods:`, Object.keys(exchangeInstance.has || {}));
      
      // Check WebSocket methods support in CCXT Pro
      let watchMethod: string;
      let hasSupport: boolean;

      switch (dataType) {
        case 'candles':
          watchMethod = 'watchOHLCV';
          hasSupport = !!exchangeInstance.has?.[watchMethod];
          break;
        case 'trades':
          watchMethod = 'watchTrades';
          hasSupport = !!exchangeInstance.has?.[watchMethod];
          break;
        case 'orderbook':
          // Use intelligent method selection for orderbook
          const methodSelection = get().selectOptimalOrderBookMethod(exchange, exchangeInstance);
          watchMethod = methodSelection.selectedMethod;
          hasSupport = methodSelection.selectedMethod !== 'fetchOrderBook'; // all except REST have WebSocket support
          
          console.log(`🎯 Optimal method selected for ${exchange} orderbook:`, {
            method: methodSelection.selectedMethod,
            reason: methodSelection.reason,
            isOptimal: methodSelection.isOptimal
          });
          
          // Save selected method in subscription for UI display
          set(state => {
            if (state.activeSubscriptions[subscriptionKey]) {
              state.activeSubscriptions[subscriptionKey].ccxtMethod = methodSelection.selectedMethod;
            }
          });
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      console.log(`🔍 CCXT Pro ${exchange} ${watchMethod} support:`, hasSupport);

      if (!hasSupport) {
        console.warn(`⚠️ CCXT Pro ${exchange} does not support ${watchMethod}, falling back to REST`);
        
        // Automatically switch to REST with fallback flag
        set(state => {
          if (state.activeSubscriptions[subscriptionKey]) {
            state.activeSubscriptions[subscriptionKey].method = 'rest';
            state.activeSubscriptions[subscriptionKey].isFallback = true; // IMPORTANT: Mark as fallback
          }
        });
        await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
        return;
      }

      // First load historical data via REST for candles
      if (dataType === 'candles') {
        try {
          console.log(`📊 Loading historical candles for ${exchange} ${symbol} ${timeframe} before WebSocket`);
          const ccxt = getCCXT();
          if (ccxt) {
            const restInstance = createExchangeInstance(exchange, provider, ccxt);
            const historicalCandles = await restInstance.fetchOHLCV(symbol, timeframe, undefined, 100);
            if (historicalCandles && historicalCandles.length > 0) {
              const formattedCandles = historicalCandles.map((c: any[]) => ({
                timestamp: c[0],
                open: c[1],
                high: c[2],
                low: c[3],
                close: c[4],
                volume: c[5]
              }));
              get().updateCandles(exchange, symbol, formattedCandles, timeframe, market);
              console.log(`✅ Loaded ${formattedCandles.length} historical candles`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load historical candles:`, error);
        }
      }

      // Start CCXT Pro WebSocket stream with infinite loop
      const startWebSocketStream = async () => {
        console.log(`🚀 Starting CCXT Pro WebSocket loop for ${exchange} ${symbol} ${dataType}`);
        
        while (true) {
          try {
            const subscription = get().activeSubscriptions[subscriptionKey];
            if (!subscription?.isActive) {
              console.log(`🛑 WebSocket loop stopped for ${subscriptionKey} - subscription inactive`);
              break;
            }

            switch (dataType) {
              case 'candles':
                const candles = await exchangeInstance.watchOHLCV(symbol, timeframe);
                if (candles && candles.length > 0) {
                  const formattedCandles = candles.map((c: any[]) => ({
                    timestamp: c[0],
                    open: c[1],
                    high: c[2],
                    low: c[3],
                    close: c[4],
                    volume: c[5]
                  }));
                  get().updateCandles(exchange, symbol, formattedCandles, timeframe, market);
                }
                break;
              case 'trades':
                const trades = await exchangeInstance.watchTrades(symbol);
                if (trades && trades.length > 0) {
                  get().updateTrades(exchange, symbol, trades, market);
                }
                break;
              case 'orderbook':
                // Get information about selected method
                const currentSubscription = get().activeSubscriptions[subscriptionKey];
                const selectedMethod = currentSubscription?.ccxtMethod || 'watchOrderBook';
                
                let orderbook;
                switch (selectedMethod) {
                  case 'watchOrderBookForSymbols':
                    // For multiple pairs (returns object with pairs)
                    const multiOrderbook = await exchangeInstance.watchOrderBookForSymbols([symbol]);
                    orderbook = multiOrderbook[symbol];
                    console.log(`📋 OrderBook (watchOrderBookForSymbols) received for ${exchange} ${symbol}`);
                    break;
                  case 'watchOrderBook':
                  default:
                    // Standard full orderbook
                    orderbook = await exchangeInstance.watchOrderBook(symbol);
                    console.log(`📋 OrderBook (watchOrderBook) received for ${exchange} ${symbol}`);
                    break;
                }
                
                if (orderbook) {
                  console.log(`📊 OrderBook data sample:`, {
                    method: selectedMethod,
                    bids: orderbook.bids?.slice(0, 3),
                    asks: orderbook.asks?.slice(0, 3),
                    timestamp: orderbook.timestamp
                  });
                  get().updateOrderBook(exchange, symbol, orderbook, market);
                }
                break;
            }
          } catch (error) {
            console.error(`❌ CCXT Pro WebSocket error for ${subscriptionKey}:`, error);
            
            // On WebSocket error - switch to REST with fallback flag
            console.log(`🔄 Switching to REST fallback due to WebSocket error`);
            set(state => {
              if (state.activeSubscriptions[subscriptionKey]) {
                state.activeSubscriptions[subscriptionKey].method = 'rest';
                state.activeSubscriptions[subscriptionKey].isFallback = true;
              }
            });
            await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
            break;
          }
        }
      };

      // Start WebSocket stream in background
      startWebSocketStream().catch(error => {
        console.error(`❌ Failed to start CCXT Pro WebSocket for ${subscriptionKey}:`, error);
      });

    } catch (error) {
      console.error(`❌ Failed to start WebSocket for ${exchange} ${symbol} ${dataType}:`, error);
      throw error;
    }
  },

  // Start REST data fetching
  startRestFetching: async (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe: Timeframe = '1m', market: MarketType = 'spot') => {
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      console.warn(`⚠️ REST not supported for provider type ${provider.type}`);
      return;
    }

    const ccxt = getCCXT();
    if (!ccxt) return;

    try {
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);
      const interval = get().dataFetchSettings.restIntervals[dataType];

      console.log(`🔄 Starting REST polling: ${exchange} ${symbol} ${dataType} every ${interval}ms`);

      const fetchData = async () => {
        try {
          const subscription = get().activeSubscriptions[subscriptionKey];
          if (!subscription?.isActive) return;

          switch (dataType) {
            case 'candles':
              const candles = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, 100);
              if (candles && candles.length > 0) {
                const formattedCandles = candles.map((c: any[]) => ({
                  timestamp: c[0],
                  open: c[1],
                  high: c[2],
                  low: c[3],
                  close: c[4],
                  volume: c[5]
                }));
                get().updateCandles(exchange, symbol, formattedCandles, timeframe, market);
              }
              break;
            case 'trades':
              const trades = await exchangeInstance.fetchTrades(symbol, undefined, 100);
              if (trades && trades.length > 0) {
                get().updateTrades(exchange, symbol, trades, market);
              }
              break;
            case 'orderbook':
              const orderbook = await exchangeInstance.fetchOrderBook(symbol);
              if (orderbook) {
                console.log(`📋 OrderBook received via REST for ${exchange} ${symbol}:`, {
                  bids: orderbook.bids?.slice(0, 3),
                  asks: orderbook.asks?.slice(0, 3),
                  timestamp: orderbook.timestamp
                });
                get().updateOrderBook(exchange, symbol, orderbook, market);
              }
              break;
          }
        } catch (error) {
          console.error(`❌ REST fetch error for ${subscriptionKey}:`, error);
          // On error continue attempts with increased interval
        }
      };

      // First request immediately
      await fetchData();

      // Start interval
      const intervalId = setInterval(fetchData, interval) as any;

      set(state => {
        if (state.activeSubscriptions[subscriptionKey]) {
          state.activeSubscriptions[subscriptionKey].intervalId = intervalId;
        }
      });

    } catch (error) {
      console.error(`❌ Failed to start REST polling for ${exchange} ${symbol} ${dataType}:`, error);
      throw error;
    }
  }
}); 