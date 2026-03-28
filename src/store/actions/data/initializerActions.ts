import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../../types';
import type { Candle, Trade, OrderBook, Ticker, ExchangeBalances, Timeframe, MarketType, WalletType, DataProvider } from '../../../types/dataProviders';
import { getCCXT } from '../../utils/ccxtUtils';
import { getOHLCVLimit, getTradesLimit, logExchangeLimits } from '../../../utils/exchangeLimits';

const createExchangeInstanceForProvider = async (
  provider: DataProvider,
  exchange: string,
  market: MarketType = 'spot',
  sandbox: boolean = false
): Promise<any> => {
  if (provider.type === 'ccxt-browser') {
    const { createCCXTBrowserProvider } = await import('../../providers/ccxtBrowserProvider');
    return await createCCXTBrowserProvider(provider).getMetadataInstance(exchange, market, sandbox);
  } else if (provider.type === 'ccxt-server') {
    const { createCCXTServerProvider } = await import('../../providers/ccxtServerProvider');
    return await createCCXTServerProvider(provider).getMetadataInstance(exchange, market, sandbox);
  }
  throw new Error(`Unsupported provider type: ${provider.type}`);
};

export interface DataInitializerActions {
  initializeChartData: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType) => Promise<Candle[]>;
  initializeTradesData: (exchange: string, symbol: string, market: MarketType, limit?: number, aggregated?: boolean) => Promise<Trade[]>;
  initializeOrderBookData: (exchange: string, symbol: string, market: MarketType) => Promise<OrderBook>;
  initializeBalanceData: (accountId: string, walletType: WalletType) => Promise<ExchangeBalances>;
  initializeTickerData: (exchange: string, symbol: string, market: MarketType) => Promise<Ticker>;
  loadHistoricalCandles: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, beforeTimestamp: number) => Promise<Candle[]>;
}

export const createDataInitializerActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  DataInitializerActions
> = (set, get) => ({
  initializeChartData: async (exchange, symbol, timeframe, market) => {
    const provider = get().getProviderForExchange(exchange);
    if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) {
      throw new Error(`No suitable CCXT provider found for exchange: ${exchange}`);
    }

    const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);
    const optimalLimit = getOHLCVLimit(exchange);
    logExchangeLimits(exchange, optimalLimit, 'ohlcv');

    const ohlcvData = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, optimalLimit);
    if (!ohlcvData || ohlcvData.length === 0) throw new Error('No data received from exchange');

    return ohlcvData.map((c: any[]) => ({
      timestamp: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
    }));
  },

  initializeTradesData: async (exchange, symbol, market, limit = 500, aggregated = true) => {
    const provider = get().getProviderForExchange(exchange);
    if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) {
      throw new Error(`No suitable CCXT provider found for exchange: ${exchange}`);
    }

    const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);
    const fetchTradesMethod = aggregated
      ? (exchange === 'binance' ? 'publicGetAggTrades' : 'fetchTrades')
      : 'publicGetTrades';
    const effectiveLimit = Math.min(limit, getTradesLimit(exchange));
    logExchangeLimits(exchange, effectiveLimit, 'trades');

    const tradesData = await exchangeInstance.fetchTrades(symbol, undefined, effectiveLimit, { fetchTradesMethod });
    if (!tradesData || tradesData.length === 0) return [];

    get().updateTrades(exchange, symbol, tradesData, market);
    return tradesData;
  },

  initializeOrderBookData: async (exchange, symbol, market) => {
    const ccxt = getCCXT();
    if (!ccxt) throw new Error('CCXT not available');

    const ExchangeClass = ccxt[exchange];
    if (!ExchangeClass) throw new Error(`Exchange ${exchange} not found in CCXT`);

    let defaultType: string = market;
    if (exchange === 'bybit') {
      const bybitMap: Record<string, string> = { spot: 'spot', futures: 'linear', swap: 'linear', margin: 'spot', options: 'option' };
      defaultType = bybitMap[market] || market;
    }

    const exchangeInstance = new ExchangeClass({ sandbox: false, enableRateLimit: true, defaultType });
    const { wrapExchangeWithLogger } = await import('../../../utils/requestLogger');
    const loggedInstance = wrapExchangeWithLogger(exchangeInstance, exchange, 'public-orderbook');

    await loggedInstance.loadMarkets();
    const orderbookData = await loggedInstance.fetchOrderBook(symbol);

    if (!orderbookData?.bids || !orderbookData?.asks || !Array.isArray(orderbookData.bids) || !Array.isArray(orderbookData.asks)) {
      throw new Error('Invalid orderbook data format received');
    }

    get().updateOrderBook(exchange, symbol, orderbookData, market);
    return orderbookData;
  },

  initializeBalanceData: async (accountId, walletType) => {
    const { useUserStore } = await import('../../userStore');
    const userStore = useUserStore.getState();

    let account: any = null;
    for (const user of userStore.users) {
      account = user.accounts.find(acc => acc.id === accountId);
      if (account) break;
    }
    if (!account) throw new Error(`Account with ID ${accountId} not found`);

    const { ccxtAccountManager } = await import('../../utils/ccxtAccountManager');
    const config = {
      accountId, exchange: account.exchange, apiKey: account.key,
      secret: account.privateKey, password: account.password || undefined,
      sandbox: account.sandbox || false, marketType: walletType,
    };

    const exchangeInstance = await ccxtAccountManager.getRegularInstance(config);
    if (walletType === 'futures') { exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'future' }; }
    else if (walletType === 'margin') { exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'margin' }; }
    else if (walletType === 'spot') { exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'spot' }; }

    let balanceData = await exchangeInstance.fetchBalance();

    if (exchangeInstance.has?.fetchFundingBalance) {
      try {
        const fundingBalance = await exchangeInstance.fetchFundingBalance();
        if (fundingBalance && typeof fundingBalance === 'object') {
          Object.entries(fundingBalance).forEach(([currency, data]: [string, any]) => {
            if (currency !== 'info' && currency !== 'datetime' && currency !== 'timestamp' && data && typeof data === 'object') {
              if (balanceData[currency]) { balanceData[currency].funding = data; }
              else { balanceData[currency] = { free: 0, used: 0, total: 0, funding: data }; }
            }
          });
        }
      } catch { /* funding balance not critical */ }
    }

    if (!balanceData) throw new Error('No balance data received from exchange');

    const balances = Object.entries(balanceData)
      .filter(([currency, data]: [string, any]) =>
        currency !== 'info' && currency !== 'datetime' && currency !== 'timestamp' &&
        data && typeof data === 'object' && (data.total > 0 || data.free > 0 || data.used > 0)
      )
      .map(([currency, data]: [string, any]) => ({
        currency, free: data.free || 0, used: data.used || 0, total: data.total || 0,
      }));

    const exchangeBalances = { timestamp: balanceData.timestamp || Date.now(), balances, info: balanceData.info };
    get().updateBalance(accountId, exchangeBalances, walletType);
    return exchangeBalances;
  },

  initializeTickerData: async (exchange, symbol, market) => {
    const provider = get().getProviderForExchange(exchange);
    if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) {
      throw new Error(`No suitable CCXT provider found for exchange: ${exchange}`);
    }

    const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);
    const tickerData = await exchangeInstance.fetchTicker(symbol);
    if (!tickerData) throw new Error('No ticker data received from exchange');

    const ticker: Ticker = {
      symbol: tickerData.symbol,
      timestamp: tickerData.timestamp || Date.now(),
      bid: tickerData.bid || 0,
      ask: tickerData.ask || 0,
      last: tickerData.last,
      close: tickerData.close,
      midPrice: tickerData.bid && tickerData.ask ? (tickerData.bid + tickerData.ask) / 2 : undefined,
    };

    get().updateTicker(exchange, symbol, ticker, market);
    return ticker;
  },

  loadHistoricalCandles: async (exchange, symbol, timeframe, market, beforeTimestamp) => {
    const provider = get().getProviderForExchange(exchange);
    if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) {
      throw new Error(`No suitable CCXT provider found for exchange: ${exchange}`);
    }

    const exchangeInstance = await createExchangeInstanceForProvider(provider, exchange, market, false);
    const optimalLimit = getOHLCVLimit(exchange);
    logExchangeLimits(exchange, optimalLimit, 'ohlcv');

    const timeframeToMs = (tf: string): number => {
      const unit = tf.slice(-1);
      const value = parseInt(tf.slice(0, -1)) || 1;
      switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 60 * 1000;
      }
    };

    const sinceTimestamp = beforeTimestamp - (optimalLimit * timeframeToMs(timeframe));
    const ohlcvData = await exchangeInstance.fetchOHLCV(symbol, timeframe, sinceTimestamp, optimalLimit);

    if (!ohlcvData || ohlcvData.length === 0) return [];

    return ohlcvData
      .filter((c: any[]) => c[0] < beforeTimestamp)
      .map((c: any[]) => ({
        timestamp: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  },
});
