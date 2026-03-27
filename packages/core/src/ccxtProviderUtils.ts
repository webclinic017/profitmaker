import type { DataType, Timeframe, MarketType } from '@profitmaker/types';

/**
 * Общие утилиты для CCXT провайдеров (browser и server)
 * Унифицированная логика для работы с WebSocket и REST
 */

export interface CCXTInstanceConfig {
  providerId: string;
  userId: string;
  accountId: string;
  exchangeId: string;
  marketType: string;
  ccxtType: 'regular' | 'pro';
  apiKey?: string;
  secret?: string;
  password?: string;
  sandbox?: boolean;
}

export interface WebSocketMethodSelection {
  watchMethod: string;
  hasSupport: boolean;
  fallbackToRest: boolean;
}

/**
 * Определяет оптимальный WebSocket метод для типа данных
 */
export const selectWebSocketMethod = (
  dataType: DataType, 
  exchangeInstance: any
): WebSocketMethodSelection => {
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
      // Используем интеллектуальный выбор метода для orderbook
      if (exchangeInstance.has?.['watchOrderBookForSymbols']) {
        watchMethod = 'watchOrderBookForSymbols';
        hasSupport = true;
      } else if (exchangeInstance.has?.['watchOrderBook']) {
        watchMethod = 'watchOrderBook';
        hasSupport = true;
      } else {
        watchMethod = 'fetchOrderBook';
        hasSupport = false; // REST fallback
      }
      break;
    case 'balance':
      watchMethod = 'watchBalance';
      hasSupport = !!exchangeInstance.has?.[watchMethod];
      break;
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }

  return {
    watchMethod,
    hasSupport,
    fallbackToRest: !hasSupport
  };
};

/**
 * Создает ключ для кэширования CCXT instance
 */
export const createInstanceCacheKey = (config: CCXTInstanceConfig): string => {
  const keyParts = [
    config.exchangeId,
    config.marketType,
    config.ccxtType,
    config.sandbox ? 'sandbox' : 'live'
  ];
  
  if (config.apiKey) {
    keyParts.push(config.apiKey.substring(0, 8)); // First 8 chars for uniqueness
  }
  
  return keyParts.join(':');
};

/**
 * Создает конфигурацию для CCXT instance
 */
export const createCCXTInstanceConfig = (
  providerId: string,
  userId: string,
  accountId: string,
  exchangeId: string,
  marketType: string,
  ccxtType: 'regular' | 'pro',
  credentials?: {
    apiKey?: string;
    secret?: string;
    password?: string;
    sandbox?: boolean;
  }
): CCXTInstanceConfig => {
  return {
    providerId,
    userId,
    accountId,
    exchangeId,
    marketType,
    ccxtType,
    ...credentials
  };
};

/**
 * Форматирует OHLCV данные в стандартный формат
 */
export const formatOHLCVData = (ohlcvArray: any[]): any[] => {
  return ohlcvArray.map((candle: any[]) => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5]
  }));
};

/**
 * Форматирует баланс в стандартный формат
 */
export const formatBalanceData = (balance: any, exchange: string): any => {
  const balances: any[] = [];
  
  if (balance && balance.info) {
    Object.keys(balance).forEach(currency => {
      if (currency !== 'info' && currency !== 'free' && currency !== 'used' && currency !== 'total') {
        const currencyBalance = balance[currency];
        if (currencyBalance && (currencyBalance.total > 0 || currencyBalance.free > 0 || currencyBalance.used > 0)) {
          balances.push({
            currency,
            free: currencyBalance.free || 0,
            used: currencyBalance.used || 0,
            total: currencyBalance.total || 0
          });
        }
      }
    });
  }

  return {
    exchange,
    balances,
    timestamp: Date.now()
  };
};

/**
 * Проверяет валидность кэшированного instance
 */
export const isInstanceCacheValid = (cached: any, ttl: number): boolean => {
  return cached && (Date.now() - cached.timestamp) < ttl;
};

/**
 * Создает конфигурацию для CCXT exchange instance
 */
export const createExchangeInstanceConfig = (
  config: CCXTInstanceConfig,
  additionalOptions: any = {}
): any => {
  const instanceConfig: any = {
    enableRateLimit: true,
    sandbox: config.sandbox || false,
    ...additionalOptions
  };

  // Add credentials if provided
  if (config.apiKey && config.secret) {
    instanceConfig.apiKey = config.apiKey;
    instanceConfig.secret = config.secret;
    if (config.password) {
      instanceConfig.password = config.password;
    }
  }

  // Set market type
  if (config.marketType === 'futures') {
    instanceConfig.defaultType = 'future';
  } else if (config.marketType === 'spot') {
    instanceConfig.defaultType = 'spot';
  }

  return instanceConfig;
};

/**
 * Логирует информацию о создании instance
 */
export const logInstanceCreation = (config: CCXTInstanceConfig, instanceKey: string): void => {
  console.log(`🔍 Creating ${config.exchangeId} ${config.ccxtType} instance:`, {
    providerId: config.providerId,
    userId: config.userId,
    accountId: config.accountId,
    sandbox: config.sandbox,
    apiKey: config.apiKey ? 'SET' : 'NOT_SET',
    secret: config.secret ? 'SET' : 'NOT_SET',
    marketType: config.marketType,
    ccxtType: config.ccxtType,
    instanceKey
  });
};

/**
 * Определяет доступные рынки для биржи на основе capabilities
 */
export const getAvailableMarkets = (exchangeCapabilities: any): string[] => {
  const availableMarkets: string[] = [];

  if (exchangeCapabilities.spot === true) {
    availableMarkets.push('spot');
  }

  if (exchangeCapabilities.margin === true) {
    availableMarkets.push('margin');
  }

  if (exchangeCapabilities.future === true || exchangeCapabilities.futures === true) {
    availableMarkets.push('futures');
  }

  if (exchangeCapabilities.option === true || exchangeCapabilities.options === true) {
    availableMarkets.push('options');
  }

  // Дополнительные проверки через API capabilities
  if (!availableMarkets.includes('futures') && (
    exchangeCapabilities.fetchFuturesBalance ||
    exchangeCapabilities.fetchDerivativesMarkets ||
    exchangeCapabilities.fetchPositions ||
    exchangeCapabilities.fetchPosition
  )) {
    availableMarkets.push('futures');
  }

  if (!availableMarkets.includes('margin') && (
    exchangeCapabilities.fetchMarginBalance ||
    exchangeCapabilities.fetchBorrowRate ||
    exchangeCapabilities.fetchBorrowRates
  )) {
    availableMarkets.push('margin');
  }

  // Если ничего не найдено, добавляем spot как fallback
  if (availableMarkets.length === 0) {
    availableMarkets.push('spot');
  }

  return availableMarkets;
};

/**
 * Создает стандартный proxy объект для exchange instance
 */
export const createStandardExchangeProxy = (
  config: CCXTInstanceConfig,
  requestHandler: (endpoint: string, data: any) => Promise<any>
): any => {
  return {
    // Основные методы для получения данных
    async fetchTicker(symbol: string) {
      return requestHandler('/api/exchange/fetchTicker', { config, symbol });
    },

    async fetchOrderBook(symbol: string, limit?: number) {
      return requestHandler('/api/exchange/fetchOrderBook', { config, symbol, limit });
    },

    async fetchTrades(symbol: string, since?: number, limit?: number) {
      return requestHandler('/api/exchange/fetchTrades', { config, symbol, since, limit });
    },

    async fetchOHLCV(symbol: string, timeframe: string, since?: number, limit?: number) {
      return requestHandler('/api/exchange/fetchOHLCV', { 
        config, 
        symbol, 
        timeframe, 
        since, 
        limit 
      });
    },

    async fetchBalance() {
      return requestHandler('/api/exchange/fetchBalance', { config });
    },

    // WebSocket методы
    async watchTicker(symbol: string) {
      return requestHandler('/api/exchange/watchTicker', { config, symbol });
    },

    async watchOrderBook(symbol: string, limit?: number) {
      return requestHandler('/api/exchange/watchOrderBook', { config, symbol, limit });
    },

    async watchTrades(symbol: string) {
      return requestHandler('/api/exchange/watchTrades', { config, symbol });
    },

    async watchOHLCV(symbol: string, timeframe: string) {
      return requestHandler('/api/exchange/watchOHLCV', { config, symbol, timeframe });
    },

    async watchBalance() {
      return requestHandler('/api/exchange/watchBalance', { config });
    },

    // Получение capabilities
    async getCapabilities() {
      return requestHandler('/api/exchange/capabilities', { config });
    },

    // Свойства для совместимости с CCXT
    get has() {
      // Возвращаем базовые capabilities - в реальной реализации 
      // это должно кэшироваться при создании instance
      return {
        fetchTicker: true,
        fetchOrderBook: true,
        fetchTrades: true,
        fetchOHLCV: true,
        fetchBalance: config.apiKey ? true : false,
        watchTicker: config.ccxtType === 'pro',
        watchOrderBook: config.ccxtType === 'pro',
        watchTrades: config.ccxtType === 'pro',
        watchOHLCV: config.ccxtType === 'pro',
        watchBalance: config.ccxtType === 'pro' && config.apiKey ? true : false,
      };
    },

    // Метаданные
    id: config.exchangeId,
    name: config.exchangeId,
    sandbox: config.sandbox || false,
  };
};
