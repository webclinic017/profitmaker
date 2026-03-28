import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../../types';
import type { Candle, Trade, OrderBook, Ticker, ExchangeBalances, Timeframe, MarketType, WalletType } from '../../../types/dataProviders';

export interface DataUpdaterActions {
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe?: Timeframe, market?: MarketType) => void;
  updateTrades: (exchange: string, symbol: string, trades: Trade[], market?: MarketType) => void;
  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market?: MarketType) => void;
  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => void;
  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market?: MarketType) => void;
}

export const createDataUpdaterActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  DataUpdaterActions
> = (set, get) => ({
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe: Timeframe = '1m', market: MarketType = 'spot') => {
    let eventType: 'initial_load' | 'new_candles' | 'update_last_candle' = 'new_candles';
    let eventData: any = {};

    set(state => {
      if (!state.marketData.candles[exchange]) state.marketData.candles[exchange] = {};
      if (!state.marketData.candles[exchange][market]) state.marketData.candles[exchange][market] = {};
      if (!state.marketData.candles[exchange][market][symbol]) state.marketData.candles[exchange][market][symbol] = {};

      const existing = state.marketData.candles[exchange][market][symbol][timeframe] || [];

      if (existing.length === 0) {
        state.marketData.candles[exchange][market][symbol][timeframe] = candles;
        eventType = 'initial_load';
        eventData = { totalCandles: candles.length, newCandles: candles };
      } else {
        const candleMap = new Map<number, Candle>();
        existing.forEach(c => candleMap.set(c.timestamp, c));

        const lastExistingTime = existing[existing.length - 1]?.timestamp || 0;
        const newCandlesCount = candles.filter(c => c.timestamp > lastExistingTime).length;
        const hasUpdatedLastCandle = candles.some(c => c.timestamp === lastExistingTime);

        candles.forEach(c => candleMap.set(c.timestamp, c));
        const mergedCandles = Array.from(candleMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        state.marketData.candles[exchange][market][symbol][timeframe] = mergedCandles;

        if (newCandlesCount > 0) {
          eventType = 'new_candles';
          eventData = { newCandlesCount, newCandles: candles.filter(c => c.timestamp > lastExistingTime), totalCandles: mergedCandles.length };
        } else if (hasUpdatedLastCandle) {
          eventType = 'update_last_candle';
          eventData = { lastCandle: candles.find(c => c.timestamp === lastExistingTime), totalCandles: mergedCandles.length };
        }
      }

      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'candles', timeframe, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });

    get().emitChartUpdateEvent({
      type: eventType,
      exchange,
      symbol,
      timeframe,
      market,
      data: eventData,
      timestamp: Date.now(),
    });
  },

  updateTrades: (exchange: string, symbol: string, trades: Trade[], market: MarketType = 'spot') => {
    set(state => {
      if (!state.marketData.trades[exchange]) state.marketData.trades[exchange] = {};
      if (!state.marketData.trades[exchange][market]) state.marketData.trades[exchange][market] = {};

      const existing = state.marketData.trades[exchange][market][symbol] || [];
      const combined = [...existing, ...trades];
      state.marketData.trades[exchange][market][symbol] = combined.slice(-1000);

      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'trades', undefined, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market: MarketType = 'spot') => {
    set(state => {
      if (!state.marketData.orderbook[exchange]) state.marketData.orderbook[exchange] = {};
      if (!state.marketData.orderbook[exchange][market]) state.marketData.orderbook[exchange][market] = {};
      state.marketData.orderbook[exchange][market][symbol] = orderbook;

      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'orderbook', undefined, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  updateBalance: (accountId: string, balance: ExchangeBalances, walletType?: WalletType) => {
    const effectiveWalletType = walletType || 'trading';
    set(state => {
      if (!state.marketData.balance[accountId]) state.marketData.balance[accountId] = {};
      state.marketData.balance[accountId][effectiveWalletType] = balance;

      const subscriptionKey = get().getSubscriptionKey('', accountId, 'balance', undefined, effectiveWalletType as MarketType);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },

  updateTicker: (exchange: string, symbol: string, ticker: Ticker, market: MarketType = 'spot') => {
    set(state => {
      if (!state.marketData.ticker[exchange]) state.marketData.ticker[exchange] = {};
      if (!state.marketData.ticker[exchange][market]) state.marketData.ticker[exchange][market] = {};
      state.marketData.ticker[exchange][market][symbol] = { ...ticker, lastUpdate: Date.now() };

      const subscriptionKey = get().getSubscriptionKey(exchange, symbol, 'ticker', undefined, market);
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].lastUpdate = Date.now();
      }
    });
  },
});
