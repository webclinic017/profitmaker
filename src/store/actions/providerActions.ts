import type { StateCreator } from 'zustand';
import type { DataProvider, ProviderExchangeMapping } from '../../types/dataProviders';
import type { DataProviderStore } from '../types';
import { 
  selectOptimalProvider, 
  createProviderExchangeMappings, 
  getNextProviderPriority, 
  generateProviderId,
  validateProviderConfig 
} from '../utils/providerUtils';
import { useUserStore } from '../userStore';
import { createCCXTBrowserProvider } from '../providers/ccxtBrowserProvider';

export interface ProviderActions {
  addProvider: (provider: DataProvider) => void;
  removeProvider: (providerId: string) => void;
  setActiveProvider: (providerId: string) => void;
  
  // NEW: Multiple provider management
  enableProvider: (providerId: string) => void;
  disableProvider: (providerId: string) => void;
  toggleProvider: (providerId: string) => void;
  isProviderEnabled: (providerId: string) => boolean;
  getEnabledProviders: () => DataProvider[];
  
  createProvider: (type: 'ccxt-browser' | 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter', name: string, exchanges: string[], config?: any) => DataProvider;
  updateProvider: (providerId: string, updates: { name?: string; exchanges?: string[]; priority?: number; config?: any }) => void;
  getProviderForExchange: (exchange: string) => DataProvider | null;
  getProviderExchangeMappings: (exchanges: string[]) => ProviderExchangeMapping[];
  updateProviderPriority: (providerId: string, priority: number) => void;
  
  // NEW: Get symbols and markets from provider
  getSymbolsForExchange: (exchange: string) => Promise<string[]>;
  getMarketsForExchange: (exchange: string) => Promise<string[]>;
  getAllSupportedExchanges: () => string[];
}

export const createProviderActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  ProviderActions
> = (set, get) => ({
  // Provider management
  addProvider: (provider: DataProvider) => {
    set(state => {
      const validation = validateProviderConfig(provider);
      if (!validation.isValid) {
        console.error(`❌ Invalid provider config:`, validation.errors);
        return;
      }
      
      state.providers[provider.id] = provider;
      if (!state.activeProviderId) {
        state.activeProviderId = provider.id;
      }
      console.log(`🔌 Provider added: ${provider.id}`, provider);
    });
  },

  removeProvider: (providerId: string) => {
    set(state => {
      // Stop all subscriptions using this provider
      Object.keys(state.activeSubscriptions).forEach(key => {
        const subscription = state.activeSubscriptions[key];
        if (subscription.providerId === providerId) {
          get().stopDataFetching(key);
          delete state.activeSubscriptions[key];
        }
      });
      
      delete state.providers[providerId];
      
      if (state.activeProviderId === providerId) {
        const remainingProviders = Object.keys(state.providers);
        state.activeProviderId = remainingProviders.length > 0 ? remainingProviders[0] : null;
      }
      console.log(`🔌 Provider removed: ${providerId}`);
    });
  },

  setActiveProvider: (providerId: string) => {
    set(state => {
      if (state.providers[providerId]) {
        state.activeProviderId = providerId;
        console.log(`🎯 Active provider set to: ${providerId}`);
      }
    });
  },

  // NEW: Multiple provider management
  enableProvider: (providerId: string) => {
    set(state => {
      if (state.providers[providerId]) {
        state.providers[providerId].status = 'connected' as const;
        console.log(`🔄 Enabled provider ${providerId}`);
      }
    });
  },

  disableProvider: (providerId: string) => {
    set(state => {
      if (state.providers[providerId]) {
        state.providers[providerId].status = 'disconnected' as const;
        console.log(`🔄 Disabled provider ${providerId}`);
      }
    });
  },

  toggleProvider: (providerId: string) => {
    set(state => {
      if (state.providers[providerId]) {
        state.providers[providerId].status = state.providers[providerId].status === 'connected' ? 'disconnected' : 'connected' as const;
        console.log(`🔄 Toggled provider ${providerId}`);
      }
    });
  },

  isProviderEnabled: (providerId: string) => {
    return get().providers[providerId]?.status === 'connected' as const;
  },

  getEnabledProviders: () => {
    const providers = Object.values(get().providers);
    return providers.filter(p => p.status === 'connected' as const);
  },

  // NEW: Create provider with simplified config
  createProvider: (type: 'ccxt-browser' | 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter', name: string, exchanges: string[], config: any = {}) => {
    const providers = Object.values(get().providers);
    const priority = getNextProviderPriority(providers);
    const id = generateProviderId(type, exchanges, name);
    
    const baseProvider = {
      id,
      name,
      type,
      exchanges,
      priority,
      status: 'connected' as const
    };
    
    let newProvider: DataProvider;
    
    if (type === 'ccxt-browser') {
      newProvider = {
        ...baseProvider,
        type: 'ccxt-browser',
        config: {
          sandbox: config.sandbox || false,
          options: config.options || {}
        }
      };
    } else if (type === 'ccxt-server') {
      newProvider = {
        ...baseProvider,
        type: 'ccxt-server',
        config: {
          serverUrl: config.serverUrl || '',
          timeout: config.timeout || 30000,
          sandbox: config.sandbox || false
        }
      };
    } else if (type === 'marketmaker.cc') {
      newProvider = {
        ...baseProvider,
        type: 'marketmaker.cc',
        config: {
          apiUrl: config.apiUrl || '',
          timeout: config.timeout || 30000,
          authentication: config.authentication || {}
        }
      };
    } else if (type === 'custom-server-with-adapter') {
      newProvider = {
        ...baseProvider,
        type: 'custom-server-with-adapter',
        config: {
          serverUrl: config.serverUrl || '',
          timeout: config.timeout || 30000,
          jsonSchema: config.jsonSchema || {},
          authentication: config.authentication || {}
        }
      };
    } else {
      throw new Error(`Unsupported provider type: ${type}`);
    }
    
    get().addProvider(newProvider);
    console.log(`🔧 Created new provider:`, newProvider);
    
    return newProvider;
  },

  // NEW: Get provider for specific exchange
  getProviderForExchange: (exchange: string): DataProvider | null => {
    const providers = Object.values(get().providers);
    // Only consider enabled providers (connected status)
    const enabledProviders = providers.filter(p => p.status === 'connected');
    return selectOptimalProvider(enabledProviders, exchange);
  },

  // NEW: Get provider mappings for exchanges
  getProviderExchangeMappings: (exchanges: string[]): ProviderExchangeMapping[] => {
    const providers = Object.values(get().providers);
    // Only consider enabled providers (connected status)
    const enabledProviders = providers.filter(p => p.status === 'connected');
    const userStore = useUserStore.getState();
    const activeUser = userStore.users.find(u => u.id === userStore.activeUserId) || null;
    
    return createProviderExchangeMappings(enabledProviders, exchanges, activeUser);
  },

  // NEW: Update existing provider
  updateProvider: (providerId: string, updates: { name?: string; exchanges?: string[]; priority?: number; config?: any }) => {
    set(state => {
      const provider = state.providers[providerId];
      if (!provider) {
        console.error(`❌ Provider ${providerId} not found for update`);
        return;
      }

      // Update fields
      if (updates.name !== undefined) provider.name = updates.name;
      if (updates.exchanges !== undefined) provider.exchanges = updates.exchanges;
      if (updates.priority !== undefined) provider.priority = updates.priority;
      if (updates.config !== undefined) {
        provider.config = { ...provider.config, ...updates.config };
      }

      // Validate updated provider
      const validation = validateProviderConfig(provider);
      if (!validation.isValid) {
        console.error(`❌ Invalid provider config after update:`, validation.errors);
        return;
      }

      console.log(`🔄 Provider updated: ${providerId}`, provider);
    });
  },

  // NEW: Update provider priority
  updateProviderPriority: (providerId: string, priority: number) => {
    set(state => {
      if (state.providers[providerId]) {
        state.providers[providerId].priority = priority;
        console.log(`🔄 Updated provider ${providerId} priority to ${priority}`);
      }
    });
  },

     // NEW: Get symbols and markets from provider
   getSymbolsForExchange: async (exchange: string): Promise<string[]> => {
     const provider = get().getProviderForExchange(exchange);
     if (!provider) {
       console.warn(`❌ No suitable provider found for exchange: ${exchange}`);
       return [];
     }

     try {
       // Delegate to provider-specific implementation
       switch (provider.type) {
         case 'ccxt-browser': {
           const ccxtProvider = createCCXTBrowserProvider(provider);
           return await ccxtProvider.getSymbolsForExchange(exchange);
         }
         case 'ccxt-server':
           // CCXT Server provider will implement its own logic
           console.log(`📊 Getting symbols for ${exchange} from CCXT Server provider ${provider.id}`);
           // For now, return basic fallback until implementation
           return ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
           
         
           
         case 'marketmaker.cc':
           // MarketMaker.cc provider will implement its own logic
           console.log(`📊 Getting symbols for ${exchange} from MarketMaker.cc provider ${provider.id}`);
           return ['BTC/USDT', 'ETH/USDT'];
           
                   case 'custom-server-with-adapter':
            // Custom Server with Adapter provider will implement its own logic
            console.log(`📊 Getting symbols for ${exchange} from Custom Server with Adapter provider ${provider.id}`);
            return ['BTC/USDT', 'ETH/USDT'];
           
         case 'custom':
           // Custom providers will implement their own logic
           console.log(`📊 Getting symbols for ${exchange} from custom provider ${provider.id}`);
           return [];
           
         default:
           console.error(`❌ Unknown provider type: ${(provider as any).type}`);
           return [];
       }
     } catch (error) {
       console.error(`❌ Error getting symbols for exchange: ${exchange}`, error);
       return [];
     }
   },

   getMarketsForExchange: async (exchange: string): Promise<string[]> => {
     const provider = get().getProviderForExchange(exchange);
     if (!provider) {
       console.warn(`❌ No suitable provider found for exchange: ${exchange}`);
       return ['spot'];
     }

     try {
       // Delegate to provider-specific implementation
       switch (provider.type) {
         case 'ccxt-browser': {
           const ccxtProvider = createCCXTBrowserProvider(provider);
           return await ccxtProvider.getMarketsForExchange(exchange);
         }
         case 'ccxt-server':
           // CCXT Server provider will implement its own logic
           console.log(`📈 Getting markets for ${exchange} from CCXT Server provider ${provider.id}`);
           // For now, return basic fallback until implementation
           return ['spot', 'futures', 'margin'];
           
         
           
         case 'marketmaker.cc':
           // MarketMaker.cc provider will implement its own logic
           console.log(`📈 Getting markets for ${exchange} from MarketMaker.cc provider ${provider.id}`);
           return ['spot', 'futures'];
           
                   case 'custom-server-with-adapter':
            // Custom Server with Adapter provider will implement its own logic
            console.log(`📈 Getting markets for ${exchange} from Custom Server with Adapter provider ${provider.id}`);
            return ['spot'];
           
         case 'custom':
           // Custom providers will implement their own logic
           console.log(`📈 Getting markets for ${exchange} from custom provider ${provider.id}`);
           return ['spot'];
           
         default:
           console.error(`❌ Unknown provider type: ${(provider as any).type}`);
           return ['spot'];
       }
     } catch (error) {
       console.error(`❌ Error getting markets for exchange: ${exchange}`, error);
       return ['spot'];
     }
   },

   // NEW: Get all supported exchanges from all enabled providers
   getAllSupportedExchanges: (): string[] => {
     const providers = Object.values(get().providers);
     const enabledProviders = providers.filter(p => p.status === 'connected');
     
     const allExchanges = new Set<string>();
     
     enabledProviders.forEach(provider => {
       if (provider.exchanges.includes('*')) {
         // Universal provider - add popular exchanges
         ['binance', 'bybit', 'okx', 'kucoin', 'coinbase', 'bitget', 'kraken', 'huobi', 
          'gate', 'mexc', 'probit', 'whitebit', 'bingx', 'phemex', 'deribit', 'ftx'].forEach(exchange => {
           allExchanges.add(exchange);
         });
       } else {
         // Specific exchanges
         provider.exchanges.forEach(exchange => {
           allExchanges.add(exchange);
         });
       }
     });
     
     console.log(`🌐 [getAllSupportedExchanges] Found ${allExchanges.size} exchanges from ${enabledProviders.length} providers:`, Array.from(allExchanges).sort());
     
     return Array.from(allExchanges).sort();
   }
}); 