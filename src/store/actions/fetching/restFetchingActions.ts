import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../../types';
import type { DataProvider, DataType, Timeframe, MarketType, WalletType } from '../../../types/dataProviders';
import { getCCXT } from '../../utils/ccxtUtils';
import { createExchangeInstance } from '../../utils/providerUtils';
import { getOHLCVLimit, getTradesLimit, logExchangeLimits } from '../../../utils/exchangeLimits';

export interface RestFetchingActions {
  startRestFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  fetchBalance: (accountId: string, walletType: WalletType) => Promise<void>;
}

// Helper: transform CCXT balance to our format
const transformBalance = (balanceData: any) => {
  const balances = Object.entries(balanceData)
    .filter(([c, d]: [string, any]) => c !== 'info' && c !== 'datetime' && c !== 'timestamp' && d && typeof d === 'object' && (d.total > 0 || d.free > 0 || d.used > 0))
    .map(([c, d]: [string, any]) => ({ currency: c, free: d.free || 0, used: d.used || 0, total: d.total || 0 }));
  return { timestamp: balanceData.timestamp || Date.now(), balances, info: balanceData.info };
};

export const createRestFetchingActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  RestFetchingActions
> = (set, get) => ({
  startRestFetching: async (exchange, symbol, dataType, provider, timeframe = '1m', market = 'spot') => {
    if (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server') return;
    const ccxt = getCCXT();
    if (!ccxt) return;

    let exchangeInstance: any;
    if (provider.type === 'ccxt-browser') {
      const { createCCXTBrowserProvider } = await import('../../providers/ccxtBrowserProvider');
      exchangeInstance = await createCCXTBrowserProvider(provider).getMetadataInstance(exchange, market, false);
    } else if (provider.type === 'ccxt-server') {
      const { createCCXTServerProvider } = await import('../../providers/ccxtServerProvider');
      exchangeInstance = await createCCXTServerProvider(provider).getMetadataInstance(exchange, market, false);
    } else {
      exchangeInstance = createExchangeInstance(exchange, provider, ccxt);
    }

    const subscriptionKey = get().getSubscriptionKey(exchange, symbol, dataType, timeframe, market);
    const interval = get().dataFetchSettings.restIntervals[dataType];

    const fetchData = async () => {
      try {
        const sub = get().activeSubscriptions[subscriptionKey];
        if (!sub?.isActive) return;

        switch (dataType) {
          case 'candles': {
            const limit = getOHLCVLimit(exchange);
            logExchangeLimits(exchange, limit, 'ohlcv');
            const candles = await exchangeInstance.fetchOHLCV(symbol, timeframe, undefined, limit);
            if (candles?.length > 0) {
              get().updateCandles(exchange, symbol, candles.map((c: any[]) => ({
                timestamp: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
              })), timeframe, market);
            }
            break;
          }
          case 'trades': {
            const sub = get().activeSubscriptions[subscriptionKey];
            const isAggregated = sub?.config?.isAggregated ?? true;
            const configLimit = sub?.config?.tradesLimit;
            const tradeLimit = configLimit ? Math.min(configLimit, getTradesLimit(exchange)) : getTradesLimit(exchange);
            logExchangeLimits(exchange, tradeLimit, 'trades');
            const fetchTradesMethod = isAggregated
              ? (exchange === 'binance' ? 'publicGetAggTrades' : undefined)
              : 'publicGetTrades';
            const trades = await exchangeInstance.fetchTrades(symbol, undefined, tradeLimit, fetchTradesMethod ? { fetchTradesMethod } : {});
            if (trades?.length > 0) get().updateTrades(exchange, symbol, trades, market);
            break;
          }
          case 'orderbook': {
            const orderbook = await exchangeInstance.fetchOrderBook(symbol);
            if (orderbook) get().updateOrderBook(exchange, symbol, orderbook, market);
            break;
          }
          case 'balance': {
            const walletType = market as WalletType;
            if (walletType === 'futures') exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'future' };
            else if (walletType === 'margin') exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'margin' };
            else if (walletType === 'spot') exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'spot' };

            let balanceData;
            try {
              if (walletType === 'funding') {
                if (exchange.toLowerCase() === 'bybit') {
                  try {
                    const resp = await exchangeInstance.privateGetV5AssetBalanceAllBalance();
                    balanceData = { info: resp };
                    resp?.result?.list?.forEach((acct: any) => {
                      if (acct.accountType === 'FUNDING' && acct.coin) {
                        acct.coin.forEach((c: any) => {
                          if (c.walletBalance && parseFloat(c.walletBalance) > 0) {
                            balanceData[c.coin] = { free: parseFloat(c.walletBalance || '0'), used: 0, total: parseFloat(c.walletBalance || '0') };
                          }
                        });
                      }
                    });
                  } catch { balanceData = await exchangeInstance.fetchBalance({ type: 'funding' }); }
                } else {
                  balanceData = await exchangeInstance.fetchBalance({ type: 'funding' });
                }
              } else {
                balanceData = await exchangeInstance.fetchBalance();
              }
            } catch {
              balanceData = await exchangeInstance.fetchBalance();
            }

            if (balanceData) get().updateBalance(exchange, transformBalance(balanceData), walletType);
            break;
          }
        }
      } catch (error) {
        console.error(`REST fetch error for ${subscriptionKey}:`, error);
      }
    };

    await fetchData();
    const intervalId = setInterval(fetchData, interval) as any;
    set(state => {
      if (state.activeSubscriptions[subscriptionKey]) {
        state.activeSubscriptions[subscriptionKey].intervalId = intervalId;
      }
    });
  },

  fetchBalance: async (accountId, walletType = 'trading') => {
    const { useUserStore } = await import('../../userStore');
    const userStore = useUserStore.getState();

    let account: any = null;
    for (const user of userStore.users) {
      account = user.accounts.find(acc => acc.id === accountId);
      if (account) break;
    }
    if (!account) return;

    const provider = get().getProviderForExchange(account.exchange);
    if (!provider || (provider.type !== 'ccxt-browser' && provider.type !== 'ccxt-server')) return;

    const ccxt = getCCXT();
    if (!ccxt) return;

    try {
      const exchangeInstance = createExchangeInstance(account.exchange, provider, ccxt);
      if (walletType === 'futures') exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'future' };
      else if (walletType === 'margin') exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'margin' };
      else if (walletType === 'spot') exchangeInstance.options = { ...exchangeInstance.options, defaultType: 'spot' };

      let balanceData;
      if (walletType === 'funding') {
        if (account.exchange === 'bybit') {
          try { balanceData = await exchangeInstance.fetchBalance({ type: 'funding' }); }
          catch {
            if (exchangeInstance.has?.fetchFundingBalance) {
              try { balanceData = await exchangeInstance.fetchFundingBalance(); } catch { return; }
            }
          }
        } else if (exchangeInstance.has?.fetchFundingBalance) {
          try { balanceData = await exchangeInstance.fetchFundingBalance(); } catch { return; }
        } else { return; }
      } else {
        balanceData = await exchangeInstance.fetchBalance();
      }

      if (!balanceData) return;
      get().updateBalance(accountId, transformBalance(balanceData), walletType);
    } catch (error) {
      console.error(`Balance error for account ${accountId}:`, error);
    }
  },
});
