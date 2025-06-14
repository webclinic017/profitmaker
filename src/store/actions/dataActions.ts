import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataType, DataFetchMethod, Candle, Trade, OrderBook, ActiveSubscription, Timeframe, MarketType } from '../../types/dataProviders';
import { getCCXT } from '../utils/ccxtUtils';
import { createExchangeInstance } from '../utils/providerUtils';
import { getOHLCVLimit, getTradesLimit, logExchangeLimits } from '../../utils/exchangeLimits';

export interface DataActions {
  // Data fetch settings management
  setDataFetchMethod: (method: DataFetchMethod) => Promise<void>;
  setRestInterval: (dataType: DataType, interval: number) => void;
  
  // Data retrieval from store
  getCandles: (exchange: string, symbol: string, timeframe?: Timeframe, market?: MarketType) => Candle[];
  getTrades: (exchange: string, symbol: string, market?: MarketType) => Trade[];
  getOrderBook: (exchange: string, symbol: string, market?: MarketType) => OrderBook | null;
  
  // REST data initialization for Chart widgets
  initializeChartData: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType) => Promise<Candle[]>;
  
  // REST data initialization for Trades widgets
  initializeTradesData: (exchange: string, symbol: string, market: MarketType, limit?: number, aggregated?: boolean) => Promise<Trade[]>;
  
  // REST data initialization for OrderBook widgets
  initializeOrderBookData: (exchange: string, symbol: string, market: MarketType) => Promise<OrderBook>;
  
  // Infinite scroll: Load historical candles before given timestamp
  loadHistoricalCandles: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, beforeTimestamp: number) => Promise<Candle[]>;
  
  // Central store data updates
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe?: Timeframe, market?: MarketType) => void;
  updateTrades: (exchange: string, symbol: string, trades: Trade[], market?: MarketType) => void;
  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market?: MarketType) => void;
  
  // Utilities
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType) => string;
  getActiveSubscriptionsList: () => ActiveSubscription[];
}

export const createDataActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  DataActions
> = (set, get) => ({
  // Data fetch settings management
  setDataFetchMethod: async (method: DataFetchMethod) => {
    const oldMethod = get().dataFetchSettings.method;
    
    // First update settings
    set(state => {
      state.dataFetchSettings.method = method;
    });
    
    console.log(`🔄 Data fetch method changed from ${oldMethod} to ${method}`);
    
    // When method changes - restart all active subscriptions
    if (oldMethod !== method) {
      const activeKeys = Object.keys(get().activeSubscriptions).filter(key => 
        get().activeSubscriptions[key].isActive
      );
      
      console.log(`🔄 Restarting ${activeKeys.length} active subscriptions with new method: ${method}`);
      
      // Stop all active subscriptions
      activeKeys.forEach(key => {
        console.log(`🛑 Stopping subscription ${key} for method change`);
        get().stopDataFetching(key);
      });
      
      // Update method in subscriptions
      set(state => {
        activeKeys.forEach(key => {
          if (state.activeSubscriptions[key]) {
            state.activeSubscriptions[key].method = method;
            console.log(`🔄 Updated method for subscription ${key} to ${method}`);
          }
        });
      });
      
      // Wait a bit for stopping to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Restart subscriptions with new method
      for (const key of activeKeys) {
        const subscription = get().activeSubscriptions[key];
        if (subscription) {
          console.log(`🚀 Restarting subscription ${key} with method ${method}`);
          await get().startDataFetching(key);
        }
      }
      
      console.log(`✅ All subscriptions restarted with method: ${method}`);
    }
  },

  setRestInterval: (dataType: DataType, interval: number) => {
    set(state => {
      const oldInterval = state.dataFetchSettings.restIntervals[dataType];
      state.dataFetchSettings.restIntervals[dataType] = interval;
      console.log(`⏱️ REST interval for ${dataType} changed from ${oldInterval}ms to ${interval}ms`);
      
      // Restart REST subscriptions for this data type
      Object.keys(state.activeSubscriptions).forEach(key => {
        const subscription = state.activeSubscriptions[key];
        if (subscription.key.dataType === dataType && subscription.method === 'rest' && subscription.isActive) {
          get().stopDataFetching(key);
          get().startDataFetching(key);
        }
      });
    });
  },

  // Data retrieval from store
  getCandles: (exchange: string, symbol: string, timeframe: Timeframe = '1m', market: MarketType = 'spot'): Candle[] => {
    const state = get();
    return state.marketData.candles[exchange]?.[market]?.[symbol]?.[timeframe] || [];
  },

  getTrades: (exchange: string, symbol: string, market: MarketType = 'spot'): Trade[] => {
    const state = get();
    return state.marketData.trades[exchange]?.[market]?.[symbol] || [];
  },

  getOrderBook: (exchange: string, symbol: string, market: MarketType = 'spot'): OrderBook | null => {
    const state = get();
    const result = state.marketData.orderbook[exchange]?.[market]?.[symbol] || null;
    
    console.log(`🔍 [OrderBook] Requesting data for ${exchange}:${market}:${symbol}:`, {
      exchange,
      market,
      symbol,
      hasExchange: !!state.marketData.orderbook[exchange],
      hasMarket: !!state.marketData.orderbook[exchange]?.[market],
      hasSymbol: !!state.marketData.orderbook[exchange]?.[market]?.[symbol],
      result: result,
      allExchanges: Object.keys(state.marketData.orderbook),
      fullOrderbookData: state.marketData.orderbook
    });
    
    return result;
  },

  // Central store data updates
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe: Timeframe = '1m', market: MarketType = 'spot') => {
    let eventType: 'initial_load' | 'new_candles' | 'update_last_candle' = 'new_candles';
    let eventData: any = {};

    set(state => {
      if (!state.marketData.candles[exchange]) {
        state.marketData.candles[exchange] = {};
      }
      if (!state.marketData.candles[exchange][market]) {
        state.marketData.candles[exchange][market] = {};
      }
      if (!state.marketData.candles[exchange][market][symbol]) {
        state.marketData.candles[exchange][market][symbol] = {};
      }
      
      const existing = state.marketData.candles[exchange][market][symbol][timeframe] || [];
      
      if (existing.length === 0) {
        // If no data - this is first load (REST snapshot)
        state.marketData.candles[exchange][market][symbol][timeframe] = candles;
        eventType = 'initial_load';
        eventData = {
          totalCandles: candles.length,
          newCandles: candles
        };
        console.log(`📊 [updateCandles] Initial snapshot loaded: ${candles.length} candles for ${exchange}:${market}:${symbol}:${timeframe}`);
      } else {
        // Have data - merge with existing (WebSocket updates)
        const candleMap = new Map<number, Candle>();
        
        // Add existing candles
        existing.forEach(candle => {
          candleMap.set(candle.timestamp, candle);
        });
        
        // Determine update type
        const lastExistingTime = existing[existing.length - 1]?.timestamp || 0;
        const newCandlesCount = candles.filter(c => c.timestamp > lastExistingTime).length;
        const hasUpdatedLastCandle = candles.some(c => c.timestamp === lastExistingTime);
        
        // Update/add new candles
        candles.forEach(candle => {
          candleMap.set(candle.timestamp, candle);
        });
        
        // Sort by time and save
        const mergedCandles = Array.from(candleMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        state.marketData.candles[exchange][market][symbol][timeframe] = mergedCandles;
        
        // Determine event type for Chart widgets
        if (newCandlesCount > 0) {
          eventType = 'new_candles';
          eventData = {
            newCandlesCount,
            newCandles: candles.filter(c => c.timestamp > lastExistingTime),
            totalCandles: mergedCandles.length
          };
        } else if (hasUpdatedLastCandle) {
          eventType = 'update_last_candle';
          eventData = {
            lastCandle: candles.find(c => c.timestamp === lastExistingTime),
            totalCandles: mergedCandles.length
          };
        }
        
        console.log(`🔄 [updateCandles] WebSocket update: ${candles.length} new/updated candles, total: ${mergedCandles.length} for ${exchange}:${market}:${symbol}:${timeframe}, event: ${eventType}`);
      }
      
      // Update last update timestamp
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'candles', timeframe, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });

    // Emit event for Chart widgets after store update
    get().emitChartUpdateEvent({
      type: eventType,
      exchange,
      symbol,
      timeframe,
      market,
      data: eventData,
      timestamp: Date.now()
    });
  },

  updateTrades: (exchange: string, symbol: string, trades: Trade[], market: MarketType = 'spot') => {
    set(state => {
      if (!state.marketData.trades[exchange]) {
        state.marketData.trades[exchange] = {};
      }
      if (!state.marketData.trades[exchange][market]) {
        state.marketData.trades[exchange][market] = {};
      }
      
      // For trades add new trades to existing (maximum 1000)
      const existing = state.marketData.trades[exchange][market][symbol] || [];
      const combined = [...existing, ...trades];
      state.marketData.trades[exchange][market][symbol] = combined.slice(-1000); // Keep last 1000
      
      // Update last update timestamp
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'trades', undefined, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market: MarketType = 'spot') => {
    console.log(`💾 [OrderBook] Saving data for ${exchange}:${market}:${symbol}:`, {
      exchange,
      market,
      symbol,
      orderbook,
      hasBids: orderbook?.bids?.length || 0,
      hasAsks: orderbook?.asks?.length || 0,
      timestamp: orderbook?.timestamp
    });
    
    set(state => {
      if (!state.marketData.orderbook[exchange]) {
        state.marketData.orderbook[exchange] = {};
      }
      if (!state.marketData.orderbook[exchange][market]) {
        state.marketData.orderbook[exchange][market] = {};
      }
      state.marketData.orderbook[exchange][market][symbol] = orderbook;
      
      console.log(`✅ [OrderBook] Data saved to state:`, {
        exchange,
        market,
        symbol,
        savedSuccessfully: !!state.marketData.orderbook[exchange][market][symbol],
        allExchanges: Object.keys(state.marketData.orderbook)
      });
      
      // Update last update timestamp
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'orderbook', undefined, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  // Utilities
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market: MarketType = 'spot'): string => {
    let key = `${exchange}:${market}:${symbol}:${dataType}`;
    if (dataType === 'candles' && timeframe) {
      key += `:${timeframe}`;
    }
    return key;
  },

  getActiveSubscriptionsList: (): ActiveSubscription[] => {
    return Object.values(get().activeSubscriptions);
  },

  // REST data initialization for Chart widgets
  initializeChartData: async (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType): Promise<Candle[]> => {
    // NEW: Get optimal provider for this exchange
    const provider = get().getProviderForExchange(exchange);
    
    if (!provider) {
      throw new Error(`No suitable provider found for exchange ${exchange}`);
    }
    
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      throw new Error(`REST initialization not supported for provider type: ${provider.type}`);
    }
    
    console.log(`🚀 [initializeChartData] Loading initial data for ${exchange}:${market}:${symbol}:${timeframe} using provider ${provider.id}`);
    
    try {
      // Use CCXT utilities with new helper function
      const ccxt = getCCXT();
      
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      
      // Get optimal limit for this exchange
      const optimalLimit = getOHLCVLimit(exchange);
      logExchangeLimits(exchange, optimalLimit, 'ohlcv');
      
      // Load historical data with optimal limit
      const ohlcvData = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, optimalLimit);
      
      if (!ohlcvData || ohlcvData.length === 0) {
        throw new Error('No data received from exchange');
      }
      
      // Convert to Candle format
      const candles: Candle[] = ohlcvData.map((c: any[]) => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5]
      }));
      
      console.log(`✅ [initializeChartData] Loaded ${candles.length} candles for ${exchange}:${market}:${symbol}:${timeframe}`);
      
      // DO NOT save to store - return directly for chart
      return candles;
      
    } catch (error) {
      console.error(`❌ [initializeChartData] Failed to load data:`, error);
      throw error;
    }
  },

  // REST data initialization for Trades widgets
  initializeTradesData: async (exchange: string, symbol: string, market: MarketType, limit: number = 500, aggregated: boolean = true): Promise<Trade[]> => {
    // Get optimal provider for this exchange
    const provider = get().getProviderForExchange(exchange);
    
    if (!provider) {
      throw new Error(`No suitable provider found for exchange ${exchange}`);
    }
    
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      throw new Error(`REST initialization not supported for provider type: ${provider.type}`);
    }
    
    console.log(`🚀 [initializeTradesData] Loading initial trades for ${exchange}:${market}:${symbol} (limit: ${limit}, aggregated: ${aggregated}) using provider ${provider.id}`);
    
    try {
      // Use CCXT utilities
      const ccxt = getCCXT();
      
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      
      // Set fetchTradesMethod based on aggregated parameter
      const fetchTradesMethod = aggregated 
        ? (exchange === 'binance' ? 'publicGetAggTrades' : 'fetchTrades') // для binance используем agg, для остальных стандартный
        : 'publicGetTrades'; // для non-aggregated всегда publicGetTrades
      
      console.log(`📊 [initializeTradesData] Using method: ${fetchTradesMethod} for ${exchange}`);
      
      // Get optimal limit for trades (but respect the parameter)
      const effectiveLimit = Math.min(limit, getTradesLimit(exchange));
      logExchangeLimits(exchange, effectiveLimit, 'trades');
      
      // Load trades with fetchTradesMethod parameter
      const tradesData = await exchangeInstance.fetchTrades(symbol, undefined, effectiveLimit, {
        fetchTradesMethod
      });
      
      if (!tradesData || tradesData.length === 0) {
        console.warn(`⚠️ [initializeTradesData] No trades received for ${exchange}:${symbol}`);
        return [];
      }
      
      console.log(`✅ [initializeTradesData] Loaded ${tradesData.length} trades for ${exchange}:${market}:${symbol} (method: ${fetchTradesMethod})`);
      
      // Save trades to store AND return them
      get().updateTrades(exchange, symbol, tradesData, market);
      console.log(`💾 [initializeTradesData] Trades saved to store for ${exchange}:${market}:${symbol}`);
      
      return tradesData;
      
    } catch (error) {
      console.error(`❌ [initializeTradesData] Failed to load trades:`, error);
      throw error;
    }
  },

  // REST data initialization for OrderBook widgets
  initializeOrderBookData: async (exchange: string, symbol: string, market: MarketType): Promise<OrderBook> => {
    // Get optimal provider for this exchange
    const provider = get().getProviderForExchange(exchange);
    
    if (!provider) {
      throw new Error(`No suitable provider found for exchange ${exchange}`);
    }
    
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      throw new Error(`REST initialization not supported for provider type: ${provider.type}`);
    }
    
    console.log(`🚀 [OrderBook] Loading initial orderbook for ${exchange}:${market}:${symbol} using provider ${provider.id}`);
    
    try {
      // Use CCXT utilities
      const ccxt = getCCXT();
      
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      
      // Load orderbook via REST
      const orderbookData = await exchangeInstance.fetchOrderBook(symbol);
      
      if (!orderbookData) {
        throw new Error('No orderbook data received from exchange');
      }
      
      if (!orderbookData.bids || !orderbookData.asks || 
          !Array.isArray(orderbookData.bids) || !Array.isArray(orderbookData.asks)) {
        throw new Error('Invalid orderbook data format received');
      }
      
      console.log(`✅ [OrderBook] Loaded orderbook for ${exchange}:${market}:${symbol} (bids: ${orderbookData.bids.length}, asks: ${orderbookData.asks.length})`);
      
      // Save orderbook to store AND return it
      get().updateOrderBook(exchange, symbol, orderbookData, market);
      console.log(`💾 [OrderBook] OrderBook saved to store for ${exchange}:${market}:${symbol}`);
      
      return orderbookData;
      
    } catch (error) {
      console.error(`❌ [OrderBook] Failed to load orderbook:`, error);
      throw error;
    }
  },

  // Infinite scroll: Load historical candles before given timestamp
  loadHistoricalCandles: async (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, beforeTimestamp: number): Promise<Candle[]> => {
    // Get optimal provider for this exchange
    const provider = get().getProviderForExchange(exchange);
    
    if (!provider) {
      throw new Error(`No suitable provider found for exchange ${exchange}`);
    }
    
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      throw new Error(`Historical data loading not supported for provider type: ${provider.type}`);
    }
    
    console.log(`📜 [loadHistoricalCandles] Loading historical data before ${new Date(beforeTimestamp).toISOString()} for ${exchange}:${market}:${symbol}:${timeframe} using provider ${provider.id}`);
    
    try {
      // Use CCXT utilities
      const ccxt = getCCXT();
      
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      
             // Get optimal limit for this exchange (use maximum allowed by exchange)
       const optimalLimit = getOHLCVLimit(exchange);
       logExchangeLimits(exchange, optimalLimit, 'ohlcv');
       
       // Calculate 'since' timestamp for CCXT (load data BEFORE beforeTimestamp)
       // We want data that comes BEFORE the given timestamp, so we need to calculate
       // how far back to go based on timeframe and limit
       
       // Simple timeframe to milliseconds conversion
       const timeframeToMs = (tf: string): number => {
         const unit = tf.slice(-1);
         const value = parseInt(tf.slice(0, -1)) || 1;
         switch (unit) {
           case 'm': return value * 60 * 1000;
           case 'h': return value * 60 * 60 * 1000;
           case 'd': return value * 24 * 60 * 60 * 1000;
           default: return 60 * 1000; // default 1 minute
         }
       };
       
       const timeframeMs = timeframeToMs(timeframe);
       const sinceTimestamp = beforeTimestamp - (optimalLimit * timeframeMs);
      
      console.log(`📜 [loadHistoricalCandles] CCXT fetchOHLCV parameters: symbol=${symbol}, timeframe=${timeframe}, since=${new Date(sinceTimestamp).toISOString()}, limit=${optimalLimit}`);
      
      // Load historical data with 'since' parameter (CCXT: fetchOHLCV(symbol, timeframe, since, limit))
      const ohlcvData = await exchangeInstance.fetchOHLCV(symbol, timeframe, sinceTimestamp, optimalLimit);
      
      if (!ohlcvData || ohlcvData.length === 0) {
        console.warn(`⚠️ [loadHistoricalCandles] No historical data received for ${exchange}:${market}:${symbol}:${timeframe} before ${new Date(beforeTimestamp).toISOString()}`);
        return [];
      }
      
      // Convert to Candle format and filter to only include data BEFORE beforeTimestamp
      const candles: Candle[] = ohlcvData
        .filter((c: any[]) => c[0] < beforeTimestamp) // Only candles before the given timestamp
        .map((c: any[]) => ({
          timestamp: c[0],
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4],
          volume: c[5]
        }))
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
      
             console.log(`✅ [loadHistoricalCandles] Loaded ${candles.length} historical candles (filtered from ${ohlcvData.length}, limit=${optimalLimit}) for ${exchange}:${market}:${symbol}:${timeframe} before ${new Date(beforeTimestamp).toISOString()}`);
       
       if (candles.length > 0) {
         console.log(`📊 [loadHistoricalCandles] Historical data range: ${new Date(candles[0].timestamp).toISOString()} → ${new Date(candles[candles.length - 1].timestamp).toISOString()}`);
       }
      
      // DO NOT save to store - return directly for chart infinite scroll
      return candles;
      
    } catch (error) {
      console.error(`❌ [loadHistoricalCandles] Failed to load historical data:`, error);
      throw error;
    }
  }
});