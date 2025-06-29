export interface RequestLogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headers?: Record<string, any>;
  body?: any;
  status?: number;
  statusText?: string;
  responseTime?: number;
  responseData?: any;
  error?: string;
  exchange?: string;
  accountId?: string;
  operation?: string;
}

/**
 * Централизованный логгер для всех HTTP/REST запросов
 */
class RequestLogger {
  private logs: RequestLogEntry[] = [];
  private readonly MAX_LOGS = 500; // Максимум 500 логов
  private subscribers: ((logs: RequestLogEntry[]) => void)[] = [];

  /**
   * Добавляет лог запроса
   */
  addLog(entry: Omit<RequestLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: RequestLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...entry
    };

    this.logs.unshift(logEntry); // Добавляем в начало для сортировки по времени

    // Ограничиваем количество логов
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    // Уведомляем подписчиков
    this.notifySubscribers();
  }

  /**
   * Получает все логи
   */
  getLogs(): RequestLogEntry[] {
    return [...this.logs];
  }

  /**
   * Получает логи по фильтру
   */
  getFilteredLogs(filter: {
    exchange?: string;
    accountId?: string;
    method?: string;
    status?: number;
    hasError?: boolean;
    since?: number;
  }): RequestLogEntry[] {
    return this.logs.filter(log => {
      if (filter.exchange && log.exchange !== filter.exchange) return false;
      if (filter.accountId && log.accountId !== filter.accountId) return false;
      if (filter.method && log.method !== filter.method) return false;
      if (filter.status && log.status !== filter.status) return false;
      if (filter.hasError !== undefined && Boolean(log.error) !== filter.hasError) return false;
      if (filter.since && log.timestamp < filter.since) return false;
      return true;
    });
  }

  /**
   * Очищает все логи
   */
  clearLogs(): void {
    this.logs = [];
    this.notifySubscribers();
  }

  /**
   * Подписывается на изменения логов
   */
  subscribe(callback: (logs: RequestLogEntry[]) => void): () => void {
    this.subscribers.push(callback);
    
    // Возвращаем функцию отписки
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Получает статистику запросов
   */
  getStats(): {
    totalRequests: number;
    successRequests: number;
    errorRequests: number;
    averageResponseTime: number;
    requestsByMethod: Record<string, number>;
    requestsByExchange: Record<string, number>;
    requestsByStatus: Record<number, number>;
    recentRequests: number; // За последние 5 минут
  } {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    const recentLogs = this.logs.filter(log => log.timestamp > fiveMinutesAgo);
    const logsWithResponseTime = this.logs.filter(log => log.responseTime !== undefined);
    
    const methodStats: Record<string, number> = {};
    const exchangeStats: Record<string, number> = {};
    const statusStats: Record<number, number> = {};
    
    this.logs.forEach(log => {
      // Подсчет по методам
      methodStats[log.method] = (methodStats[log.method] || 0) + 1;
      
      // Подсчет по биржам
      if (log.exchange) {
        exchangeStats[log.exchange] = (exchangeStats[log.exchange] || 0) + 1;
      }
      
      // Подсчет по статусам
      if (log.status) {
        statusStats[log.status] = (statusStats[log.status] || 0) + 1;
      }
    });

    return {
      totalRequests: this.logs.length,
      successRequests: this.logs.filter(log => log.status && log.status >= 200 && log.status < 400).length,
      errorRequests: this.logs.filter(log => log.error || (log.status && log.status >= 400)).length,
      averageResponseTime: logsWithResponseTime.length > 0 
        ? Math.round(logsWithResponseTime.reduce((sum, log) => sum + (log.responseTime || 0), 0) / logsWithResponseTime.length)
        : 0,
      requestsByMethod: methodStats,
      requestsByExchange: exchangeStats,
      requestsByStatus: statusStats,
      recentRequests: recentLogs.length
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback([...this.logs]);
      } catch (error) {
        console.error('Error in request logger subscriber:', error);
      }
    });
  }
}

// Singleton instance
export const requestLogger = new RequestLogger();

/**
 * Wrapper функция для перехвата fetch запросов
 */
export function createFetchLogger(originalFetch: typeof fetch) {
  return function loggedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const startTime = Date.now();
    const url = input instanceof Request ? input.url : input.toString();
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    
    // Базовая информация о запросе
    const logData: Partial<RequestLogEntry> = {
      method: method.toUpperCase(),
      url,
      headers: init?.headers || {},
      body: init?.body
    };

    // Извлекаем информацию о бирже из URL
    const extractExchangeFromUrl = (url: string): string | undefined => {
      const patterns = [
        /api\.binance\.com/i,
        /api\.bybit\.com/i,
        /www\.okx\.com/i,
        /api\.kucoin\.com/i,
        /api\.coinbase\.com/i,
        /api\.huobi\.pro/i,
        /api\.kraken\.com/i,
        /api\.bitfinex\.com/i,
        /api\.gate\.io/i,
        /api\.mexc\.com/i,
        /api\.bitget\.com/i
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          const match = url.match(/\/\/[^.]*\.([^.]+)\./);
          return match ? match[1] : undefined;
        }
      }
      return undefined;
    };

    logData.exchange = extractExchangeFromUrl(url);

    return originalFetch(input, init)
      .then(response => {
        const responseTime = Date.now() - startTime;
        
        // Логируем успешный запрос
        requestLogger.addLog({
          ...logData,
          status: response.status,
          statusText: response.statusText,
          responseTime,
          operation: 'HTTP Request'
        } as RequestLogEntry);

        return response;
      })
      .catch(error => {
        const responseTime = Date.now() - startTime;
        
        // Логируем ошибку
        requestLogger.addLog({
          ...logData,
          error: error.message,
          responseTime,
          operation: 'HTTP Request'
        } as RequestLogEntry);

        throw error;
      });
  };
}

/**
 * Wrapper для CCXT exchange instance с логированием
 */
export function wrapExchangeWithLogger(exchange: any, exchangeName: string, accountId?: string): any {
  if (!exchange || !exchange.fetch) {
    return exchange;
  }

  const originalFetch = exchange.fetch;
  
  exchange.fetch = function(url: string, method: string = 'GET', headers: any = {}, body: any = undefined) {
    const startTime = Date.now();
    
    const logData: Partial<RequestLogEntry> = {
      method: method.toUpperCase(),
      url,
      headers,
      body,
      exchange: exchangeName,
      accountId,
      operation: 'CCXT Request'
    };

    return originalFetch.call(this, url, method, headers, body)
      .then((response: any) => {
        const responseTime = Date.now() - startTime;
        
        requestLogger.addLog({
          ...logData,
          status: response.status || 200,
          statusText: response.statusText || 'OK',
          responseTime,
          responseData: typeof response === 'object' ? '[Object]' : String(response).substring(0, 100) + '...'
        } as RequestLogEntry);

        return response;
      })
      .catch((error: any) => {
        const responseTime = Date.now() - startTime;
        
        requestLogger.addLog({
          ...logData,
          error: error.message || String(error),
          responseTime
        } as RequestLogEntry);

        throw error;
      });
  };

  return exchange;
}

// Автоматическая очистка старых логов каждые 10 минут
setInterval(() => {
  const logs = requestLogger.getLogs();
  const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 час назад
  
  const filteredLogs = logs.filter(log => log.timestamp > oneHourAgo);
  
  if (filteredLogs.length !== logs.length) {
    console.log(`🧹 [RequestLogger] Cleaned ${logs.length - filteredLogs.length} old request logs`);
  }
}, 10 * 60 * 1000); 