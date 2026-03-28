// Re-export all provider actions from split modules for backwards compatibility
import type { StateCreator } from 'zustand';
import type { DataProviderStore } from '../types';

import { createProviderCrudActions, type ProviderCrudActions } from './provider/crudActions';
import { createProviderQueryActions, type ProviderQueryActions } from './provider/queryActions';

export type ProviderActions = ProviderCrudActions & ProviderQueryActions;

export const createProviderActions: StateCreator<
  DataProviderStore,
  [['zustand/immer', never]],
  [],
  ProviderActions
> = (set, get, store) => ({
  ...createProviderCrudActions(set, get, store),
  ...createProviderQueryActions(set, get, store),
});
