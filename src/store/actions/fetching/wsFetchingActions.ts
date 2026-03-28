import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../../types';
import type { DataProvider, DataType, Timeframe, MarketType } from '../../../types/dataProviders';
import { getCCXT, getCCXTPro } from '../../utils/ccxtUtils';
import { createExchangeInstance } from '../../utils/providerUtils';
import { getOHLCVLimit, logExchangeLimits } from '../../../utils/exchangeLimits';

export interface WsFetchingActions {
  startWebSocketFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
}

export const createWsFetchingActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  WsFetchingActions
> = (set, get) => ({
  startWebSocketFetching: async (exchange, symbol, dataType, provider, timeframe = '1m', market = 'spot') => {
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') return;

    const ccxtPro = getCCXTPro();
    if (!ccxtPro) {
      await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
      return;
    }

    let exchangeInstance: any;
    if (provider.type === 'ccxt-browser') {
      const { createCCXTBrowserProvider } = await import('../../providers/ccxtBrowserProvider');
      exchangeInstance = await createCCXTBrowserProvider(provider).getWebSocketInstance(exchange, market, false);
    } else if (provider.type === 'ccxt-server') {
      const { createCCXTServerProvider } = await import('../../providers/ccxtServerProvider');
      exchangeInstance = await createCCXTServerProvider(provider).getWebSocketInstance(exchange, market, false);
    } else {
      exchangeInstance = createExchangeInstance(exchange, provider, ccxtPro);
    }

    const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);

    // Check WebSocket support
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
      case 'orderbook': {
        const methodSelection = get().selectOptimalOrderBookMethod(exchange, exchangeInstance);
        watchMethod = methodSelection.selectedMethod;
        hasSupport = methodSelection.selectedMethod !== 'fetchOrderBook';
        set(state => {
          if (state.activeSubscriptions[subscriptionKey]) {
            state.activeSubscriptions[subscriptionKey].ccxtMethod = methodSelection.selectedMethod;
          }
        });
        break;
      }
      case 'balance':
        watchMethod = 'watchBalance';
        hasSupport = !!exchangeInstance.has?.[watchMethod];
        break;
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }

    if (!hasSupport) {
      set(state => {
        if (state.activeSubscriptions[subscriptionKey]) {
          state.activeSubscriptions[subscriptionKey].method = 'rest';
          state.activeSubscriptions[subscriptionKey].isFallback = true;
        }
      });
      await get().startRestFetching(exchange, symbol, dataType, provider, timeframe, market);
      return;
    }

    // Pre-load historical candles via REST
    if (dataType === 'candles') {
      try {
        const ccxt = getCCXT();
        if (ccxt) {
          const restInstance = createExchangeInstance(exchange, provider, ccxt);
          const optimalLimit = getOHLCVLimit(exchange);
          logExchangeLimits(exchange, optimalLimit, 'ohlcv');
          const historicalCandles = await restInstance.fetchOHLCV(symbol, timeframe, undefined, optimalLimit);
          if (historicalCandles?.length > 0) {
            get().updateCandles(exchange, symbol, historicalCandles.map((c: any[]) => ({
              timestamp: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
            })), timeframe, market);
          }
        }
      } catch { /* non-critical */ }
    }

    // WebSocket loop
    const startWebSocketStream = async () => {
      while (true) {
        try {
          const sub = get().activeSubscriptions[subscriptionKey];
          if (!sub?.isActive) break;

          switch (dataType) {
            case 'candles': {
              const candles = await exchangeInstance.watchOHLCV(symbol, timeframe);
              if (candles?.length > 0) {
                get().updateCandles(exchange, symbol, candles.map((c: any[]) => ({
                  timestamp: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
                })), timeframe, market);
              }
              break;
            }
            case 'trades': {
              const trades = await exchangeInstance.watchTrades(symbol);
              if (trades?.length > 0) get().updateTrades(exchange, symbol, trades, market);
              break;
            }
            case 'orderbook': {
              const currentSub = get().activeSubscriptions[subscriptionKey];
              const selectedMethod = currentSub?.ccxtMethod || 'watchOrderBook';
              let orderbook;
              if (selectedMethod === 'watchOrderBookForSymbols') {
                const multi = await exchangeInstance.watchOrderBookForSymbols([symbol]);
                orderbook = multi[symbol];
              } else {
                orderbook = await exchangeInstance.watchOrderBook(symbol);
              }
              if (orderbook) get().updateOrderBook(exchange, symbol, orderbook, market);
              break;
            }
            case 'balance': {
              if (market === 'futures') { exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'future' }; }
              else if (market === 'spot') { exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'spot' }; }
              const balanceData = await exchangeInstance.watchBalance();
              if (balanceData) {
                const balances = Object.entries(balanceData)
                  .filter(([c, d]: [string, any]) => c !== 'info' && c !== 'datetime' && c !== 'timestamp' && d && typeof d === 'object' && (d.total > 0 || d.free > 0 || d.used > 0))
                  .map(([c, d]: [string, any]) => ({ currency: c, free: d.free || 0, used: d.used || 0, total: d.total || 0 }));
                get().updateBalance(exchange, { timestamp: balanceData.timestamp || Date.now(), balances, info: balanceData.info }, market);
              }
              break;
            }
          }
        } catch (error) {
          console.error(`WebSocket error for ${subscriptionKey}:`, error);
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

    startWebSocketStream().catch(console.error);
  },
});
