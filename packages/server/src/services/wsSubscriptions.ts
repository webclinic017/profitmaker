import { getCCXTInstance, type CCXTInstanceConfig } from './ccxtCache';

export interface WebSocketSubscription {
  id: string;
  socketId: string;
  exchangeId: string;
  symbol: string;
  dataType: 'ticker' | 'trades' | 'orderbook' | 'ohlcv' | 'balance';
  timeframe?: string;
  config: CCXTInstanceConfig;
  isActive: boolean;
  ccxtInstance?: any;
}

const activeSubscriptions = new Map<string, WebSocketSubscription>();
const socketSubscriptions = new Map<string, Set<string>>();

export const createSubscriptionKey = (exchangeId: string, symbol: string, dataType: string, timeframe?: string): string => {
  const parts = [exchangeId, symbol, dataType];
  if (timeframe) parts.push(timeframe);
  return parts.join(':');
};

export const startWebSocketSubscription = async (
  subscription: WebSocketSubscription,
  emitData: (socketId: string, data: any) => void,
  emitError: (socketId: string, data: any) => void
): Promise<void> => {
  const instance = await getCCXTInstance(subscription.config);
  subscription.ccxtInstance = instance;

  const watchData = async () => {
    try {
      let data: any;
      switch (subscription.dataType) {
        case 'ticker':
          if (!instance.has['watchTicker']) throw new Error(`${subscription.exchangeId} does not support watchTicker`);
          data = await instance.watchTicker(subscription.symbol);
          break;
        case 'trades':
          if (!instance.has['watchTrades']) throw new Error(`${subscription.exchangeId} does not support watchTrades`);
          data = await instance.watchTrades(subscription.symbol);
          break;
        case 'orderbook':
          if (!instance.has['watchOrderBook']) throw new Error(`${subscription.exchangeId} does not support watchOrderBook`);
          data = await instance.watchOrderBook(subscription.symbol);
          break;
        case 'ohlcv':
          if (!instance.has['watchOHLCV']) throw new Error(`${subscription.exchangeId} does not support watchOHLCV`);
          if (!subscription.timeframe) throw new Error('Timeframe is required for OHLCV subscription');
          data = await instance.watchOHLCV(subscription.symbol, subscription.timeframe);
          break;
        case 'balance':
          if (!instance.has['watchBalance']) throw new Error(`${subscription.exchangeId} does not support watchBalance`);
          data = await instance.watchBalance();
          break;
        default:
          throw new Error(`Unsupported data type: ${subscription.dataType}`);
      }

      emitData(subscription.socketId, {
        subscriptionId: subscription.id,
        dataType: subscription.dataType,
        exchange: subscription.exchangeId,
        symbol: subscription.symbol,
        timeframe: subscription.timeframe,
        data,
        timestamp: Date.now(),
      });

      if (subscription.isActive) setTimeout(watchData, 0);
    } catch (error) {
      emitError(subscription.socketId, {
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      if (subscription.isActive) setTimeout(watchData, 5000);
    }
  };

  watchData();
};

export const stopWebSocketSubscription = (subscriptionId: string): void => {
  const subscription = activeSubscriptions.get(subscriptionId);
  if (subscription) {
    subscription.isActive = false;
    activeSubscriptions.delete(subscriptionId);
  }
};

export const addSubscription = (subscription: WebSocketSubscription): void => {
  activeSubscriptions.set(subscription.id, subscription);
  if (!socketSubscriptions.has(subscription.socketId)) {
    socketSubscriptions.set(subscription.socketId, new Set());
  }
  socketSubscriptions.get(subscription.socketId)!.add(subscription.id);
};

export const removeSocketSubscriptions = (socketId: string): void => {
  const subs = socketSubscriptions.get(socketId);
  if (subs) {
    for (const subId of subs) stopWebSocketSubscription(subId);
    socketSubscriptions.delete(socketId);
  }
};

export const hasSubscription = (subscriptionId: string): boolean => {
  return activeSubscriptions.has(subscriptionId);
};

export const removeSubscriptionFromSocket = (socketId: string, subscriptionId: string): void => {
  stopWebSocketSubscription(subscriptionId);
  socketSubscriptions.get(socketId)?.delete(subscriptionId);
};
