import { getCCXT } from './ccxtUtils';
import type { CCXTBrowserProvider } from '../../types/dataProviders';

interface CachedExchangeInstance {
  instance: any;
  provider: CCXTBrowserProvider;
  lastAccess: number;
  marketsLoaded: boolean;
}

/**
 * Менеджер кэширования CCXT exchange instances
 * Избегает создания нового instance на каждый запрос
 */
class CCXTInstanceManager {
  private cache = new Map<string, CachedExchangeInstance>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 1 день

  /**
   * Создает уникальный ключ для кэша
   */
  private createCacheKey(exchange: string, provider: CCXTBrowserProvider): string {
    return `${exchange}:${provider.id}:${provider.config.sandbox ? 'sandbox' : 'live'}`;
  }

  /**
   * Проверяет валидность кэшированного instance
   */
  private isValid(cached: CachedExchangeInstance): boolean {
    const now = Date.now();
    return (now - cached.lastAccess) < this.CACHE_TTL;
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

    // Загружаем markets только один раз
    await exchangeInstance.loadMarkets();

    const cachedInstance: CachedExchangeInstance = {
      instance: exchangeInstance,
      provider: { ...provider }, // Клонируем для безопасности
      lastAccess: Date.now(),
      marketsLoaded: true
    };

    this.cache.set(cacheKey, cachedInstance);
    console.log(`✅ [CCXTInstanceManager] Cached new instance for ${exchange}, cache size: ${this.cache.size}`);

    return exchangeInstance;
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