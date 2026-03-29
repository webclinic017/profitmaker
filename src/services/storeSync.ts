/**
 * Store Sync Bridge
 *
 * Loads state from API on login, pushes changes back to API.
 * Stores continue using Zustand + immer internally — this layer
 * syncs the persistent parts to/from PostgreSQL via the API.
 */

import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useGroupStore } from '../store/groupStore';
import { useDataProviderStore } from '../store/dataProviderStore';
import { dashboardSync, widgetSync, groupSync, settingsSync, providerSync, accountSync } from './apiSync';

let unsubscribers: (() => void)[] = [];

/** Load all user state from API into Zustand stores */
export const loadStateFromAPI = async () => {
  try {
    // Load settings first (needed for activeDashboardId, selectedGroupId, etc.)
    const settings = await settingsSync.fetchAll();

    // Load dashboards with widgets
    const dashboards = await dashboardSync.fetchAll();
    const dashboardsWithWidgets = await Promise.all(
      dashboards.map(async (d: any) => {
        const full = await dashboardSync.fetchWithWidgets(d.id);
        return {
          ...full,
          widgets: full.widgets.map((w: any) => ({
            id: w.id,
            type: w.type,
            title: w.defaultTitle, // deprecated field compat
            defaultTitle: w.defaultTitle,
            userTitle: w.userTitle,
            position: w.position,
            preCollapsePosition: w.preCollapsePosition,
            config: w.config,
            groupId: w.groupId,
            showGroupSelector: w.showGroupSelector,
            isVisible: w.isVisible,
            isMinimized: w.isMinimized,
          })),
        };
      })
    );

    // Apply to dashboardStore
    const dashStore = useDashboardStore.getState();
    useDashboardStore.setState({
      dashboards: dashboardsWithWidgets,
      activeDashboardId: settings.activeDashboardId || dashboardsWithWidgets[0]?.id,
    });

    // Load groups
    const groups = await groupSync.fetchAll();
    useGroupStore.setState({
      groups: groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        color: g.color,
        tradingPair: g.tradingPair,
        account: g.account,
        exchange: g.exchange,
        market: g.market,
        description: g.description,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      selectedGroupId: settings.selectedGroupId,
    });

    // Load providers
    const providers = await providerSync.fetchAll();
    const providerMap: Record<string, any> = {};
    providers.forEach((p: any) => { providerMap[p.id] = p; });

    // Apply to dataProviderStore (only persistent parts)
    const dpStore = useDataProviderStore.getState();
    useDataProviderStore.setState({
      providers: { ...dpStore.providers, ...providerMap },
      activeProviderId: settings.activeProviderId || dpStore.activeProviderId,
      dataFetchSettings: settings.dataFetchSettings || dpStore.dataFetchSettings,
    });

    console.log('State loaded from API:', {
      dashboards: dashboardsWithWidgets.length,
      groups: groups.length,
      providers: providers.length,
    });
  } catch (error) {
    console.error('Failed to load state from API:', error);
  }
};

/** Subscribe to store changes and sync back to API (debounced) */
export const startStoreSync = () => {
  stopStoreSync();

  // Dashboard store → API
  const unsubDashboard = useDashboardStore.subscribe((state, prevState) => {
    // Sync active dashboard ID
    if (state.activeDashboardId !== prevState.activeDashboardId && state.activeDashboardId) {
      settingsSync.setDebounced('activeDashboardId', state.activeDashboardId);
    }

    // Sync widget position changes (debounced)
    for (const dashboard of state.dashboards) {
      const prev = prevState.dashboards.find(d => d.id === dashboard.id);
      if (!prev) continue;
      for (const widget of dashboard.widgets) {
        const prevWidget = prev.widgets.find(w => w.id === widget.id);
        if (!prevWidget) continue;
        if (JSON.stringify(widget.position) !== JSON.stringify(prevWidget.position)) {
          widgetSync.updateDebounced(widget.id, { position: widget.position });
        }
        if (widget.isMinimized !== prevWidget.isMinimized || widget.isVisible !== prevWidget.isVisible) {
          widgetSync.updateDebounced(widget.id, {
            isMinimized: widget.isMinimized,
            isVisible: widget.isVisible,
            preCollapsePosition: widget.preCollapsePosition,
          });
        }
        if (widget.userTitle !== prevWidget.userTitle) {
          widgetSync.updateDebounced(widget.id, { userTitle: widget.userTitle });
        }
      }
    }
  });

  // Group store → API
  const unsubGroup = useGroupStore.subscribe((state, prevState) => {
    if (state.selectedGroupId !== prevState.selectedGroupId) {
      settingsSync.setDebounced('selectedGroupId', state.selectedGroupId);
    }

    // Sync group updates
    for (const group of state.groups) {
      const prev = prevState.groups.find(g => g.id === group.id);
      if (!prev) continue;
      if (JSON.stringify(group) !== JSON.stringify(prev)) {
        groupSync.update(group.id, {
          name: group.name,
          color: group.color,
          tradingPair: group.tradingPair,
          account: group.account,
          exchange: group.exchange,
          market: group.market,
        }).catch(console.error);
      }
    }
  });

  // DataProvider store → API
  const unsubProvider = useDataProviderStore.subscribe((state, prevState) => {
    if (state.activeProviderId !== prevState.activeProviderId) {
      settingsSync.setDebounced('activeProviderId', state.activeProviderId);
    }
    if (JSON.stringify(state.dataFetchSettings) !== JSON.stringify(prevState.dataFetchSettings)) {
      settingsSync.setDebounced('dataFetchSettings', state.dataFetchSettings);
    }
  });

  unsubscribers = [unsubDashboard, unsubGroup, unsubProvider];
};

/** Stop syncing store changes to API */
export const stopStoreSync = () => {
  unsubscribers.forEach(fn => fn());
  unsubscribers = [];
};
