import { getCCXT } from './ccxtUtils';
import type { CCXTBrowserProvider } from '@profitmaker/types';
import { wrapExchangeWithLogger } from './requestLogger';

interface CachedExchangeInstance {
  instance: any;
  provider: CCXTBrowserProvider;
  lastAccess: number;
  marketsLoaded: boolean;
}

/**
 * Кэш для loadMarkets() чтобы избежать повторных запросов
 */
interface MarketsCache {
  [exchangeName: string]: {
    markets: any;
    timestamp: number;
  };
}

/**
 * Менеджер кэширования CCXT exchange instances
 * Избегает создания нового instance на каждый запрос
 */
class CCXTInstanceManager {
  private cache = new Map<string, CachedExchangeInstance>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 1 день
  private marketsCache: MarketsCache = {};
  private readonly MARKETS_CACHE_TTL = 60 * 60 * 1000; // 1 час для markets

  /**
   * Создает уникальный ключ для кэша
   */
  private createCacheKey(exchange: string, provider: CCXTBrowserProvider): string {
    const defaultType = (provider.config.options as any)?.defaultType || 'default';
    return `${exchange}:${provider.id}:${provider.config.sandbox ? 'sandbox' : 'live'}:${defaultType}`;
  }

  /**
   * Создает уникальный ключ для кэша с учетом типа рынка
   */
  private createMarketCacheKey(exchange: string, providerId: string, sandbox: boolean, marketType: string): string {
    return `${exchange}:${providerId}:${sandbox ? 'sandbox' : 'live'}:${marketType}`;
  }

  /**
   * Проверяет валидность кэшированного instance
   */
  private isValid(cached: CachedExchangeInstance): boolean {
    const now = Date.now();
    return (now - cached.lastAccess) < this.CACHE_TTL;
  }

  /**
   * Проверяет валидность кэшированных markets
   */
  private isMarketsValid(exchange: string): boolean {
    const cached = this.marketsCache[exchange];
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < this.MARKETS_CACHE_TTL;
  }

  /**
   * Загружает markets с кэшированием
   */
  private async loadMarketsWithCache(exchangeInstance: any, exchange: string): Promise<void> {
    // Проверяем кэш markets
    if (this.isMarketsValid(exchange)) {
      console.log(`📋 [CCXTInstanceManager] Using cached markets for ${exchange}`);
      exchangeInstance.markets = this.marketsCache[exchange].markets;
      return;
    }

    console.log(`🔄 [CCXTInstanceManager] Loading fresh markets for ${exchange}`);
    await exchangeInstance.loadMarkets();
    
    // Кэшируем markets
    this.marketsCache[exchange] = {
      markets: exchangeInstance.markets,
      timestamp: Date.now()
    };
    
    console.log(`✅ [CCXTInstanceManager] Cached markets for ${exchange}`);
  }

  /**
   * Получает или создает exchange instance для конкретного типа рынка
   */
  async getExchangeInstanceForMarket(
    exchange: string, 
    accountId: string, 
    accountConfig: {
      apiKey: string;
      secret: string;
      password?: string;
      sandbox?: boolean;
    },
    marketType: string = 'spot'
  ): Promise<any> {
    const cacheKey = this.createMarketCacheKey(exchange, accountId, accountConfig.sandbox || false, marketType);
    const cached = this.cache.get(cacheKey);

    // Проверяем кэш
    if (cached && this.isValid(cached)) {
      cached.lastAccess = Date.now();
      console.log(`📋 [CCXTInstanceManager] Using cached instance for ${exchange}:${marketType}`);
      return cached.instance;
    }

    // Создаем новый instance
    console.log(`🔄 [CCXTInstanceManager] Creating new instance for ${exchange}:${marketType}`);
    
    const ccxt = getCCXT();
    if (!ccxt) {
      throw new Error('CCXT not available');
    }

    const ExchangeClass = ccxt[exchange];
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchange} not found in CCXT`);
    }

    // Маппинг типов рынков для Bybit
    let defaultType = marketType;
    if (exchange === 'bybit') {
      const bybitCategoryMap: Record<string, string> = {
        'spot': 'spot',
        'futures': 'linear',
        'swap': 'linear', 
        'margin': 'spot',
        'options': 'option'
      };
      defaultType = bybitCategoryMap[marketType] || marketType;
      console.log(`🔍 [CCXTInstanceManager] Bybit mapping: ${marketType} -> ${defaultType}`);
    }

    const instanceConfig = {
      sandbox: accountConfig.sandbox || false,
      apiKey: accountConfig.apiKey,
      secret: accountConfig.secret,
      password: accountConfig.password,
      enableRateLimit: true,
      defaultType: defaultType,
    };
    
    console.log(`🔍 [CCXTInstanceManager] Creating ${exchange} instance with config:`, {
      sandbox: instanceConfig.sandbox,
      apiKey: instanceConfig.apiKey ? 'SET' : 'NOT_SET',
      secret: instanceConfig.secret ? 'SET' : 'NOT_SET',
      defaultType: instanceConfig.defaultType,
      enableRateLimit: instanceConfig.enableRateLimit
    });
    
    const exchangeInstance = new ExchangeClass(instanceConfig);
    
    console.log(`🔍 [CCXTInstanceManager] Created instance:`, {
      defaultType: exchangeInstance.defaultType,
      options: exchangeInstance.options,
      hasApiKey: !!exchangeInstance.apiKey,
      hasSecret: !!exchangeInstance.secret
    });

    // Wrap with request logger
    const loggedInstance = wrapExchangeWithLogger(exchangeInstance, exchange, accountId);

    // Загружаем markets с кэшированием
    await this.loadMarketsWithCache(loggedInstance, exchange);

    // Создаем провайдер конфиг для кэша
    const providerConfig: CCXTBrowserProvider = {
      id: accountId,
      name: `Account ${accountId} - ${marketType}`,
      type: 'ccxt-browser',
      exchanges: [exchange],
      status: 'connected',
      priority: 1,
      config: {
        sandbox: accountConfig.sandbox || false,
        options: {
          apiKey: accountConfig.apiKey,
          secret: accountConfig.secret,
          password: accountConfig.password,
          enableRateLimit: true,
          defaultType: defaultType,
        }
      }
    };

    const cachedInstance: CachedExchangeInstance = {
      instance: loggedInstance,
      provider: providerConfig,
      lastAccess: Date.now(),
      marketsLoaded: true
    };

    this.cache.set(cacheKey, cachedInstance);
    console.log(`✅ [CCXTInstanceManager] Cached new instance for ${exchange}:${marketType}, cache size: ${this.cache.size}`);

    return loggedInstance;
  }

  /**
   * Получает или создает exchange instance
   */
  async getExchangeInstance(exchange: string, provider: CCXTBrowserProvider): Promise<any> {
    const cacheKey = this.createCacheKey(exchange, provider);
    const cached = this.cache.get(cacheKey);

    // Проверяем кэш
    if (cached && this.isValid(cached)) {
      cached.lastAccess = Date.now();
      console.log(`📋 [CCXTInstanceManager] Using cached instance for ${exchange}`);
      return cached.instance;
    }

    // Создаем новый instance
    console.log(`🔄 [CCXTInstanceManager] Creating new instance for ${exchange}`);
    
    const ccxt = getCCXT();
    if (!ccxt) {
      throw new Error('CCXT not available');
    }

    const ExchangeClass = ccxt[exchange];
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchange} not found in CCXT`);
    }

    const exchangeInstance = new ExchangeClass({
      sandbox: provider.config.sandbox || false,
      ...provider.config.options,
      // API ключи теперь передаются через provider.config.options
    });

    // Wrap with request logger
    const loggedInstance = wrapExchangeWithLogger(exchangeInstance, exchange, provider.id);

    // Загружаем markets с кэшированием
    await this.loadMarketsWithCache(loggedInstance, exchange);

    const cachedInstance: CachedExchangeInstance = {
      instance: loggedInstance,
      provider: { ...provider }, // Клонируем для безопасности
      lastAccess: Date.now(),
      marketsLoaded: true
    };

    this.cache.set(cacheKey, cachedInstance);
    console.log(`✅ [CCXTInstanceManager] Cached new instance for ${exchange}, cache size: ${this.cache.size}`);

    return loggedInstance;
  }

  /**
   * Инвалидирует кэш для конкретной биржи
   */
  invalidate(exchange: string, providerId?: string): void {
    if (providerId) {
      // Инвалидируем конкретный провайдер
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.startsWith(`${exchange}:${providerId}:`)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🗑️ [CCXTInstanceManager] Invalidated cache for ${exchange}:${providerId}`);
    } else {
      // Инвалидируем всех провайдеров для биржи
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.startsWith(`${exchange}:`)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🗑️ [CCXTInstanceManager] Invalidated cache for all ${exchange} providers`);
    }
  }

  /**
   * Очищает весь кэш
   */
  clearCache(): void {
    this.cache.clear();
    console.log(`🧹 [CCXTInstanceManager] Cleared entire cache`);
  }

  /**
   * Очищает устаревшие записи
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((cached, key) => {
      if (!this.isValid(cached)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧽 [CCXTInstanceManager] Cleaned up ${keysToDelete.length} expired instances`);
    }
  }

  /**
   * Получает статистику кэша
   */
  getStats() {
    return {
      totalInstances: this.cache.size,
      instances: Array.from(this.cache.entries()).map(([key, cached]) => ({
        key,
        exchange: key.split(':')[0],
        providerId: key.split(':')[1],
        sandbox: key.split(':')[2] === 'sandbox',
        lastAccess: cached.lastAccess,
        age: Date.now() - cached.lastAccess,
        marketsLoaded: cached.marketsLoaded
      }))
    };
  }
}

// Singleton instance
export const ccxtInstanceManager = new CCXTInstanceManager();

// Автоматическая очистка каждые 10 минут
setInterval(() => {
  ccxtInstanceManager.cleanup();
}, 10 * 60 * 1000); 