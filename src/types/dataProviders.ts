// Data types for financial instruments
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: string;
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
}

export interface OrderBookEntry {
  price: number;
  amount: number;
}

export interface OrderBook {
  timestamp: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

// Data subscription types
export type DataType = 'candles' | 'trades' | 'orderbook';

// Supported timeframes for candles
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

// Market types
export type MarketType = 'spot' | 'futures';

export interface DataSubscription {
  id: string;
  symbol: string; // Example: 'BTC/USDT'
  dataType: DataType;
  exchange: string;
  dashboardId: string;
  widgetId: string;
  timeframe?: Timeframe; // Optional for candles
  market?: MarketType; // Market type (spot/futures)
}

// Key for unique connection identification
export interface ConnectionKey {
  exchange: string;
  symbol: string;
  dataType: DataType;
  timeframe?: Timeframe; // Optional for candles
  market?: MarketType; // Market type (spot/futures)
}

// Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ConnectionInfo {
  key: ConnectionKey;
  status: ConnectionStatus;
  subscriberCount: number;
  lastUpdate: number;
  error?: string;
}

// Base interface for data provider
export interface BaseDataProvider {
  id: string;
  name: string;
  type: DataProviderType;
  status: ConnectionStatus;
  exchanges: string[]; // ['binance', 'bybit'] или ['*'] для всех бирж
  priority: number; // Приоритет провайдера (меньше = выше приоритет)
}

// Data provider types
export type DataProviderType = 'ccxt-browser' | 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter' | 'custom';

// Configuration for CCXT Browser - УПРОЩЕННАЯ ВЕРСИЯ
export interface CCXTBrowserConfig {
  sandbox?: boolean;
  options?: Record<string, any>;
}

// Configuration for CCXT Server - УПРОЩЕННАЯ ВЕРСИЯ  
export interface CCXTServerConfig {
  serverUrl: string;
  timeout?: number;
  sandbox?: boolean;
}



// Configuration for MarketMaker.cc - НЕ РЕАЛИЗОВАН
export interface MarketMakerConfig {
  apiUrl?: string;
  timeout?: number;
  authentication?: {
    apiKey?: string;
    secret?: string;
  };
}

// Configuration for Custom Server with Adapter - НЕ РЕАЛИЗОВАН
export interface CustomServerWithAdapterConfig {
  serverUrl: string;
  timeout?: number;
  jsonSchema?: Record<string, any>;
  authentication?: Record<string, any>;
}

// Custom configuration for other providers
export interface CustomProviderConfig {
  schema: Record<string, any>;
  endpoints: Record<string, string>;
  authentication?: Record<string, any>;
}

// Specific provider types
export interface CCXTBrowserProvider extends BaseDataProvider {
  type: 'ccxt-browser';
  config: CCXTBrowserConfig;
}

export interface CCXTServerProvider extends BaseDataProvider {
  type: 'ccxt-server';
  config: CCXTServerConfig;
}



export interface MarketMakerProvider extends BaseDataProvider {
  type: 'marketmaker.cc';
  config: MarketMakerConfig;
}

export interface CustomServerWithAdapterProvider extends BaseDataProvider {
  type: 'custom-server-with-adapter';
  config: CustomServerWithAdapterConfig;
}

export interface CustomProvider extends BaseDataProvider {
  type: 'custom';
  config: CustomProviderConfig;
}

// Combined provider type
export type DataProvider = CCXTBrowserProvider | CCXTServerProvider | MarketMakerProvider | CustomServerWithAdapterProvider | CustomProvider;

// Utility types for provider-exchange mapping
export interface ProviderExchangeMapping {
  exchange: string;
  provider: DataProvider;
  account?: ExchangeAccountForProvider; // Account data from userStore
}

// Account data extracted from userStore for provider usage
export interface ExchangeAccountForProvider {
  exchange: string;
  apiKey?: string;
  secret?: string;
  password?: string;
  uid?: string;
  email: string;
}

// Interface for WebSocket connection
export interface WebSocketConnection {
  key: string; // string representation of ConnectionKey
  ws: WebSocket | null;
  status: ConnectionStatus;
  subscriptions: Set<string>; // subscription IDs
  reconnectAttempts: number;
  lastPing: number;
  provider: DataProvider;
}

// Data state by subscriptions
export interface DataState<T> {
  data: T | null;
  lastUpdate: number;
  loading: boolean;
  error?: string;
}

// Generic interface for subscription data
export interface SubscriptionData {
  candles: Record<string, DataState<Candle[]>>;
  trades: Record<string, DataState<Trade[]>>;
  orderbook: Record<string, DataState<OrderBook>>;
}

// Parameters for creating subscription
export interface CreateSubscriptionParams {
  symbol: string;
  dataType: DataType;
  exchange: string;
  dashboardId: string;
  widgetId: string;
  providerId?: string; // Теперь опциональный - может автоматически выбираться
}

// Provider operation result
export interface ProviderOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Добавляю новые типы в начало файла после существующих импортов и базовых типов
export type DataFetchMethod = 'rest' | 'websocket';

export interface DataFetchSettings {
  method: DataFetchMethod;
  restIntervals: {
    trades: number; // milliseconds
    candles: number; // milliseconds  
    orderbook: number; // milliseconds
  };
}

export interface SubscriptionKey {
  exchange: string;
  symbol: string;
  dataType: DataType;
  timeframe?: Timeframe; // Опционально для candles
  market?: MarketType; // Тип рынка (spot/futures)
}

export interface ActiveSubscription {
  key: SubscriptionKey;
  subscriberCount: number;
  method: DataFetchMethod;
  isFallback?: boolean; // true если REST используется как fallback от WebSocket
  isActive: boolean;
  lastUpdate: number;
  intervalId?: number; // для REST интервалов
  wsConnection?: WebSocket; // для WebSocket соединений
  ccxtMethod?: string; // какой именно CCXT метод используется (watchOrderBook, watchBidsAsks, etc.)
  providerId?: string; // ID провайдера обслуживающего эту подписку
}

// CCXT specific types
export type CCXTOrderBookMethod = 
  | 'watchOrderBookForSymbols'  // Приоритет 1: diff обновления
  | 'watchOrderBook'            // Приоритет 2: полные снепшоты
  | 'fetchOrderBook';           // Fallback: REST

export interface CCXTMethodCapabilities {
  watchOrderBookForSymbols: boolean;
  watchOrderBook: boolean;
  fetchOrderBook: boolean;
}

export interface OrderBookMethodSelection {
  selectedMethod: CCXTOrderBookMethod;
  reason: string;
  capabilities: CCXTMethodCapabilities;
  isOptimal: boolean;
}

export interface RestCycleManager {
  intervalId: number;
  exchange: string;
  symbol: string;
  dataType: DataType;
  interval: number;
  lastFetch: number;
  subscriberIds: Set<string>;
}

// Event system for Chart widgets  
export type ChartUpdateEventType = 'initial_load' | 'new_candles' | 'update_last_candle' | 'full_refresh';

export interface ChartUpdateEvent {
  type: ChartUpdateEventType;
  exchange: string;
  symbol: string;
  timeframe: Timeframe;
  market: MarketType;
  data?: {
    newCandles?: Candle[];
    newCandlesCount?: number;
    lastCandle?: Candle;
    totalCandles?: number;
  };
  timestamp: number;
}

export type ChartUpdateListener = (event: ChartUpdateEvent) => void; 