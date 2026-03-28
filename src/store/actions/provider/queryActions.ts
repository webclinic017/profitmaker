import type { StateCreator } from 'zustand';
import type { DataProvider, ProviderExchangeMapping, Timeframe } from '../../../types/dataProviders';
import type { DataProviderStore } from '../../types';
import { selectOptimalProvider, createProviderExchangeMappings } from '../../utils/providerUtils';
import { useUserStore } from '../../userStore';
import { createCCXTBrowserProvider } from '../../providers/ccxtBrowserProvider';
import { getCCXT } from '../../utils/ccxtUtils';

export interface ProviderQueryActions {
  getProviderForExchange: (exchange: string) => DataProvider | null;
  getProviderExchangeMappings: (exchanges: string[]) => ProviderExchangeMapping[];
  getSymbolsForExchange: (exchange: string, limit?: number, marketType?: string) => Promise<string[]>;
  getMarketsForExchange: (exchange: string) => Promise<string[]>;
  getAllSupportedExchanges: () => string[];
  getTimeframesForExchange: (exchange: string) => Timeframe[];
}

function getTimeframesFromCCXT(exchange: string): Timeframe[] {
  try {
    const ccxt = getCCXT();
    if (!ccxt) return [];
    const ExchangeClass = ccxt[exchange];
    if (!ExchangeClass) return [];
    const tempInstance = new ExchangeClass();
    if (!tempInstance.timeframes) return [];

    const mapping: Record<string, Timeframe> = {
      '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '12h': '12h',
      '1d': '1d', '1w': '1w', '1M': '1M',
    };

    return Object.keys(tempInstance.timeframes)
      .map(tf => mapping[tf])
      .filter(Boolean) as Timeframe[];
  } catch {
    return [];
  }
}

export const createProviderQueryActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  ProviderQueryActions
> = (set, get) => ({
  getProviderForExchange: (exchange) => {
    const enabled = Object.values(get().providers).filter(p => p.status === 'connected');
    return selectOptimalProvider(enabled, exchange);
  },

  getProviderExchangeMappings: (exchanges) => {
    const enabled = Object.values(get().providers).filter(p => p.status === 'connected');
    const activeUser = useUserStore.getState().users.find(u => u.id === useUserStore.getState().activeUserId) || null;
    return createProviderExchangeMappings(enabled, exchanges, activeUser);
  },

  getSymbolsForExchange: async (exchange, limit, marketType) => {
    const provider = get().getProviderForExchange(exchange);
    if (!provider) return [];

    switch (provider.type) {
      case 'ccxt-browser':
        return await createCCXTBrowserProvider(provider).getSymbolsForExchange(exchange, limit, marketType);
      case 'ccxt-server':
        return ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
      case 'marketmaker.cc':
      case 'custom-server-with-adapter':
        return ['BTC/USDT', 'ETH/USDT'];
      default:
        return [];
    }
  },

  getMarketsForExchange: async (exchange) => {
    const provider = get().getProviderForExchange(exchange);
    if (!provider) return ['spot'];

    switch (provider.type) {
      case 'ccxt-browser':
        return await createCCXTBrowserProvider(provider).getMarketsForExchange(exchange);
      case 'ccxt-server':
        return ['spot', 'futures', 'margin'];
      case 'marketmaker.cc':
        return ['spot', 'futures'];
      case 'custom-server-with-adapter':
        return ['spot'];
      default:
        return ['spot'];
    }
  },

  getAllSupportedExchanges: () => {
    const enabled = Object.values(get().providers).filter(p => p.status === 'connected');
    const allExchanges = new Set<string>();

    enabled.forEach(provider => {
      if (provider.exchanges.includes('*')) {
        ['binance', 'bybit', 'okx', 'kucoin', 'coinbase', 'bitget', 'kraken', 'huobi',
          'gate', 'mexc', 'probit', 'whitebit', 'bingx', 'phemex', 'deribit', 'ftx'].forEach(e => allExchanges.add(e));
      } else {
        provider.exchanges.forEach(e => allExchanges.add(e));
      }
    });

    return Array.from(allExchanges).sort();
  },

  getTimeframesForExchange: (exchange) => {
    const DEFAULT: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
    try {
      const timeframes = getTimeframesFromCCXT(exchange);
      return timeframes.length > 0 ? timeframes : DEFAULT;
    } catch {
      return DEFAULT;
    }
  },
});
