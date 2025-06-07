import type {
  DataProvider,
  DataType,
  DataFetchSettings,
  ActiveSubscription,
  RestCycleManager,
  Candle,
  Trade,
  OrderBook,
  ProviderOperationResult,
  DataFetchMethod,
  OrderBookMethodSelection,
  Timeframe,
  MarketType,
  ChartUpdateListener,
  ChartUpdateEvent,
  ProviderExchangeMapping
} from '../types/dataProviders';
import type { User } from './userStore';

// Store state interface
export interface DataProviderState {
  // Data providers
  providers: Record<string, DataProvider>;
  activeProviderId: string | null; // Deprecated, kept for compatibility
  
  // Data fetch settings
  dataFetchSettings: DataFetchSettings;
  
  // Active subscriptions with deduplication
  activeSubscriptions: Record<string, ActiveSubscription>;
  
  // REST cycles
  restCycles: Record<string, RestCycleManager>;
  
  // Centralized data storage
  marketData: {
    candles: Record<string, Record<string, Record<string, Record<string, Candle[]>>>>; // [exchange][market][symbol][timeframe] -> Candle[]
    trades: Record<string, Record<string, Record<string, Trade[]>>>;   // [exchange][market][symbol] -> Trade[]
    orderbook: Record<string, Record<string, Record<string, OrderBook>>>; // [exchange][market][symbol] -> OrderBook
  };
  
  // Event system for notifying Chart widgets
  chartUpdateListeners: Record<string, ChartUpdateListener[]>; // [subscriptionKey] -> [listeners]
  
  // State
  loading: boolean;
  error: string | null;
}

// Store actions interface
export interface DataProviderActions {
  // Provider management
  addProvider: (provider: DataProvider) => void;
  removeProvider: (providerId: string) => void;
  setActiveProvider: (providerId: string) => void;
  
  // NEW: Multiple provider management
  enableProvider: (providerId: string) => void;
  disableProvider: (providerId: string) => void;
  toggleProvider: (providerId: string) => void;
  isProviderEnabled: (providerId: string) => boolean;
  getEnabledProviders: () => DataProvider[];
  
  // NEW: Advanced provider management with user integration
  createProvider: (type: 'ccxt-browser' | 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter', name: string, exchanges: string[], config?: any) => DataProvider;
  updateProvider: (providerId: string, updates: { name?: string; exchanges?: string[]; priority?: number; config?: any }) => void;
  getProviderForExchange: (exchange: string) => DataProvider | null;
  getProviderExchangeMappings: (exchanges: string[]) => ProviderExchangeMapping[];
  updateProviderPriority: (providerId: string, priority: number) => void;
  
  // NEW: Get symbols and markets from provider
  getSymbolsForExchange: (exchange: string) => Promise<string[]>;
  getMarketsForExchange: (exchange: string) => Promise<string[]>;
  getAllSupportedExchanges: () => string[];
  
  // Data fetch settings management
  setDataFetchMethod: (method: DataFetchMethod) => Promise<void>;
  setRestInterval: (dataType: DataType, interval: number) => void;
  
  // Deduplicated subscriptions management
  subscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType) => Promise<ProviderOperationResult>;
  unsubscribe: (subscriberId: string, exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType) => void;
  
  // Data retrieval from store
  getCandles: (exchange: string, symbol: string, timeframe?: Timeframe, market?: MarketType) => Candle[];
  getTrades: (exchange: string, symbol: string, market?: MarketType) => Trade[];
  getOrderBook: (exchange: string, symbol: string, market?: MarketType) => OrderBook | null;
  
  // REST data initialization for Chart widgets
  initializeChartData: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType) => Promise<Candle[]>;
  
  // Central store data updates
  updateCandles: (exchange: string, symbol: string, candles: Candle[], timeframe?: Timeframe, market?: MarketType) => void;
  updateTrades: (exchange: string, symbol: string, trades: Trade[], market?: MarketType) => void;
  updateOrderBook: (exchange: string, symbol: string, orderbook: OrderBook, market?: MarketType) => void;
  
  // Utilities
  getSubscriptionKey: (exchange: string, symbol: string, dataType: DataType, timeframe?: Timeframe, market?: MarketType) => string;
  getActiveSubscriptionsList: () => ActiveSubscription[];
  
  // Event system for Chart widgets
  addChartUpdateListener: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, listener: ChartUpdateListener) => void;
  removeChartUpdateListener: (exchange: string, symbol: string, timeframe: Timeframe, market: MarketType, listener: ChartUpdateListener) => void;
  emitChartUpdateEvent: (event: ChartUpdateEvent) => void;
  
  // Internal data flow management functions
  startDataFetching: (subscriptionKey: string) => Promise<void>;
  stopDataFetching: (subscriptionKey: string) => void;
  startWebSocketFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  startRestFetching: (exchange: string, symbol: string, dataType: DataType, provider: DataProvider, timeframe?: Timeframe, market?: MarketType) => Promise<void>;
  
  // Intelligent CCXT method selection
  selectOptimalOrderBookMethod: (exchange: string, exchangeInstance: any) => OrderBookMethodSelection;
  
  // Cleanup
  cleanup: () => void;
}

// Main store type
export type DataProviderStore = DataProviderState & DataProviderActions; 