import { getCCXT } from '../utils/ccxtUtils';
import { ccxtInstanceManager } from '../utils/ccxtInstanceManager';
import type { CCXTBrowserProvider } from '../../types/dataProviders';

/**
 * CCXT Browser Provider Implementation
 * Отвечает за получение данных через CCXT библиотеку в браузере
 */
export class CCXTBrowserProviderImpl {
  private provider: CCXTBrowserProvider;

  constructor(provider: CCXTBrowserProvider) {
    this.provider = provider;
  }

  /**
   * Получает все доступные символы для биржи
   */
  async getSymbolsForExchange(exchange: string): Promise<string[]> {
    try {
      // Используем кэшированный instance
      const exchangeInstance = await ccxtInstanceManager.getExchangeInstance(exchange, this.provider);

      if (!exchangeInstance.markets) {
        console.warn(`Markets not loaded for ${exchange}`);
        return [];
      }

      // Get all symbols from markets
      const symbols = Object.keys(exchangeInstance.markets);
      
      // Filter to get only active symbols and sort by popularity
      const activeSymbols = symbols
        .filter(symbol => {
          const market = exchangeInstance.markets[symbol];
          return market && market.active !== false;
        })
        .sort((a, b) => {
          // Sort by popularity (BTC and ETH first)
          if (a.includes('BTC')) return -1;
          if (b.includes('BTC')) return 1;
          if (a.includes('ETH')) return -1;
          if (b.includes('ETH')) return 1;
          return a.localeCompare(b);
        })
        .slice(0, 50); // Limit to 50 most popular

      console.log(`📊 [CCXTBrowser] Retrieved ${activeSymbols.length} symbols for ${exchange} (from cache)`);
      return activeSymbols;
    } catch (error) {
      console.error(`❌ [CCXTBrowser] Error getting symbols for exchange: ${exchange}`, error);
      return [];
    }
  }

  /**
   * Определяет доступные рынки для биржи
   * Основывается на статической конфигурации биржи в CCXT (exchange.has)
   * БЕЗ запросов к API биржи
   */
  async getMarketsForExchange(exchange: string): Promise<string[]> {
    try {
      // Получаем CCXT класс биржи БЕЗ создания инстанса с API ключами
      const { getCCXT } = await import('../utils/ccxtUtils');
      const ccxt = getCCXT();
      if (!ccxt) {
        throw new Error('CCXT not available');
      }

      const ExchangeClass = ccxt[exchange];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${exchange} not found in CCXT`);
      }

      // Создаем минимальный инстанс только для получения конфигурации
      const exchangeInstance = new ExchangeClass();
      const hasCapabilities = exchangeInstance.has || {};

      console.log(`🔍 [CCXTBrowser] Analyzing ${exchange} static capabilities:`, {
        exchange: exchange,
        hasCapabilities: hasCapabilities
      });

      const availableMarkets: string[] = [];

      // Проверяем поддержку рынков согласно статической конфигурации биржи
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

      // Дополнительные проверки для futures через API capabilities
      if (!availableMarkets.includes('futures') && (
        hasCapabilities.fetchFuturesBalance ||
        hasCapabilities.fetchDerivativesMarkets ||
        hasCapabilities.fetchPositions ||
        hasCapabilities.fetchPosition
      )) {
        availableMarkets.push('futures');
        console.log(`✅ [CCXTBrowser] ${exchange} supports futures (detected via API methods)`);
      }

      // Дополнительные проверки для margin через API capabilities
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
        markets: availableMarkets,
        source: 'Static Exchange Configuration (has)',
        exchangeConfig: {
          spot: hasCapabilities.spot,
          margin: hasCapabilities.margin,
          swap: hasCapabilities.swap,
          future: hasCapabilities.future,
          option: hasCapabilities.option
        }
      });
      
      return availableMarkets;
    } catch (error) {
      console.error(`❌ [CCXTBrowser] Error getting markets for exchange: ${exchange}`, error);
      return []; // Показываем реальную ошибку, НЕ скрываем
    }
  }

  /**
   * Инвалидирует кэш для биржи (используется при изменении настроек)
   */
  invalidateCache(exchange: string): void {
    ccxtInstanceManager.invalidate(exchange, this.provider.id);
  }

  /**
   * Получает статистику кэша
   */
  getCacheStats() {
    return ccxtInstanceManager.getStats();
  }
}

/**
 * Фабрика для создания CCXT Browser провайдера
 */
export const createCCXTBrowserProvider = (provider: CCXTBrowserProvider): CCXTBrowserProviderImpl => {
  return new CCXTBrowserProviderImpl(provider);
}; 