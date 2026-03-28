import type { StateCreator } from 'zustand';
import type { DataProvider } from '../../../types/dataProviders';
import type { DataProviderStore } from '../../types';
import { validateProviderConfig, getNextProviderPriority, generateProviderId } from '../../utils/providerUtils';

export interface ProviderCrudActions {
  addProvider: (provider: DataProvider) => void;
  removeProvider: (providerId: string) => void;
  setActiveProvider: (providerId: string) => void;
  enableProvider: (providerId: string) => void;
  disableProvider: (providerId: string) => void;
  toggleProvider: (providerId: string) => void;
  isProviderEnabled: (providerId: string) => boolean;
  getEnabledProviders: () => DataProvider[];
  createProvider: (type: 'ccxt-browser' | 'ccxt-server' | 'marketmaker.cc' | 'custom-server-with-adapter', name: string, exchanges: string[], config?: any) => DataProvider;
  updateProvider: (providerId: string, updates: { name?: string; exchanges?: string[]; priority?: number; config?: any }) => void;
  updateProviderPriority: (providerId: string, priority: number) => void;
}

export const createProviderCrudActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  ProviderCrudActions
> = (set, get) => ({
  addProvider: (provider) => {
    set(state => {
      const validation = validateProviderConfig(provider);
      if (!validation.isValid) { console.error('Invalid provider config:', validation.errors); return; }
      state.providers[provider.id] = provider;
      if (!state.activeProviderId) state.activeProviderId = provider.id;
    });
  },

  removeProvider: (providerId) => {
    set(state => {
      Object.keys(state.activeSubscriptions).forEach(key => {
        if (state.activeSubscriptions[key].providerId === providerId) {
          get().stopDataFetching(key);
          delete state.activeSubscriptions[key];
        }
      });
      delete state.providers[providerId];
      if (state.activeProviderId === providerId) {
        const remaining = Object.keys(state.providers);
        state.activeProviderId = remaining.length > 0 ? remaining[0] : null;
      }
    });
  },

  setActiveProvider: (providerId) => {
    set(state => { if (state.providers[providerId]) state.activeProviderId = providerId; });
  },

  enableProvider: (providerId) => {
    set(state => { if (state.providers[providerId]) state.providers[providerId].status = 'connected'; });
  },

  disableProvider: (providerId) => {
    set(state => { if (state.providers[providerId]) state.providers[providerId].status = 'disconnected'; });
  },

  toggleProvider: (providerId) => {
    set(state => {
      if (state.providers[providerId]) {
        state.providers[providerId].status = state.providers[providerId].status === 'connected' ? 'disconnected' : 'connected';
      }
    });
  },

  isProviderEnabled: (providerId) => get().providers[providerId]?.status === 'connected',

  getEnabledProviders: () => Object.values(get().providers).filter(p => p.status === 'connected'),

  createProvider: (type, name, exchanges, config = {}) => {
    const providers = Object.values(get().providers);
    const priority = getNextProviderPriority(providers);
    const id = generateProviderId(type, exchanges, name);
    const base = { id, name, type, exchanges, priority, status: 'connected' as const };

    let newProvider: DataProvider;
    switch (type) {
      case 'ccxt-browser':
        newProvider = { ...base, type: 'ccxt-browser', config: { sandbox: config.sandbox || false, options: config.options || {} } };
        break;
      case 'ccxt-server':
        newProvider = { ...base, type: 'ccxt-server', config: { serverUrl: config.serverUrl || '', token: config.token || '', timeout: config.timeout || 30000, sandbox: config.sandbox || false } };
        break;
      case 'marketmaker.cc':
        newProvider = { ...base, type: 'marketmaker.cc', config: { apiUrl: config.apiUrl || '', timeout: config.timeout || 30000, authentication: config.authentication || {} } };
        break;
      case 'custom-server-with-adapter':
        newProvider = { ...base, type: 'custom-server-with-adapter', config: { serverUrl: config.serverUrl || '', timeout: config.timeout || 30000, jsonSchema: config.jsonSchema || {}, authentication: config.authentication || {} } };
        break;
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }

    get().addProvider(newProvider);
    return newProvider;
  },

  updateProvider: (providerId, updates) => {
    set(state => {
      const provider = state.providers[providerId];
      if (!provider) return;
      if (updates.name !== undefined) provider.name = updates.name;
      if (updates.exchanges !== undefined) provider.exchanges = updates.exchanges;
      if (updates.priority !== undefined) provider.priority = updates.priority;
      if (updates.config !== undefined) provider.config = { ...provider.config, ...updates.config };
      const validation = validateProviderConfig(provider);
      if (!validation.isValid) console.error('Invalid provider config after update:', validation.errors);
    });
  },

  updateProviderPriority: (providerId, priority) => {
    set(state => { if (state.providers[providerId]) state.providers[providerId].priority = priority; });
  },
});
