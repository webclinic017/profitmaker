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
   * Получает все доступные символы для биржи с фильтрацией по типу рынка
   */
  async getSymbolsForExchange(exchange: string, limit?: number, marketType?: string): Promise<string[]> {
    try {
      // Используем кэшированный instance
      const exchangeInstance = await ccxtInstanceManager.getExchangeInstance(exchange, this.provider);

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
            
            // Console log for debugging first few symbols
            if (symbols.indexOf(symbol) < 5) {
              console.log(`🔍 [CCXTBrowser] Filtering ${symbol}: type='${marketTypeValue}', filter='${marketTypeToFilter}', symbol pattern:`, {
                hasColon: symbol.includes(':'),
                hasCall: symbol.includes('-C'),
                hasPut: symbol.includes('-P'),
                hasDate: /\d{6}/.test(symbol)
              });
            }
            
            // Handle different market type naming conventions
            if (marketTypeToFilter === 'spot') {
              // For spot markets: explicitly marked as spot type only
              return marketTypeValue === 'spot';
            } else if (marketTypeToFilter === 'margin') {
              // Margin trading uses the same pairs as spot but with leverage capability
              // Show all spot-type pairs for margin trading
              return marketTypeValue === 'spot' || marketTypeValue === 'margin';
            } else if (marketTypeToFilter === 'futures' || marketTypeToFilter === 'future') {
              // For delivery futures: explicit type OR contains ':' with date pattern (but not options)
              return marketTypeValue === 'future' || marketTypeValue === 'futures' || 
                     (symbol.includes(':') && /\d{6}/.test(symbol) && !symbol.includes('-C') && !symbol.includes('-P'));
            } else if (marketTypeToFilter === 'swap' || marketTypeToFilter === 'perpetual') {
              // For perpetual swaps: explicit type OR no specific derivative patterns
              return marketTypeValue === 'swap' || marketTypeValue === 'perpetual' ||
                     (!marketTypeValue && !symbol.includes(':') && !symbol.includes('-C') && !symbol.includes('-P'));
            } else if (marketTypeToFilter === 'options' || marketTypeToFilter === 'option') {
              // For options: explicit type OR contains Call/Put patterns
              return marketTypeValue === 'option' || marketTypeValue === 'options' ||
                     symbol.includes('-C') || symbol.includes('-P');
            } else {
              // For exact matching of any other types
              return marketTypeValue === marketTypeToFilter;
            }
          }

          return true;
        })
        .sort((a, b) => {
          // Sort by popularity (BTC and ETH first)
          if (a.includes('BTC')) return -1;
          if (b.includes('BTC')) return 1;
          if (a.includes('ETH')) return -1;
          if (b.includes('ETH')) return 1;
          return a.localeCompare(b);
        });

      // Apply limit only if specified, otherwise return all pairs
      const resultSymbols = limit && limit > 0 ? activeSymbols.slice(0, limit) : activeSymbols;

      console.log(`📊 [CCXTBrowser] Retrieved ${resultSymbols.length} symbols for ${exchange}${marketType ? ` (${marketType} market)` : ''} (total available: ${activeSymbols.length})`);
      
      // Debug info for market types
      if (marketType && resultSymbols.length > 0) {
        const sampleMarket = exchangeInstance.markets[resultSymbols[0]];
        console.log(`🔍 [CCXTBrowser] Sample market info for ${resultSymbols[0]}:`, {
          type: sampleMarket?.type,
          spot: sampleMarket?.spot,
          swap: sampleMarket?.swap,
          future: sampleMarket?.future,
          option: sampleMarket?.option
        });
      }

      return resultSymbols;
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