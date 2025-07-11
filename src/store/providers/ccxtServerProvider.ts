import type { CCXTServerProvider } from '../../types/dataProviders';

interface CCXTInstanceConfig {
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

interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * CCXT Server Provider Implementation
 * Взаимодействует с Express сервером для выполнения CCXT операций
 * Основная цель: обход CORS ограничений браузера при работе с биржами
 */
export class CCXTServerProviderImpl {
  private provider: CCXTServerProvider;
  private baseUrl: string;
  private token?: string;
  private timeout: number;

  constructor(provider: CCXTServerProvider) {
    this.provider = provider;
    this.baseUrl = provider.config.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = provider.config.token;
    this.timeout = provider.config.timeout || 30000;
  }

  /**
   * Выполняет HTTP запрос к серверу
   */
  private async makeRequest<T = any>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    console.log(`🌐 [CCXTServer] Making request to ${url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server error ${response.status}: ${errorData.error || response.statusText}`);
      }

      const result: ServerResponse<T> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Server request failed');
      }

      return result.data as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Выполняет HTTP запрос через прокси сервера для обхода CORS
   */
  async makeProxyRequest(url: string, method: string = 'GET', headers: Record<string, string> = {}, body?: any): Promise<any> {
    console.log(`🌐 [CCXTServer] Proxying ${method} ${url}`);

    try {
      const response = await this.makeRequest('/api/proxy/request', {
        url,
        method,
        headers,
        body,
        timeout: this.timeout
      });

      return response;
    } catch (error) {
      console.error(`❌ [CCXTServer] Proxy request failed:`, error);
      throw error;
    }
  }

  /**
   * Создает конфигурацию для CCXT instance
   */
  private createInstanceConfig(
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
  ): CCXTInstanceConfig {
    return {
      providerId: this.provider.id,
      userId,
      accountId,
      exchangeId,
      marketType,
      ccxtType,
      ...credentials
    };
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
    const config = this.createInstanceConfig(
      userId,
      accountId,
      exchangeId,
      marketType,
      ccxtType,
      credentials
    );

    // Создаем instance на сервере
    await this.makeRequest('/api/exchange/instance', config);
    
    console.log(`✅ [CCXTServer] Trading instance created for ${exchangeId}`);
    
    // Возвращаем proxy объект для взаимодействия с сервером
    return this.createExchangeProxy(config);
  }

  /**
   * Получает CCXT instance для получения метаданных (без API ключей)
   */
  async getMetadataInstance(
    exchangeId: string,
    marketType: string = 'spot',
    sandbox: boolean = false
  ): Promise<any> {
    const config = this.createInstanceConfig(
      'metadata',
      'public',
      exchangeId,
      marketType,
      'regular', // Для метаданных всегда используем regular
      { sandbox }
    );

    // Создаем instance на сервере
    await this.makeRequest('/api/exchange/instance', config);
    
    console.log(`✅ [CCXTServer] Metadata instance created for ${exchangeId}`);
    
    // Возвращаем proxy объект для взаимодействия с сервером
    return this.createExchangeProxy(config);
  }

  /**
   * Получает CCXT Pro instance для WebSocket подписок (без API ключей)
   */
  async getWebSocketInstance(
    exchangeId: string,
    marketType: string = 'spot',
    sandbox: boolean = false
  ): Promise<any> {
    const config = this.createInstanceConfig(
      'websocket',
      'public',
      exchangeId,
      marketType,
      'pro', // Для WebSocket используем pro
      { sandbox }
    );

    // Создаем instance на сервере
    await this.makeRequest('/api/exchange/instance', config);
    
    console.log(`✅ [CCXTServer] WebSocket instance created for ${exchangeId}`);
    
    // Возвращаем proxy объект для взаимодействия с сервером
    return this.createExchangeProxy(config);
  }

  /**
   * Создает proxy объект для взаимодействия с exchange instance на сервере
   */
  private createExchangeProxy(config: CCXTInstanceConfig): any {
    const self = this;
    
    return {
      // Основные методы для получения данных
      async fetchTicker(symbol: string) {
        return self.makeRequest('/api/exchange/fetchTicker', { config, symbol });
      },

      async fetchOrderBook(symbol: string, limit?: number) {
        return self.makeRequest('/api/exchange/fetchOrderBook', { config, symbol, limit });
      },

      async fetchTrades(symbol: string, since?: number, limit?: number) {
        return self.makeRequest('/api/exchange/fetchTrades', { config, symbol, since, limit });
      },

      async fetchOHLCV(symbol: string, timeframe: string, since?: number, limit?: number) {
        return self.makeRequest('/api/exchange/fetchOHLCV', { 
          config, 
          symbol, 
          timeframe, 
          since, 
          limit 
        });
      },

      async fetchBalance() {
        return self.makeRequest('/api/exchange/fetchBalance', { config });
      },

      // WebSocket методы (для CCXT Pro)
      async watchTicker(symbol: string) {
        const capabilities = await self.makeRequest('/api/exchange/watchTicker', { config, symbol });
        return capabilities;
      },

      async watchOrderBook(symbol: string) {
        // Заглушка для WebSocket - в реальной реализации нужно будет 
        // реализовать WebSocket соединение с сервером
        throw new Error('WebSocket methods not fully implemented yet');
      },

      async watchTrades(symbol: string) {
        throw new Error('WebSocket methods not fully implemented yet');
      },

      async watchOHLCV(symbol: string, timeframe: string) {
        throw new Error('WebSocket methods not fully implemented yet');
      },

      // Получение capabilities
      async getCapabilities() {
        return self.makeRequest('/api/exchange/capabilities', { config });
      },

      // Прямые HTTP запросы для обхода CORS (основная функция server provider)
      async httpRequest(url: string, method: string = 'GET', headers: Record<string, string> = {}, body?: any) {
        return self.makeProxyRequest(url, method, headers, body);
      },

      // Метод для выполнения произвольных запросов к бирже через прокси
      async fetch(url: string, options: any = {}) {
        const { method = 'GET', headers = {}, body } = options;
        return self.makeProxyRequest(url, method, headers, body);
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
        };
      },

      // Метаданные
      id: config.exchangeId,
      name: config.exchangeId,
      sandbox: config.sandbox || false,
    };
  }

  /**
   * Проверяет доступность сервера
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error(`❌ [CCXTServer] Health check failed:`, error);
      return false;
    }
  }
}

export const createCCXTServerProvider = (provider: CCXTServerProvider): CCXTServerProviderImpl => {
  return new CCXTServerProviderImpl(provider);
};
