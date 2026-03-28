import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../../types';
import type { Candle, Trade, OrderBook, Ticker, ExchangeBalances, ActiveSubscription, Timeframe, MarketType, WalletType, DataType } from '../../../types/dataProviders';

export interface DataGetterActions {
  getCandles: (exchange: string, symbol: string, timeframe?: Timeframe, market?: MarketType) => Candle[];
  getTrades: (exchange: string, symbol: string, market?: MarketType) => Trade[];
  getOrderBook: (exchange: string, symbol: string, market?: MarketType) => OrderBook | null;
  getBalance: (accountId: string, walletType?: WalletType) => ExchangeBalances | null;
  getTicker: (exchange: string, symbol: string, market?: MarketType, maxAge?: number) => Ticker | null;
  getTickerWithRefresh: (exchange: string, symbol: string, market?: MarketType, forceRefresh?: boolean) => Promise<Ticker | null>;
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType) => string;
  getActiveSubscriptionsList: () => ActiveSubscription[];
}

export const createDataGetterActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  DataGetterActions
> = (set, get) => ({
  getCandles: (exchange: string, symbol: string, timeframe: Timeframe = '1m', market: MarketType = 'spot'): Candle[] => {
    return get().marketData.candles[exchange]?.[market]?.[symbol]?.[timeframe] || [];
  },

  getTrades: (exchange: string, symbol: string, market: MarketType = 'spot'): Trade[] => {
    return get().marketData.trades[exchange]?.[market]?.[symbol] || [];
  },

  getOrderBook: (exchange: string, symbol: string, market: MarketType = 'spot'): OrderBook | null => {
    return get().marketData.orderbook[exchange]?.[market]?.[symbol] || null;
  },

  getBalance: (accountId: string, walletType?: WalletType): ExchangeBalances | null => {
    const effectiveWalletType = walletType || 'trading';
    return get().marketData.balance[accountId]?.[effectiveWalletType] || null;
  },

  getTicker: (exchange: string, symbol: string, market: MarketType = 'spot', maxAge = 600000): Ticker | null => {
    const tickerData = get().marketData.ticker[exchange]?.[market]?.[symbol];
    if (!tickerData) return null;
    if (Date.now() - tickerData.lastUpdate > maxAge) return null;
    return {
      symbol: tickerData.symbol,
      timestamp: tickerData.timestamp,
      bid: tickerData.bid,
      ask: tickerData.ask,
      last: tickerData.last,
      close: tickerData.close,
      midPrice: tickerData.midPrice,
    };
  },

  getTickerWithRefresh: async (exchange: string, symbol: string, market = 'spot' as MarketType, forceRefresh = false): Promise<Ticker | null> => {
    const maxAge = 600000;
    if (!forceRefresh) {
      const cached = get().getTicker(exchange, symbol, market, maxAge);
      if (cached) return cached;
    }
    try {
      return await get().initializeTickerData(exchange, symbol, market);
    } catch {
      const cached = get().getTicker(exchange, symbol, market, Infinity);
      return cached || null;
    }
  },

  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market: MarketType = 'spot'): string => {
    let key = `${exchange}:${market}:${symbol}:${dataType}`;
    if (dataType === 'candles' && timeframe) key += `:${timeframe}`;
    return key;
  },

  getActiveSubscriptionsList: (): ActiveSubscription[] => {
    return Object.values(get().activeSubscriptions);
  },
});
