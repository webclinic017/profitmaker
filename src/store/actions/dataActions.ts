// Re-export all data actions from split modules for backwards compatibility
import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';

import { createDataSettingsActions, type DataSettingsActions } from './data/settingsActions';
import { createDataGetterActions, type DataGetterActions } from './data/getterActions';
import { createDataUpdaterActions, type DataUpdaterActions } from './data/updaterActions';
import { createDataInitializerActions, type DataInitializerActions } from './data/initializerActions';
import { createUserTradingActions, type UserTradingActions } from './data/userTradingActions';

export type DataActions = DataSettingsActions & DataGetterActions & DataUpdaterActions & DataInitializerActions & UserTradingActions;

export const createDataActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  DataActions
> = (set, get, store) => ({
  ...createDataSettingsActions(set, get, store),
  ...createDataGetterActions(set, get, store),
  ...createDataUpdaterActions(set, get, store),
  ...createDataInitializerActions(set, get, store),
  ...createUserTradingActions(set, get, store),
});
