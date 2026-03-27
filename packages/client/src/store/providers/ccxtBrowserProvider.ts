import { getCCXT, getCCXTPro } from '../utils/ccxtUtils';
import { wrapExchangeWithLogger } from '../../utils/requestLogger';
import type { CCXTBrowserProvider } from '../../types/dataProviders';
import {
  createCCXTInstanceConfig,
  createInstanceCacheKey,
  createExchangeInstanceConfig,
  logInstanceCreation,
  getAvailableMarkets,
  type CCXTInstanceConfig
} from '../utils/ccxtProviderUtils';

// CCXTInstanceConfig теперь импортируется из общих утилит

interface CachedCCXTInstance {
  instance: any;
  config: CCXTInstanceConfig;
  lastAccess: number;
  marketsLoaded: boolean;
}

interface MarketsCache {
  [cacheKey: string]: {
    markets: any;
    timestamp: number;
  };
}

/**
 * CCXT Browser Provider Implementation
 * Единственное место управления CCXT instances с плоским кэшем
 */
export class CCXTBrowserProviderImpl {
  private provider: CCXTBrowserProvider;
  
  // Плоский кэш всех CCXT instances
  private static instancesCache = new Map<string, CachedCCXTInstance>();
  private static marketsCache: MarketsCache = {};
  
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 1 день
  private static readonly MARKETS_CACHE_TTL = 60 * 60 * 1000; // 1 час для markets

  constructor(provider: CCXTBrowserProvider) {
    this.provider = provider;
  }

  /**
   * Создает ключ для CCXT instance
   */
  private static createInstanceKey(config: CCXTInstanceConfig): string {
    return `${config.providerId}:${config.userId}:${config.accountId}:${config.exchangeId}:${config.marketType}:${config.ccxtType}`;
  }

  /**
   * Создает ключ для кэша markets
   */
  private static createMarketsCacheKey(exchangeId: string, sandbox: boolean, marketType: string): string {
    return `${exchangeId}:${sandbox ? 'sandbox' : 'live'}:${marketType}`;
  }

  /**
   * Проверяет валидность кэшированного instance
   */
  private static isInstanceValid(cached: CachedCCXTInstance): boolean {
    const now = Date.now();
    return (now - cached.lastAccess) < CCXTBrowserProviderImpl.CACHE_TTL;
  }

  /**
   * Проверяет валидность кэшированных markets
   */
  private static isMarketsValid(cacheKey: string): boolean {
    const cached = CCXTBrowserProviderImpl.marketsCache[cacheKey];
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < CCXTBrowserProviderImpl.MARKETS_CACHE_TTL;
  }

  /**
   * Загружает markets с кэшированием
   */
  private static async loadMarketsWithCache(
    exchangeInstance: any, 
    exchangeId: string, 
    sandbox: boolean, 
    marketType: string
  ): Promise<void> {
    const cacheKey = CCXTBrowserProviderImpl.createMarketsCacheKey(exchangeId, sandbox, marketType);
    
    // Проверяем кэш markets
    if (CCXTBrowserProviderImpl.isMarketsValid(cacheKey)) {
      console.log(`📋 [CCXTBrowser] Using cached markets for ${cacheKey}`);
      exchangeInstance.markets = CCXTBrowserProviderImpl.marketsCache[cacheKey].markets;
      return;
    }

    console.log(`🔄 [CCXTBrowser] Loading fresh markets for ${cacheKey}`);
    await exchangeInstance.loadMarkets();
    
    // Кэшируем markets
    CCXTBrowserProviderImpl.marketsCache[cacheKey] = {
      markets: exchangeInstance.markets,
      timestamp: Date.now()
    };
    
    console.log(`✅ [CCXTBrowser] Cached markets for ${cacheKey}`);
  }

  /**
   * Получает или создает CCXT instance
   */
  private static async getCCXTInstance(config: CCXTInstanceConfig): Promise<any> {
    const instanceKey = CCXTBrowserProviderImpl.createInstanceKey(config);
    const cached = CCXTBrowserProviderImpl.instancesCache.get(instanceKey);

    // Проверяем кэш
    if (cached && CCXTBrowserProviderImpl.isInstanceValid(cached)) {
      cached.lastAccess = Date.now();
      console.log(`📋 [CCXTBrowser] Using cached instance: ${instanceKey}`);
      return cached.instance;
    }

    // Создаем новый instance
    console.log(`🔄 [CCXTBrowser] Creating new instance: ${instanceKey}`);
    
    let ccxtLib;
    let ExchangeClass;

    if (config.ccxtType === 'pro') {
      ccxtLib = getCCXTPro();
      if (!ccxtLib) {
        throw new Error('CCXT Pro not available');
      }
      ExchangeClass = ccxtLib[config.exchangeId];
    } else {
      ccxtLib = getCCXT();
      if (!ccxtLib) {
        throw new Error('CCXT not available');
      }
      ExchangeClass = ccxtLib[config.exchangeId];
    }

    if (!ExchangeClass) {
      throw new Error(`Exchange ${config.exchangeId} not found in CCXT${config.ccxtType === 'pro' ? ' Pro' : ''}`);
    }

    // Маппинг типов рынков для разных бирж
    let defaultType = config.marketType;
    if (config.exchangeId === 'bybit') {
      const bybitCategoryMap: Record<string, string> = {
        'spot': 'spot',
        'futures': 'linear',
        'swap': 'linear', 
        'margin': 'spot',
        'options': 'option'
      };
      defaultType = bybitCategoryMap[config.marketType] || config.marketType;
      console.log(`🔍 [CCXTBrowser] Bybit mapping: ${config.marketType} -> ${defaultType}`);
    }

    const instanceConfig = {
      sandbox: config.sandbox || false,
      apiKey: config.apiKey,
      secret: config.secret,
      password: config.password,
      enableRateLimit: true,
      defaultType: defaultType,
    };
    
    console.log(`🔍 [CCXTBrowser] Creating ${config.exchangeId} ${config.ccxtType} instance:`, {
      providerId: config.providerId,
      userId: config.userId,
      accountId: config.accountId,
      sandbox: instanceConfig.sandbox,
      apiKey: instanceConfig.apiKey ? 'SET' : 'NOT_SET',
      secret: instanceConfig.secret ? 'SET' : 'NOT_SET',
      defaultType: instanceConfig.defaultType,
      marketType: config.marketType,
      ccxtType: config.ccxtType
    });
    
    const exchangeInstance = new ExchangeClass(instanceConfig);

    // Wrap with request logger
    const loggedInstance = wrapExchangeWithLogger(
      exchangeInstance, 
      config.exchangeId, 
      `${config.userId}:${config.accountId}`
    );

    // Загружаем markets с кэшированием
    await CCXTBrowserProviderImpl.loadMarketsWithCache(
      loggedInstance, 
      config.exchangeId, 
      config.sandbox || false, 
      config.marketType
    );

    // Кэшируем instance
    const cachedInstance: CachedCCXTInstance = {
      instance: loggedInstance,
      config: { ...config },
      lastAccess: Date.now(),
      marketsLoaded: true
    };

    CCXTBrowserProviderImpl.instancesCache.set(instanceKey, cachedInstance);
    console.log(`✅ [CCXTBrowser] Cached new instance: ${instanceKey}, total cache size: ${CCXTBrowserProviderImpl.instancesCache.size}`);

    return loggedInstance;
  }

  /**
   * Получает CCXT instance для торговых операций (с API ключами)
   */
  async getTradingInstance(
    userId: string,
    accountId: string,
    exchangeId: string,
    marketType: string,
    ccxtType: 'regular' | 'pro',
    credentials: {
      apiKey: string;
      secret: string;
      password?: string;
      sandbox?: boolean;
    }
  ): Promise<any> {
    const config = createCCXTInstanceConfig(
      this.provider.id,
      userId,
      accountId,
      exchangeId,
      marketType,
      ccxtType,
      credentials
    );

    return CCXTBrowserProviderImpl.getCCXTInstance(config);
  }

  /**
   * Получает CCXT instance для получения метаданных (без API ключей)
   */
  async getMetadataInstance(
    exchangeId: string,
    marketType: string = 'spot',
    sandbox: boolean = false
  ): Promise<any> {
    const config = createCCXTInstanceConfig(
      this.provider.id,
      'metadata',
      'public',
      exchangeId,
      marketType,
      'regular', // Для метаданных всегда используем regular
      { sandbox }
    );

    return CCXTBrowserProviderImpl.getCCXTInstance(config);
  }

  /**
   * Получает CCXT Pro instance для WebSocket подписок (без API ключей)
   */
  async getWebSocketInstance(
    exchangeId: string,
    marketType: string = 'spot',
    sandbox: boolean = false
  ): Promise<any> {
    const config = createCCXTInstanceConfig(
      this.provider.id,
      'websocket',
      'public',
      exchangeId,
      marketType,
      'pro', // Для WebSocket используем pro
      { sandbox }
    );

    return CCXTBrowserProviderImpl.getCCXTInstance(config);
  }

  /**
   * Получает все доступные символы для биржи с фильтрацией по типу рынка
   */
  async getSymbolsForExchange(exchange: string, limit?: number, marketType?: string): Promise<string[]> {
    try {
      // Используем метаданные instance (без API ключей)
      const exchangeInstance = await this.getMetadataInstance(exchange, marketType || 'spot');

      if (!exchangeInstance.markets) {
        console.warn(`Markets not loaded for ${exchange}`);
        return [];
      }

      // Get all symbols from markets
      const symbols = Object.keys(exchangeInstance.markets);
      
      // Filter to get only active symbols and apply market type filter
      const activeSymbols = symbols
        .filter(symbol => {
          const market = exchangeInstance.markets[symbol];
          if (!market || market.active === false) {
            return false;
          }

          // Apply market type filter if specified
          if (marketType) {
            const marketTypeToFilter = marketType.toLowerCase();
            const marketTypeValue = market.type?.toLowerCase();
            
            // Handle different market type naming conventions
            if (marketTypeToFilter === 'spot') {
              return marketTypeValue === 'spot';
            } else if (marketTypeToFilter === 'margin') {
              return marketTypeValue === 'spot' || marketTypeValue === 'margin';
            } else if (marketTypeToFilter === 'futures' || marketTypeToFilter === 'future') {
              return marketTypeValue === 'future' || marketTypeValue === 'futures' || 
                     (symbol.includes(':') && /:.*\d{6}/.test(symbol) && !symbol.includes('-C') && !symbol.includes('-P'));
            } else if (marketTypeToFilter === 'swap' || marketTypeToFilter === 'perpetual') {
              return marketTypeValue === 'swap' || marketTypeValue === 'perpetual' ||
                     (!marketTypeValue && (
                       (symbol.includes(':') && !/:.*\d{6}/.test(symbol)) || 
                       (!symbol.includes(':') && !symbol.includes('-C') && !symbol.includes('-P'))
                     ));
            } else if (marketTypeToFilter === 'options' || marketTypeToFilter === 'option') {
              return marketTypeValue === 'option' || marketTypeValue === 'options' ||
                     symbol.includes('-C') || symbol.includes('-P');
            } else {
              return marketTypeValue === marketTypeToFilter;
            }
          }

          return true;
        })
        .sort((a, b) => {
          if (a.includes('BTC')) return -1;
          if (b.includes('BTC')) return 1;
          if (a.includes('ETH')) return -1;
          if (b.includes('ETH')) return 1;
          return a.localeCompare(b);
        });

      const resultSymbols = limit && limit > 0 ? activeSymbols.slice(0, limit) : activeSymbols;

      console.log(`📊 [CCXTBrowser] Retrieved ${resultSymbols.length} symbols for ${exchange}${marketType ? ` (${marketType} market)` : ''}`);
      
      return resultSymbols;
    } catch (error) {
      console.error(`❌ [CCXTBrowser] Error getting symbols for exchange: ${exchange}`, error);
      return [];
    }
  }

  /**
   * Определяет доступные рынки для биржи
   */
  async getMarketsForExchange(exchange: string): Promise<string[]> {
    try {
      const ccxt = getCCXT();
      if (!ccxt) {
        throw new Error('CCXT not available');
      }

      const ExchangeClass = ccxt[exchange];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${exchange} not found in CCXT`);
      }

      const exchangeInstance = new ExchangeClass();
      const hasCapabilities = exchangeInstance.has || {};

      console.log(`🔍 [CCXTBrowser] Analyzing ${exchange} static capabilities`);

      const availableMarkets: string[] = [];

      if (hasCapabilities.spot === true) {
        availableMarkets.push('spot');
        console.log(`✅ [CCXTBrowser] ${exchange} supports spot trading`);
      }

      if (hasCapabilities.margin === true) {
        availableMarkets.push('margin');
        console.log(`✅ [CCXTBrowser] ${exchange} supports margin trading`);
      }

      if (hasCapabilities.swap === true) {
        availableMarkets.push('swap');
        console.log(`✅ [CCXTBrowser] ${exchange} supports swap trading`);
      }

      if (hasCapabilities.future === true) {
        availableMarkets.push('futures');
        console.log(`✅ [CCXTBrowser] ${exchange} supports futures trading`);
      }

      if (hasCapabilities.option === true) {
        availableMarkets.push('options');
        console.log(`✅ [CCXTBrowser] ${exchange} supports options trading`);
      }

      // Дополнительные проверки через API capabilities
      if (!availableMarkets.includes('futures') && (
        hasCapabilities.fetchFuturesBalance ||
        hasCapabilities.fetchDerivativesMarkets ||
        hasCapabilities.fetchPositions ||
        hasCapabilities.fetchPosition
      )) {
        availableMarkets.push('futures');
        console.log(`✅ [CCXTBrowser] ${exchange} supports futures (detected via API methods)`);
      }

      if (!availableMarkets.includes('margin') && (
        hasCapabilities.fetchMarginBalance ||
        hasCapabilities.fetchBorrowRate ||
        hasCapabilities.fetchBorrowRates
      )) {
        availableMarkets.push('margin');
        console.log(`✅ [CCXTBrowser] ${exchange} supports margin (detected via API methods)`);
      }

      console.log(`✅ [CCXTBrowser] Final markets for ${exchange}:`, {
        total: availableMarkets.length,
        markets: availableMarkets
      });

      return availableMarkets;
    } catch (error) {
      console.error(`❌ [CCXTBrowser] Error getting markets for exchange: ${exchange}`, error);
      return [];
    }
  }

  /**
   * Инвалидирует кэш для конкретного пользователя/аккаунта
   */
  static invalidateCache(providerId?: string, userId?: string, accountId?: string, exchangeId?: string): void {
    const keysToDelete: string[] = [];
    
    CCXTBrowserProviderImpl.instancesCache.forEach((_, key) => {
      const parts = key.split(':');
      const [keyProviderId, keyUserId, keyAccountId, keyExchangeId] = parts;
      
      if (providerId && keyProviderId !== providerId) return;
      if (userId && keyUserId !== userId) return;
      if (accountId && keyAccountId !== accountId) return;
      if (exchangeId && keyExchangeId !== exchangeId) return;
      
      keysToDelete.push(key);
    });

    keysToDelete.forEach(key => CCXTBrowserProviderImpl.instancesCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🗑️ [CCXTBrowser] Invalidated ${keysToDelete.length} instances`);
    }
  }

  /**
   * Очищает весь кэш
   */
  static clearCache(): void {
    CCXTBrowserProviderImpl.instancesCache.clear();
    CCXTBrowserProviderImpl.marketsCache = {};
    console.log(`🧹 [CCXTBrowser] Cleared entire cache`);
  }

  /**
   * Получает статистику кэша
   */
  static getCacheStats() {
    const stats = Array.from(CCXTBrowserProviderImpl.instancesCache.entries()).map(([key, cached]) => {
      const [providerId, userId, accountId, exchangeId, marketType, ccxtType] = key.split(':');
      return {
        key,
        providerId,
        userId,
        accountId,
        exchangeId,
        marketType,
        ccxtType,
        lastAccess: cached.lastAccess,
        age: Date.now() - cached.lastAccess,
        marketsLoaded: cached.marketsLoaded
      };
    });

    return {
      totalInstances: CCXTBrowserProviderImpl.instancesCache.size,
      totalMarketsCache: Object.keys(CCXTBrowserProviderImpl.marketsCache).length,
      instances: stats
    };
  }

  /**
   * Автоматическая очистка устаревших записей
   */
  static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    CCXTBrowserProviderImpl.instancesCache.forEach((cached, key) => {
      if (!CCXTBrowserProviderImpl.isInstanceValid(cached)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => CCXTBrowserProviderImpl.instancesCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧽 [CCXTBrowser] Cleaned up ${keysToDelete.length} expired instances`);
    }
  }
}

export const createCCXTBrowserProvider = (provider: CCXTBrowserProvider): CCXTBrowserProviderImpl => {
  return new CCXTBrowserProviderImpl(provider);
};

// Автоматическая очистка каждые 10 минут
setInterval(() => {
  CCXTBrowserProviderImpl.cleanup();
}, 10 * 60 * 1000); 