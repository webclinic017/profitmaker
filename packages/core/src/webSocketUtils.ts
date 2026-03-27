import type { DataType, Timeframe, MarketType } from '@profitmaker/types';
import { selectWebSocketMethod } from './ccxtProviderUtils';

/**
 * Общие утилиты для работы с WebSocket в CCXT провайдерах
 * Унифицированная логика для browser и server провайдеров
 */

export interface WebSocketSubscription {
  id: string;
  exchange: string;
  symbol: string;
  dataType: DataType;
  timeframe?: Timeframe;
  market: MarketType;
  method: string;
  isActive: boolean;
  lastUpdate: number;
  errorCount: number;
}

export interface WebSocketConnectionManager {
  subscriptions: Map<string, WebSocketSubscription>;
  connections: Map<string, any>; // Exchange instances
  isConnected: (exchangeId: string) => boolean;
  subscribe: (subscription: WebSocketSubscription) => Promise<void>;
  unsubscribe: (subscriptionId: string) => Promise<void>;
  cleanup: () => Promise<void>;
}

/**
 * Создает ключ для WebSocket подписки
 */
export const createWebSocketSubscriptionKey = (
  exchange: string,
  symbol: string,
  dataType: DataType,
  timeframe?: Timeframe,
  market: MarketType = 'spot'
): string => {
  const parts = [exchange, symbol, dataType, market];
  if (timeframe && dataType === 'candles') {
    parts.push(timeframe);
  }
  return parts.join(':');
};

/**
 * Определяет оптимальный WebSocket метод для подписки
 */
export const getWebSocketMethod = (
  dataType: DataType,
  exchangeInstance: any
): { method: string; supported: boolean } => {
  const selection = selectWebSocketMethod(dataType, exchangeInstance);
  return {
    method: selection.watchMethod,
    supported: selection.hasSupport
  };
};

/**
 * Создает WebSocket подписку
 */
export const createWebSocketSubscription = (
  exchange: string,
  symbol: string,
  dataType: DataType,
  market: MarketType = 'spot',
  timeframe?: Timeframe
): WebSocketSubscription => {
  const id = createWebSocketSubscriptionKey(exchange, symbol, dataType, timeframe, market);
  
  return {
    id,
    exchange,
    symbol,
    dataType,
    timeframe,
    market,
    method: '', // Will be set when exchange instance is available
    isActive: false,
    lastUpdate: 0,
    errorCount: 0
  };
};

/**
 * Валидирует WebSocket подписку
 */
export const validateWebSocketSubscription = (
  subscription: WebSocketSubscription,
  exchangeInstance: any
): { valid: boolean; error?: string } => {
  // Проверяем поддержку WebSocket
  if (!exchangeInstance.has) {
    return { valid: false, error: 'Exchange instance does not have capabilities info' };
  }

  const { method, supported } = getWebSocketMethod(subscription.dataType, exchangeInstance);
  
  if (!supported) {
    return { 
      valid: false, 
      error: `Exchange ${subscription.exchange} does not support ${method} for ${subscription.dataType}` 
    };
  }

  // Проверяем символ
  if (exchangeInstance.markets && !exchangeInstance.markets[subscription.symbol]) {
    return { 
      valid: false, 
      error: `Symbol ${subscription.symbol} not found on ${subscription.exchange}` 
    };
  }

  // Проверяем timeframe для свечей
  if (subscription.dataType === 'candles' && subscription.timeframe) {
    if (exchangeInstance.timeframes && !exchangeInstance.timeframes[subscription.timeframe]) {
      return { 
        valid: false, 
        error: `Timeframe ${subscription.timeframe} not supported on ${subscription.exchange}` 
      };
    }
  }

  return { valid: true };
};

/**
 * Выполняет WebSocket подписку
 */
export const executeWebSocketSubscription = async (
  subscription: WebSocketSubscription,
  exchangeInstance: any,
  onData: (data: any) => void,
  onError: (error: Error) => void
): Promise<void> => {
  const validation = validateWebSocketSubscription(subscription, exchangeInstance);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { method } = getWebSocketMethod(subscription.dataType, exchangeInstance);
  
  try {
    let watchPromise: Promise<any>;

    switch (subscription.dataType) {
      case 'candles':
        if (!subscription.timeframe) {
          throw new Error('Timeframe is required for candles subscription');
        }
        watchPromise = exchangeInstance[method](subscription.symbol, subscription.timeframe);
        break;
      
      case 'trades':
        watchPromise = exchangeInstance[method](subscription.symbol);
        break;
      
      case 'orderbook':
        watchPromise = exchangeInstance[method](subscription.symbol);
        break;
      
      case 'balance':
        watchPromise = exchangeInstance[method]();
        break;
      
      default:
        throw new Error(`Unsupported data type: ${subscription.dataType}`);
    }

    const data = await watchPromise;
    onData(data);
    
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown WebSocket error'));
  }
};

/**
 * Форматирует WebSocket данные в стандартный формат
 */
export const formatWebSocketData = (
  data: any,
  dataType: DataType,
  exchange: string,
  symbol: string
): any => {
  const timestamp = Date.now();
  
  switch (dataType) {
    case 'candles':
      return {
        exchange,
        symbol,
        dataType,
        timestamp,
        data: Array.isArray(data) ? data.map(candle => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: candle[5]
        })) : data
      };
    
    case 'trades':
      return {
        exchange,
        symbol,
        dataType,
        timestamp,
        data: Array.isArray(data) ? data : [data]
      };
    
    case 'orderbook':
      return {
        exchange,
        symbol,
        dataType,
        timestamp,
        data: {
          bids: data.bids || [],
          asks: data.asks || [],
          timestamp: data.timestamp || timestamp,
          datetime: data.datetime || new Date(timestamp).toISOString()
        }
      };
    
    case 'balance':
      return {
        exchange,
        dataType,
        timestamp,
        data: data
      };
    
    default:
      return {
        exchange,
        symbol,
        dataType,
        timestamp,
        data
      };
  }
};

/**
 * Создает менеджер WebSocket соединений
 */
export const createWebSocketManager = (): WebSocketConnectionManager => {
  const subscriptions = new Map<string, WebSocketSubscription>();
  const connections = new Map<string, any>();

  return {
    subscriptions,
    connections,

    isConnected: (exchangeId: string): boolean => {
      return connections.has(exchangeId);
    },

    subscribe: async (subscription: WebSocketSubscription): Promise<void> => {
      subscriptions.set(subscription.id, {
        ...subscription,
        isActive: true,
        lastUpdate: Date.now()
      });
    },

    unsubscribe: async (subscriptionId: string): Promise<void> => {
      const subscription = subscriptions.get(subscriptionId);
      if (subscription) {
        subscriptions.set(subscriptionId, {
          ...subscription,
          isActive: false
        });
      }
    },

    cleanup: async (): Promise<void> => {
      // Закрываем все активные подписки
      for (const [id, subscription] of subscriptions) {
        if (subscription.isActive) {
          await this.unsubscribe(id);
        }
      }
      
      // Очищаем соединения
      connections.clear();
      subscriptions.clear();
    }
  };
};

/**
 * Обработчик ошибок WebSocket
 */
export const handleWebSocketError = (
  error: Error,
  subscription: WebSocketSubscription,
  onRetry?: () => void
): void => {
  console.error(`❌ WebSocket error for ${subscription.id}:`, error);
  
  subscription.errorCount++;
  
  // Простая логика повторных попыток
  if (subscription.errorCount < 3 && onRetry) {
    setTimeout(() => {
      console.log(`🔄 Retrying WebSocket subscription ${subscription.id} (attempt ${subscription.errorCount + 1})`);
      onRetry();
    }, Math.pow(2, subscription.errorCount) * 1000); // Exponential backoff
  } else {
    console.error(`💀 WebSocket subscription ${subscription.id} failed after ${subscription.errorCount} attempts`);
    subscription.isActive = false;
  }
};
