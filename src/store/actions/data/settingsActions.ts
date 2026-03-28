import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../../types';
import type { DataType, DataFetchMethod } from '../../../types/dataProviders';

export interface DataSettingsActions {
  setDataFetchMethod: (method: DataFetchMethod) => Promise<void>;
  setRestInterval: (dataType: DataType, interval: number) => void;
}

export const createDataSettingsActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  DataSettingsActions
> = (set, get) => ({
  setDataFetchMethod: async (method: DataFetchMethod) => {
    const oldMethod = get().dataFetchSettings.method;

    set(state => {
      state.dataFetchSettings.method = method;
    });

    console.log(`Data fetch method changed from ${oldMethod} to ${method}`);

    if (oldMethod !== method) {
      const activeKeys = Object.keys(get().activeSubscriptions).filter(
        key => get().activeSubscriptions[key].isActive
      );

      activeKeys.forEach(key => get().stopDataFetching(key));

      set(state => {
        activeKeys.forEach(key => {
          if (state.activeSubscriptions[key]) {
            state.activeSubscriptions[key].method = method;
          }
        });
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      for (const key of activeKeys) {
        if (get().activeSubscriptions[key]) {
          await get().startDataFetching(key);
        }
      }
    }
  },

  setRestInterval: (dataType: DataType, interval: number) => {
    set(state => {
      state.dataFetchSettings.restIntervals[dataType] = interval;

      Object.keys(state.activeSubscriptions).forEach(key => {
        const subscription = state.activeSubscriptions[key];
        if (subscription.key.dataType === dataType && subscription.method === 'rest' && subscription.isActive) {
          get().stopDataFetching(key);
          get().startDataFetching(key);
        }
      });
    });
  },
});
