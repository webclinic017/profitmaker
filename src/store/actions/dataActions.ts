import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';
import type { DataType, DataFetchMethod, Candle, Trade, OrderBook, Ticker, ExchangeBalances, ActiveSubscription, Timeframe, MarketType, WalletType } from '../../types/dataProviders';
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
  getBalance: (accountId: string, walletType?: WalletType) => ExchangeBalances | null;
  getTicker: (exchange: string, symbol: string, market?: MarketType, maxAge?: number) => Ticker | null;
  getTickerWithRefresh: (exchange: string, symbol: string, market?: MarketType, forceRefresh?: boolean) => Promise<Ticker | null>;
  
  // REST data initialization for Chart widgets
  initializeChartData: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType) => Promise<Candle[]>;
  
  // REST data initialization for Trades widgets
  initializeTradesData: (exchange: string, symbol: string, market: MarketType, limit?: number, aggregated?: boolean) => Promise<Trade[]>;
  
  // REST data initialization for OrderBook widgets
  initializeOrderBookData: (exchange: string, symbol: string, market: MarketType) => Promise<OrderBook>;
  
  // REST data initialization for Balance widgets  
  initializeBalanceData: (accountId: string, walletType: WalletType) => Promise<ExchangeBalances>;
  
  // REST data initialization for Ticker widgets
  initializeTickerData: (exchange: string, symbol: string, market: MarketType) => Promise<Ticker>;
  
  // Infinite scroll: Load historical candles before given timestamp
  loadHistoricalCandles: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, beforeTimestamp: number) => Promise<Candle[]>;
  
  // User trading data methods
  fetchMyTrades: (accountId: string, symbol?: string, since?: number, limit?: number) => Promise<Trade[]>;
  fetchOrders: (accountId: string, symbol?: string, since?: number, limit?: number) => Promise<any[]>;
  fetchOpenOrders: (accountId: string, symbol?: string) => Promise<any[]>;
  fetchPositions: (accountId: string, symbols?: string[]) => Promise<any[]>;
  
  // Central store data updates
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe?: Timeframe, market?: MarketType) => void;
  updateTrades: (exchange: string, symbol: string, trades: Trade[], market?: MarketType) => void;
  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market?: MarketType) => void;
  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => void;
  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market?: MarketType) => void;
  
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

  getBalance: (accountId: string, walletType?: WalletType): ExchangeBalances | null => {
    const state = get();
    const effectiveWalletType = walletType || 'trading';
    const result = state.marketData.balance[accountId]?.[effectiveWalletType] || null;
    
    console.log(`💰 [Balance] Requesting data for account ${accountId}:${effectiveWalletType}:`, {
      accountId,
      walletType: effectiveWalletType,
      hasAccount: !!state.marketData.balance[accountId],
      hasWalletType: !!state.marketData.balance[accountId]?.[effectiveWalletType],
      result: result,
      allAccounts: Object.keys(state.marketData.balance)
    });
    
    return result;
  },

  getTicker: (exchange: string, symbol: string, market: MarketType = 'spot', maxAge = 600000): Ticker | null => {
    const state = get();
    const tickerData = state.marketData.ticker[exchange]?.[market]?.[symbol];
    
    if (!tickerData) {
      console.log(`🎯 [Ticker] No ticker data for ${exchange}:${market}:${symbol}`);
      return null;
    }
    
    const now = Date.now();
    const age = now - tickerData.lastUpdate;
    
    if (age > maxAge) {
      console.log(`⏰ [Ticker] Data is too old for ${exchange}:${market}:${symbol}, age: ${age}ms, maxAge: ${maxAge}ms`);
      return null;
    }
    
    console.log(`✅ [Ticker] Returning cached data for ${exchange}:${market}:${symbol}, age: ${age}ms`);
    return {
      symbol: tickerData.symbol,
      timestamp: tickerData.timestamp,
      bid: tickerData.bid,
      ask: tickerData.ask,
      last: tickerData.last,
      close: tickerData.close,
      midPrice: tickerData.midPrice
    };
  },

  getTickerWithRefresh: async (exchange: string, symbol: string, market = 'spot' as MarketType, forceRefresh = false): Promise<Ticker | null> => {
    const maxAge = 600000; // 10 minutes
    
    // If not forced refresh, check if we have valid cached data
    if (!forceRefresh) {
      const cached = get().getTicker(exchange, symbol, market, maxAge);
      if (cached) {
        console.log(`💾 [TickerWithRefresh] Using cached data for ${exchange}:${market}:${symbol}`);
        return cached;
      }
    }
    
    try {
      console.log(`🔄 [TickerWithRefresh] Fetching fresh data for ${exchange}:${market}:${symbol}, forceRefresh: ${forceRefresh}`);
      const ticker = await get().initializeTickerData(exchange, symbol, market);
      return ticker;
    } catch (error) {
      console.error(`❌ [TickerWithRefresh] Failed to fetch ticker for ${exchange}:${market}:${symbol}:`, error);
      
      // On error, return cached data even if expired (better than nothing)
      const cached = get().getTicker(exchange, symbol, market, Infinity);
      if (cached) {
        console.log(`🆘 [TickerWithRefresh] Returning expired cached data due to fetch error`);
        return cached;
      }
      
      return null;
    }
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

  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => {
    const effectiveWalletType = walletType || 'trading';
    console.log(`💰 [Balance] Saving data for account ${accountId}:${effectiveWalletType}:`, {
      accountId,
      walletType: effectiveWalletType,
      balance,
      balancesCount: balance.balances?.length || 0,
      timestamp: balance.timestamp
    });
    
    set(state => {
      if (!state.marketData.balance[accountId]) {
        state.marketData.balance[accountId] = {};
      }
      state.marketData.balance[accountId][effectiveWalletType] = balance;
      
      console.log(`✅ [Balance] Data saved to state:`, {
        accountId,
        walletType: effectiveWalletType,
        savedSuccessfully: !!state.marketData.balance[accountId][effectiveWalletType],
        allAccounts: Object.keys(state.marketData.balance)
      });
      
      // Update last update timestamp
      const subscriptionKey = get().getSubscriptionKey('', accountId, 'balance', undefined, effectiveWalletType as MarketType);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market: MarketType = 'spot') => {
    console.log(`🎯 [Ticker] Saving data for ${exchange}:${market}:${symbol}:`, {
      exchange,
      market,
      symbol,
      ticker,
      bid: ticker.bid,
      ask: ticker.ask,
      midPrice: ticker.midPrice,
      timestamp: ticker.timestamp
    });
    
    set(state => {
      if (!state.marketData.ticker[exchange]) {
        state.marketData.ticker[exchange] = {};
      }
      if (!state.marketData.ticker[exchange][market]) {
        state.marketData.ticker[exchange][market] = {};
      }
      
      // Add lastUpdate timestamp for caching
      state.marketData.ticker[exchange][market][symbol] = {
        ...ticker,
        lastUpdate: Date.now()
      };
      
      console.log(`✅ [Ticker] Data saved to state:`, {
        exchange,
        market,
        symbol,
        savedSuccessfully: !!state.marketData.ticker[exchange][market][symbol],
        allExchanges: Object.keys(state.marketData.ticker)
      });
      
      // Update last update timestamp for subscription
      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'ticker', undefined, market);
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

  // REST data initialization for Balance widgets
  initializeBalanceData: async (accountId: string, walletType: WalletType): Promise<ExchangeBalances> => {
    // Get account info from userStore
    const { useUserStore } = await import('../userStore');
    const userStore = useUserStore.getState();
    
    // Find account by ID
    let account: any = null;
    for (const user of userStore.users) {
      account = user.accounts.find(acc => acc.id === accountId);
      if (account) break;
    }
    
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found`);
    }
    
    const exchange = account.exchange;
    
    // Get optimal provider for this exchange
    const provider = get().getProviderForExchange(exchange);
    
    if (!provider) {
      throw new Error(`No suitable provider found for exchange ${exchange}`);
    }
    
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      throw new Error(`REST initialization not supported for provider type: ${provider.type}`);
    }
    
    console.log(`🚀 [Balance] Loading initial balance for account ${accountId} (${exchange}:${walletType}) using provider ${provider.id}`);
    
    try {
      // Use CCXT utilities
      const ccxt = getCCXT();
      
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      
      // Set defaultType based on wallet type (CCXT best practice)
      if (walletType === 'futures') {
        exchangeInstance.options = exchangeInstance.options || {};
        exchangeInstance.options['defaultType'] = 'future';
      } else if (walletType === 'margin') {
        exchangeInstance.options = exchangeInstance.options || {};
        exchangeInstance.options['defaultType'] = 'margin';
      } else if (walletType === 'spot') {
        exchangeInstance.options = exchangeInstance.options || {};
        exchangeInstance.options['defaultType'] = 'spot';
      }
      
      console.log(`💰 [Balance Init] Fetching ${walletType} balance for account ${accountId} (${exchange}) with defaultType: ${exchangeInstance.options?.defaultType}`);
      
      // Use fetchBalance() for all types (CCXT recommended approach)
      let balanceData = await exchangeInstance.fetchBalance();
      
      // Try fetchFundingBalance() if supported for additional funding wallet data
      if (exchangeInstance.has?.fetchFundingBalance) {
        try {
          const fundingBalance = await exchangeInstance.fetchFundingBalance();
          console.log(`💰 [Balance Init] Also got funding balance for account ${accountId} (${exchange}):`, {
            fundingCurrencies: Object.keys(fundingBalance).filter(k => k !== 'info' && k !== 'datetime' && k !== 'timestamp').length
          });
          // Merge funding balance into main balance if needed
          if (fundingBalance && typeof fundingBalance === 'object') {
            // Add funding balances to the main balance structure
            Object.entries(fundingBalance).forEach(([currency, data]: [string, any]) => {
              if (currency !== 'info' && currency !== 'datetime' && currency !== 'timestamp' && 
                  data && typeof data === 'object') {
                // If currency already exists, add funding amounts to it
                if (balanceData[currency]) {
                  balanceData[currency].funding = data;
                } else {
                  // Create new entry for funding-only currencies
                  balanceData[currency] = {
                    free: 0,
                    used: 0,
                    total: 0,
                    funding: data
                  };
                }
              }
            });
          }
        } catch (fundingError) {
          console.warn(`⚠️ [Balance Init] Could not fetch funding balance for account ${accountId} (${exchange}):`, fundingError.message);
        }
      }
      
      if (!balanceData) {
        throw new Error('No balance data received from exchange');
      }
      
      // Transform CCXT balance format to our format
      const balances = Object.entries(balanceData)
        .filter(([currency, data]: [string, any]) => 
          currency !== 'info' && currency !== 'datetime' && currency !== 'timestamp' && 
          data && typeof data === 'object' && (data.total > 0 || data.free > 0 || data.used > 0)
        )
        .map(([currency, data]: [string, any]) => ({
          currency,
          free: data.free || 0,
          used: data.used || 0,
          total: data.total || 0
        }));
        
      const exchangeBalances = {
        timestamp: balanceData.timestamp || Date.now(),
        balances,
        info: balanceData.info
      };
      
      console.log(`✅ [Balance] Loaded balance for account ${accountId} (${exchange}:${walletType}) (currencies: ${balances.length})`);
      
      // Save balance to store AND return it
      get().updateBalance(accountId, exchangeBalances, walletType);
      console.log(`💾 [Balance] Balance saved to store for account ${accountId} (${exchange}:${walletType})`);
      
      return exchangeBalances;
      
    } catch (error) {
      console.error(`❌ [Balance] Failed to load balance for account ${accountId}:`, error);
      throw error;
    }
  },

  // REST data initialization for Ticker widgets
  initializeTickerData: async (exchange: string, symbol: string, market: MarketType): Promise<Ticker> => {
    // Get optimal provider for this exchange
    const provider = get().getProviderForExchange(exchange);
    
    if (!provider) {
      throw new Error(`No suitable provider found for exchange ${exchange}`);
    }
    
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') {
      throw new Error(`REST initialization not supported for provider type: ${provider.type}`);
    }
    
    console.log(`🚀 [Ticker] Loading ticker for ${exchange}:${market}:${symbol} using provider ${provider.id}`);
    
    try {
      // Use CCXT utilities
      const ccxt = getCCXT();
      
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
      
      // Load ticker via REST
      const tickerData = await exchangeInstance.fetchTicker(symbol);
      
      if (!tickerData) {
        throw new Error('No ticker data received from exchange');
      }
      
      // Transform CCXT ticker format to our format
      const ticker: Ticker = {
        symbol: tickerData.symbol,
        timestamp: tickerData.timestamp || Date.now(),
        bid: tickerData.bid || 0,
        ask: tickerData.ask || 0,
        last: tickerData.last,
        close: tickerData.close,
        midPrice: tickerData.bid && tickerData.ask ? (tickerData.bid + tickerData.ask) / 2 : undefined
      };
      
      console.log(`✅ [Ticker] Loaded ticker for ${exchange}:${market}:${symbol}:`, {
        bid: ticker.bid,
        ask: ticker.ask,
        midPrice: ticker.midPrice,
        last: ticker.last
      });
      
      // Save ticker to store AND return it
      get().updateTicker(exchange, symbol, ticker, market);
      console.log(`💾 [Ticker] Ticker saved to store for ${exchange}:${market}:${symbol}`);
      
      return ticker;
      
    } catch (error) {
      console.error(`❌ [Ticker] Failed to load ticker for ${exchange}:${market}:${symbol}:`, error);
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
  },

  // User trading data methods
  fetchMyTrades: async (accountId: string, symbol?: string, since?: number, limit?: number): Promise<Trade[]> => {
    console.log(`🔍 [fetchMyTrades] Starting fetchMyTrades for accountId: ${accountId}, symbol: ${symbol}`);
    
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);
    
    if (!account || !account.key || !account.privateKey) {
      const error = `Account ${accountId} not found or missing API keys`;
      console.error(`❌ [fetchMyTrades] ${error}`);
      throw new Error(error);
    }
    
    console.log(`🔄 [fetchMyTrades] Loading trades for account ${accountId} (${account.exchange})`);
    
    try {
      const ccxt = getCCXT();
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const ExchangeClass = ccxt[account.exchange];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${account.exchange} not found in CCXT`);
      }
      
      const exchangeInstance = new ExchangeClass({
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password,
        sandbox: false,
        enableRateLimit: true,
      });
      
      // Intercept HTTP requests to log them
      const originalFetch = exchangeInstance.fetch;
      exchangeInstance.fetch = function(url: string, method: string = 'GET', headers: any = {}, body: any = undefined) {
        console.log(`🌐 [fetchMyTrades] HTTP Request:`, {
          url,
          method,
          headers: Object.keys(headers),
          bodyLength: body ? body.length : 0,
          timestamp: new Date().toISOString()
        });
        
        return originalFetch.call(this, url, method, headers, body).then((response: any) => {
          console.log(`🌐 [fetchMyTrades] HTTP Response:`, {
            url,
            status: response?.status || 'unknown',
            responseLength: typeof response === 'string' ? response.length : 'unknown',
            timestamp: new Date().toISOString()
          });
          return response;
        }).catch((error: any) => {
          console.error(`🌐 [fetchMyTrades] HTTP Error:`, {
            url,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          throw error;
        });
      };
      
      await exchangeInstance.loadMarkets();
      
      console.log(`🔍 [fetchMyTrades] Checking fetchMyTrades capability for ${account.exchange}: ${exchangeInstance.has.fetchMyTrades}`);
      console.log(`🔍 [fetchMyTrades] Exchange URLs:`, {
        api: exchangeInstance.urls?.api,
        test: exchangeInstance.urls?.test,
        www: exchangeInstance.urls?.www
      });
      console.log(`🔍 [fetchMyTrades] Exchange options:`, {
        apiKey: account.key ? `${account.key.substring(0, 8)}...` : 'none',
        secret: account.privateKey ? `${account.privateKey.substring(0, 8)}...` : 'none',
        sandbox: exchangeInstance.sandbox,
        enableRateLimit: exchangeInstance.enableRateLimit
      });
      
      // Check if exchange supports fetchMyTrades
      if (!exchangeInstance.has.fetchMyTrades) {
        console.warn(`⚠️ [fetchMyTrades] Exchange ${account.exchange} does not support fetchMyTrades`);
        return [];
      }
      
      // Get supported markets for this exchange
      const supportedMarkets = await get().getMarketsForExchange(account.exchange);
      console.log(`🏪 [fetchMyTrades] Supported markets for ${account.exchange}:`, supportedMarkets);
      
      let allTrades: any[] = [];
      
      // Function to fetch trades for a specific market category
      const fetchTradesForMarket = async (marketCategory?: string) => {
        let marketTrades: any[] = [];
        const marketLabel = marketCategory || 'default';
        
        console.log(`🔄 [fetchMyTrades] Fetching trades for market: ${marketLabel}`);
        
        // Set market category for Bybit and similar exchanges
        if (marketCategory && account.exchange === 'bybit') {
          // Map our market names to Bybit categories
          const bybitCategoryMap: Record<string, string> = {
            'spot': 'spot',
            'futures': 'linear',
            'swap': 'linear', 
            'margin': 'spot',
            'options': 'option'
          };
          
          const bybitCategory = bybitCategoryMap[marketCategory];
          if (bybitCategory) {
            exchangeInstance.options = exchangeInstance.options || {};
            exchangeInstance.options.defaultType = bybitCategory;
            console.log(`🏪 [fetchMyTrades] Set Bybit category to: ${bybitCategory} for market: ${marketCategory}`);
          }
        }
        
        try {
          console.log(`🔍 [fetchMyTrades] Calling exchangeInstance.fetchMyTrades for ${marketLabel} with params:`, {
            symbol,
            since,
            limit
          });
          // Try to fetch trades for all symbols or specific symbol
          marketTrades = await exchangeInstance.fetchMyTrades(symbol, since, limit);
          console.log(`✅ [fetchMyTrades] Fetched ${marketTrades.length} trades for ${marketLabel}`);
        } catch (error) {
          console.warn(`⚠️ [fetchMyTrades] Failed to fetch trades for ${marketLabel} with symbol=${symbol}, error:`, error.message);
          
          // Some exchanges might require specific symbols, try to get popular trading pairs
          if (!symbol && account.exchange === 'bybit') {
            console.log(`🔄 [fetchMyTrades] Trying to fetch trades for popular symbols on ${account.exchange} (${marketLabel})`);
            const popularSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
            
            for (const popularSymbol of popularSymbols) {
              try {
                const symbolTrades = await exchangeInstance.fetchMyTrades(popularSymbol, since, Math.min(limit || 100, 20));
                marketTrades.push(...symbolTrades);
                console.log(`✅ [fetchMyTrades] Fetched ${symbolTrades.length} trades for ${popularSymbol} in ${marketLabel}`);
              } catch (symbolError) {
                console.warn(`⚠️ [fetchMyTrades] Failed to fetch trades for ${popularSymbol} in ${marketLabel}:`, symbolError.message);
              }
            }
          }
        }
        
        return marketTrades;
      };
      
      // Fetch trades for all supported markets
      if (supportedMarkets.length > 0) {
        for (const market of supportedMarkets) {
          try {
            const marketTrades = await fetchTradesForMarket(market);
            allTrades.push(...marketTrades);
            console.log(`📊 [fetchMyTrades] Added ${marketTrades.length} trades from ${market} market`);
          } catch (error) {
            console.warn(`⚠️ [fetchMyTrades] Failed to fetch trades for ${market} market:`, error.message);
            // Continue with other markets
          }
        }
      } else {
        // Fallback: fetch without specific market category
        console.log(`🔄 [fetchMyTrades] No specific markets found, using default approach`);
        const defaultTrades = await fetchTradesForMarket();
        allTrades.push(...defaultTrades);
      }
      
      // Remove duplicates and sort by timestamp
      const uniqueTrades = allTrades.filter((trade, index, self) => 
        index === self.findIndex(t => t.id === trade.id)
      ).sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`✅ [fetchMyTrades] Total unique trades loaded: ${uniqueTrades.length} for account ${accountId} across ${supportedMarkets.length} markets`);
      
      return uniqueTrades.map((trade: any) => ({
        id: trade.id,
        timestamp: trade.timestamp,
        symbol: trade.symbol,
        side: trade.side,
        amount: trade.amount,
        price: trade.price,
        cost: trade.cost,
        fee: trade.fee,
        info: trade.info
      }));
      
    } catch (error) {
      console.error(`❌ [fetchMyTrades] Failed to load trades for account ${accountId}:`, error);
      console.error(`❌ [fetchMyTrades] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        accountId,
        exchange: account.exchange
      });
      throw error;
    }
  },

  fetchOrders: async (accountId: string, symbol?: string, since?: number, limit?: number): Promise<any[]> => {
    console.log(`🔍 [fetchOrders] Starting fetchOrders for accountId: ${accountId}, symbol: ${symbol}`);
    
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);
    
    if (!account || !account.key || !account.privateKey) {
      const error = `Account ${accountId} not found or missing API keys`;
      console.error(`❌ [fetchOrders] ${error}`);
      throw new Error(error);
    }
    
    console.log(`🔄 [fetchOrders] Loading orders for account ${accountId} (${account.exchange})`);
    
    try {
      const ccxt = getCCXT();
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const ExchangeClass = ccxt[account.exchange];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${account.exchange} not found in CCXT`);
      }
      
      const exchangeInstance = new ExchangeClass({
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password,
        sandbox: false,
        enableRateLimit: true,
      });
      
      await exchangeInstance.loadMarkets();
      
      console.log(`🔍 [fetchOrders] Checking exchange capabilities for ${account.exchange}:`);
      console.log(`🔍 [fetchOrders] has.fetchOrders: ${exchangeInstance.has.fetchOrders}`);
      console.log(`🔍 [fetchOrders] has.fetchOpenOrders: ${exchangeInstance.has.fetchOpenOrders}`);
      console.log(`🔍 [fetchOrders] has.fetchClosedOrders: ${exchangeInstance.has.fetchClosedOrders}`);
      console.log(`🔍 [fetchOrders] has.fetchCanceledOrders: ${exchangeInstance.has.fetchCanceledOrders}`);
      
      // Get supported markets for this exchange
      const supportedMarkets = await get().getMarketsForExchange(account.exchange);
      console.log(`🏪 [fetchOrders] Supported markets for ${account.exchange}:`, supportedMarkets);
      
      let allOrders: any[] = [];
      
      // Function to fetch orders for a specific market category
      const fetchOrdersForMarket = async (marketCategory?: string) => {
        let marketOrders: any[] = [];
        const marketLabel = marketCategory || 'default';
        
        console.log(`🔄 [fetchOrders] Fetching orders for market: ${marketLabel}`);
        
        // Set market category for Bybit and similar exchanges
        if (marketCategory && account.exchange === 'bybit') {
          // Map our market names to Bybit categories
          const bybitCategoryMap: Record<string, string> = {
            'spot': 'spot',
            'futures': 'linear',
            'swap': 'linear', 
            'margin': 'spot',
            'options': 'option'
          };
          
          const bybitCategory = bybitCategoryMap[marketCategory];
          if (bybitCategory) {
            exchangeInstance.options = exchangeInstance.options || {};
            exchangeInstance.options.defaultType = bybitCategory;
            console.log(`🏪 [fetchOrders] Set Bybit category to: ${bybitCategory} for market: ${marketCategory}`);
          }
        }
        
        // Try fetchOrders first
        if (exchangeInstance.has.fetchOrders) {
          try {
            console.log(`🔄 [fetchOrders] Trying fetchOrders for ${account.exchange} (${marketLabel})`);
            const orders = await exchangeInstance.fetchOrders(symbol, since, limit);
            marketOrders = orders;
            console.log(`✅ [fetchOrders] fetchOrders successful for ${marketLabel}: ${orders.length} orders`);
          } catch (error) {
            console.warn(`⚠️ [fetchOrders] fetchOrders failed for ${account.exchange} (${marketLabel}):`, error.message);
            
            // Fallback to alternative methods
            if (exchangeInstance.has.fetchOpenOrders || exchangeInstance.has.fetchClosedOrders) {
              console.log(`🔄 [fetchOrders] Using fallback methods for ${account.exchange} (${marketLabel})`);
              
              // Fetch open orders
              if (exchangeInstance.has.fetchOpenOrders) {
                try {
                  const openOrders = await exchangeInstance.fetchOpenOrders(symbol);
                  marketOrders.push(...openOrders);
                  console.log(`✅ [fetchOrders] Fetched ${openOrders.length} open orders for ${marketLabel}`);
                } catch (openError) {
                  console.warn(`⚠️ [fetchOrders] Failed to fetch open orders for ${marketLabel}:`, openError.message);
                }
              }
              
              // Fetch closed orders
              if (exchangeInstance.has.fetchClosedOrders) {
                try {
                  const closedOrders = await exchangeInstance.fetchClosedOrders(symbol, since, limit);
                  marketOrders.push(...closedOrders);
                  console.log(`✅ [fetchOrders] Fetched ${closedOrders.length} closed orders for ${marketLabel}`);
                } catch (closedError) {
                  console.warn(`⚠️ [fetchOrders] Failed to fetch closed orders for ${marketLabel}:`, closedError.message);
                }
              }
              
              // Fetch canceled orders
              if (exchangeInstance.has.fetchCanceledOrders) {
                try {
                  const canceledOrders = await exchangeInstance.fetchCanceledOrders(symbol, since, limit);
                  marketOrders.push(...canceledOrders);
                  console.log(`✅ [fetchOrders] Fetched ${canceledOrders.length} canceled orders for ${marketLabel}`);
                } catch (canceledError) {
                  console.warn(`⚠️ [fetchOrders] Failed to fetch canceled orders for ${marketLabel}:`, canceledError.message);
                }
              }
            }
          }
        } else {
          // Use alternative methods if fetchOrders not supported
          if (exchangeInstance.has.fetchOpenOrders || exchangeInstance.has.fetchClosedOrders) {
            console.log(`🔄 [fetchOrders] Using alternative methods for ${account.exchange} (${marketLabel})`);
            
            // Fetch open orders
            if (exchangeInstance.has.fetchOpenOrders) {
              try {
                const openOrders = await exchangeInstance.fetchOpenOrders(symbol);
                marketOrders.push(...openOrders);
                console.log(`✅ [fetchOrders] Fetched ${openOrders.length} open orders for ${marketLabel}`);
              } catch (openError) {
                console.warn(`⚠️ [fetchOrders] Failed to fetch open orders for ${marketLabel}:`, openError.message);
              }
            }
            
            // Fetch closed orders
            if (exchangeInstance.has.fetchClosedOrders) {
              try {
                const closedOrders = await exchangeInstance.fetchClosedOrders(symbol, since, limit);
                marketOrders.push(...closedOrders);
                console.log(`✅ [fetchOrders] Fetched ${closedOrders.length} closed orders for ${marketLabel}`);
              } catch (closedError) {
                console.warn(`⚠️ [fetchOrders] Failed to fetch closed orders for ${marketLabel}:`, closedError.message);
              }
            }
          }
        }
        
        return marketOrders;
      };
      
      // Fetch orders for all supported markets
      if (supportedMarkets.length > 0) {
        for (const market of supportedMarkets) {
          try {
            const marketOrders = await fetchOrdersForMarket(market);
            allOrders.push(...marketOrders);
            console.log(`📊 [fetchOrders] Added ${marketOrders.length} orders from ${market} market`);
          } catch (error) {
            console.warn(`⚠️ [fetchOrders] Failed to fetch orders for ${market} market:`, error.message);
            // Continue with other markets
          }
        }
      } else {
        // Fallback: fetch without specific market category
        console.log(`🔄 [fetchOrders] No specific markets found, using default approach`);
        const defaultOrders = await fetchOrdersForMarket();
        allOrders.push(...defaultOrders);
      }
      
      // Sort by timestamp (newest first) and remove duplicates
      const uniqueOrders = allOrders.filter((order, index, self) => 
        index === self.findIndex(o => o.id === order.id)
      ).sort((a, b) => b.timestamp - a.timestamp);
      
      console.log(`✅ [fetchOrders] Total unique orders loaded: ${uniqueOrders.length} for account ${accountId} across ${supportedMarkets.length} markets`);
      
      // Detailed logging for first few orders
      uniqueOrders.slice(0, 5).forEach((order, index) => {
        console.log(`📋 [fetchOrders] Order ${index + 1}:`, {
          id: order.id,
          symbol: order.symbol,
          type: order.type,
          side: order.side,
          amount: order.amount,
          price: order.price,
          status: order.status,
          timestamp: order.timestamp,
          datetime: order.datetime,
          filled: order.filled,
          remaining: order.remaining,
          average: order.average,
          fee: order.fee
        });
      });
      
      return uniqueOrders;
      
    } catch (error) {
      console.error(`❌ [fetchOrders] Failed to load orders for account ${accountId}:`, error);
      console.error(`❌ [fetchOrders] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        accountId,
        exchange: account.exchange
      });
      throw error;
    }
  },

  fetchOpenOrders: async (accountId: string, symbol?: string): Promise<any[]> => {
    console.log(`🔍 [fetchOpenOrders] Starting fetchOpenOrders for accountId: ${accountId}, symbol: ${symbol}`);
    
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    
    console.log(`🔍 [fetchOpenOrders] Total users in store: ${users.length}`);
    
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    console.log(`🔍 [fetchOpenOrders] Found user:`, user ? { id: user.id, accountsCount: user.accounts.length } : 'null');
    
    const account = user?.accounts.find(acc => acc.id === accountId);
    console.log(`🔍 [fetchOpenOrders] Found account:`, account ? {
      id: account.id,
      exchange: account.exchange,
      email: account.email,
      hasKey: !!account.key,
      hasPrivateKey: !!account.privateKey,
      keyLength: account.key?.length || 0,
      privateKeyLength: account.privateKey?.length || 0
    } : 'null');
    
    if (!account || !account.key || !account.privateKey) {
      const error = `Account ${accountId} not found or missing API keys`;
      console.error(`❌ [fetchOpenOrders] ${error}`);
      throw new Error(error);
    }
    
    console.log(`🔄 [fetchOpenOrders] Loading open orders for account ${accountId} (${account.exchange})`);
    
    try {
      const ccxt = getCCXT();
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      console.log(`🔍 [fetchOpenOrders] CCXT available, looking for exchange: ${account.exchange}`);
      
      const ExchangeClass = ccxt[account.exchange];
      if (!ExchangeClass) {
        const error = `Exchange ${account.exchange} not found in CCXT`;
        console.error(`❌ [fetchOpenOrders] ${error}`);
        console.log(`🔍 [fetchOpenOrders] Available exchanges:`, Object.keys(ccxt));
        throw new Error(error);
      }
      
      console.log(`🔍 [fetchOpenOrders] Creating exchange instance for ${account.exchange}`);
      
      const exchangeInstance = new ExchangeClass({
        apiKey: account.key,
        secret: account.privateKey,
        password: account.password,
        sandbox: false,
        enableRateLimit: true,
      });
      
      // Intercept HTTP requests to log them
      const originalFetch = exchangeInstance.fetch;
      exchangeInstance.fetch = function(url: string, method: string = 'GET', headers: any = {}, body: any = undefined) {
        console.log(`🌐 [fetchOpenOrders] HTTP Request:`, {
          url,
          method,
          headers: Object.keys(headers),
          bodyLength: body ? body.length : 0,
          timestamp: new Date().toISOString()
        });
        
        return originalFetch.call(this, url, method, headers, body).then((response: any) => {
          console.log(`🌐 [fetchOpenOrders] HTTP Response:`, {
            url,
            status: response?.status || 'unknown',
            responseLength: typeof response === 'string' ? response.length : 'unknown',
            timestamp: new Date().toISOString()
          });
          return response;
        }).catch((error: any) => {
          console.error(`🌐 [fetchOpenOrders] HTTP Error:`, {
            url,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          throw error;
        });
      };
      
      console.log(`🔍 [fetchOpenOrders] Exchange instance created, loading markets...`);
      await exchangeInstance.loadMarkets();
      console.log(`🔍 [fetchOpenOrders] Markets loaded, checking fetchOpenOrders capability...`);
      
      // Check if exchange supports fetchOpenOrders
      if (!exchangeInstance.has.fetchOpenOrders) {
        console.warn(`⚠️ [fetchOpenOrders] Exchange ${account.exchange} does not support fetchOpenOrders`);
        return [];
      }
      
      console.log(`🔍 [fetchOpenOrders] Calling exchangeInstance.fetchOpenOrders(${symbol})`);
      console.log(`🔍 [fetchOpenOrders] Exchange URLs:`, {
        api: exchangeInstance.urls?.api,
        test: exchangeInstance.urls?.test,
        www: exchangeInstance.urls?.www
      });
      console.log(`🔍 [fetchOpenOrders] Exchange options:`, {
        apiKey: account.key ? `${account.key.substring(0, 8)}...` : 'none',
        secret: account.privateKey ? `${account.privateKey.substring(0, 8)}...` : 'none',
        sandbox: exchangeInstance.sandbox,
        enableRateLimit: exchangeInstance.enableRateLimit
      });
      
      const orders = await exchangeInstance.fetchOpenOrders(symbol);
      
      console.log(`✅ [fetchOpenOrders] Loaded ${orders.length} open orders for account ${accountId}`);
      console.log(`📊 [fetchOpenOrders] Raw orders:`, orders);
      
      // Detailed logging for each order
      orders.forEach((order, index) => {
        console.log(`📋 [fetchOpenOrders] Order ${index + 1}:`, {
          id: order.id,
          symbol: order.symbol,
          type: order.type,
          side: order.side,
          amount: order.amount,
          price: order.price,
          status: order.status,
          timestamp: order.timestamp,
          datetime: order.datetime,
          filled: order.filled,
          remaining: order.remaining,
          average: order.average,
          fee: order.fee,
          info: order.info
        });
      });
      
      return orders;
      
    } catch (error) {
      console.error(`❌ [fetchOpenOrders] Failed to load open orders for account ${accountId}:`, error);
      console.error(`❌ [fetchOpenOrders] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        accountId,
        exchange: account.exchange
      });
      throw error;
    }
  },

  fetchPositions: async (accountId: string, symbols?: string[]): Promise<any[]> => {
    const { useUserStore } = await import('../userStore');
    const { users } = useUserStore.getState();
    const user = users.find(u => u.accounts.some(acc => acc.id === accountId));
    const account = user?.accounts.find(acc => acc.id === accountId);
    
    if (!account || !account.key || !account.privateKey) {
      throw new Error(`Account ${accountId} not found or missing API keys`);
    }
    
    console.log(`🔄 [fetchPositions] Loading positions for account ${accountId} (${account.exchange})`);
    
    try {
      const ccxt = getCCXT();
      if (!ccxt) {
        throw new Error('CCXT not available');
      }
      
      const ExchangeClass = ccxt[account.exchange];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${account.exchange} not found in CCXT`);
      }
      
             const exchangeInstance = new ExchangeClass({
         apiKey: account.key,
         secret: account.privateKey,
         password: account.password,
         sandbox: false,
         enableRateLimit: true,
       });
      
      await exchangeInstance.loadMarkets();
      
      // Check if exchange supports positions
      if (!exchangeInstance.has.fetchPositions) {
        console.warn(`⚠️ [fetchPositions] Exchange ${account.exchange} does not support positions`);
        return [];
      }
      
      const positions = await exchangeInstance.fetchPositions(symbols);
      
      console.log(`✅ [fetchPositions] Loaded ${positions.length} positions for account ${accountId}`);
      
      return positions;
      
    } catch (error) {
      console.error(`❌ [fetchPositions] Failed to load positions for account ${accountId}:`, error);
      throw error;
    }
     }
 });