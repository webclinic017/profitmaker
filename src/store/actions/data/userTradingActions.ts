import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../../types';
import type { Trade } from '../../../types/dataProviders';
import { getCCXT } from '../../utils/ccxtUtils';

export interface UserTradingActions {
  fetchMyTrades: (accountId: string, symbol?: string, since?: number, limit?: number) => Promise<Trade[]>;
  fetchOrders: (accountId: string, symbol?: string, since?: number, limit?: number) => Promise<any[]>;
  fetchOpenOrders: (accountId: string, symbol?: string) => Promise<any[]>;
  fetchPositions: (accountId: string, symbols?: string[]) => Promise<any[]>;
}

// Helper: get account from userStore
const getAccount = async (accountId: string) => {
  const { useUserStore } = await import('../../userStore');
  const { users } = useUserStore.getState();
  for (const user of users) {
    const account = user.accounts.find(acc => acc.id === accountId);
    if (account) return account;
  }
  return null;
};

// Helper: get account config
const getAccountConfig = (account: any) => ({
  accountId: account.id,
  exchange: account.exchange,
  apiKey: account.key,
  secret: account.privateKey,
  password: account.password,
  sandbox: false,
});

// Helper: fetch data across multiple market categories
const fetchAcrossMarkets = async (
  get: () => DataProviderStore,
  accountConfig: any,
  exchange: string,
  fetchFn: (instance: any, category: string) => Promise<any[]>,
  defaultCategories = ['spot', 'futures']
): Promise<any[]> => {
  const supportedMarkets = await get().getMarketsForExchange(exchange);
  const { ccxtAccountManager } = await import('../../utils/ccxtAccountManager');
  let allResults: any[] = [];

  const categories = supportedMarkets.length > 0 ? supportedMarkets : defaultCategories;

  if (exchange === 'bybit') {
    const bybitCategories = ['linear', 'spot'];
    for (const category of bybitCategories) {
      try {
        const instance = await ccxtAccountManager.getRegularInstance(
          accountConfig,
          category === 'linear' ? 'futures' : 'spot'
        );
        const results = await fetchFn(instance, category);
        allResults.push(...results);
      } catch { continue; }
    }
  } else {
    for (const category of categories) {
      try {
        const instance = await ccxtAccountManager.getRegularInstance(accountConfig, category);
        const results = await fetchFn(instance, category);
        allResults.push(...results);
      } catch { continue; }
    }
  }

  return allResults;
};

export const createUserTradingActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  UserTradingActions
> = (set, get) => ({
  fetchMyTrades: async (accountId, symbol, since, limit) => {
    const account = await getAccount(accountId);
    if (!account?.key || !account?.privateKey) {
      throw new Error(`Account ${accountId} not found or missing API keys`);
    }

    const accountConfig = getAccountConfig(account);
    const allTrades = await fetchAcrossMarkets(
      get,
      accountConfig,
      account.exchange,
      async (instance, category) => {
        if (!instance.has.fetchMyTrades) return [];
        try {
          return await instance.fetchMyTrades(symbol, since, limit);
        } catch {
          if (!symbol && account.exchange === 'bybit') {
            const results: any[] = [];
            for (const s of ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT']) {
              try {
                results.push(...await instance.fetchMyTrades(s, since, Math.min(limit || 100, 20)));
              } catch { continue; }
            }
            return results;
          }
          return [];
        }
      }
    );

    const uniqueTrades = allTrades
      .filter((trade, i, self) => i === self.findIndex(t => t.id === trade.id))
      .sort((a, b) => b.timestamp - a.timestamp);

    return uniqueTrades.map((trade: any) => ({
      id: trade.id, timestamp: trade.timestamp, symbol: trade.symbol,
      side: trade.side, amount: trade.amount, price: trade.price,
      cost: trade.cost, fee: trade.fee, info: trade.info,
    }));
  },

  fetchOrders: async (accountId, symbol, since, limit) => {
    const account = await getAccount(accountId);
    if (!account?.key || !account?.privateKey) {
      throw new Error(`Account ${accountId} not found or missing API keys`);
    }

    const accountConfig = getAccountConfig(account);
    const { ccxtAccountManager } = await import('../../utils/ccxtAccountManager');

    const allOrders = await fetchAcrossMarkets(
      get,
      accountConfig,
      account.exchange,
      async (instance, category) => {
        let marketOrders: any[] = [];

        if (instance.has.fetchOrders) {
          try {
            marketOrders = await instance.fetchOrders(symbol, since, limit);
          } catch {
            // Fallback to open + closed + canceled
            if (instance.has.fetchOpenOrders) {
              try { marketOrders.push(...await instance.fetchOpenOrders(symbol)); } catch {}
            }
            if (instance.has.fetchClosedOrders) {
              try { marketOrders.push(...await instance.fetchClosedOrders(symbol, since, limit)); } catch {}
            }
            if (instance.has.fetchCanceledOrders) {
              try { marketOrders.push(...await instance.fetchCanceledOrders(symbol, since, limit)); } catch {}
            }
          }
        } else {
          if (instance.has.fetchOpenOrders) {
            try { marketOrders.push(...await instance.fetchOpenOrders(symbol)); } catch {}
          }
          if (instance.has.fetchClosedOrders) {
            try { marketOrders.push(...await instance.fetchClosedOrders(symbol, since, limit)); } catch {}
          }
        }
        return marketOrders;
      }
    );

    return allOrders
      .filter((order, i, self) => i === self.findIndex(o => o.id === order.id))
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  fetchOpenOrders: async (accountId, symbol) => {
    const account = await getAccount(accountId);
    if (!account?.key || !account?.privateKey) {
      throw new Error(`Account ${accountId} not found or missing API keys`);
    }

    const accountConfig = getAccountConfig(account);
    const allOrders = await fetchAcrossMarkets(
      get,
      accountConfig,
      account.exchange,
      async (instance) => {
        if (!instance.has.fetchOpenOrders) return [];
        return await instance.fetchOpenOrders(symbol);
      }
    );

    return allOrders
      .filter((order, i, self) => i === self.findIndex(o => o.id === order.id))
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  fetchPositions: async (accountId, symbols) => {
    const account = await getAccount(accountId);
    if (!account?.key || !account?.privateKey) {
      throw new Error(`Account ${accountId} not found or missing API keys`);
    }

    const { ccxtAccountManager } = await import('../../utils/ccxtAccountManager');
    const accountConfig = getAccountConfig(account);
    const supportedMarkets = await get().getMarketsForExchange(account.exchange);
    const positionMarkets = supportedMarkets.filter(m => m === 'futures' || m === 'swap');
    const categories = positionMarkets.length > 0 ? positionMarkets : ['futures'];

    let allPositions: any[] = [];
    for (const category of categories) {
      try {
        const instance = await ccxtAccountManager.getRegularInstance(accountConfig, category);
        if (!instance.has.fetchPositions) continue;
        const positions = await instance.fetchPositions(symbols);
        allPositions.push(...positions);
      } catch { continue; }
    }

    return allPositions.filter((pos, i, self) =>
      i === self.findIndex(p => p.symbol === pos.symbol && p.side === pos.side)
    );
  },
});
