import { api } from './api';

// Debounce helper for write operations
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const debounce = (key: string, fn: () => void, ms = 500) => {
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  debounceTimers.set(key, setTimeout(fn, ms));
};

// ===== Dashboard Sync =====

export const dashboardSync = {
  fetchAll: async () => {
    const { data } = await api.get('/api/dashboards');
    return data;
  },

  fetchWithWidgets: async (id: string) => {
    const { data } = await api.get(`/api/dashboards/${id}`);
    return data;
  },

  create: async (dashboard: { title: string; layout?: any; isDefault?: boolean }) => {
    const { data } = await api.post('/api/dashboards', dashboard);
    return data;
  },

  update: async (id: string, updates: any) => {
    const { data } = await api.put(`/api/dashboards/${id}`, updates);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/api/dashboards/${id}`);
  },
};

// ===== Widget Sync =====

export const widgetSync = {
  fetchForDashboard: async (dashboardId: string) => {
    const { data } = await api.get(`/api/widgets/dashboard/${dashboardId}`);
    return data;
  },

  create: async (widget: any) => {
    const { data } = await api.post('/api/widgets', widget);
    return data;
  },

  update: async (id: string, updates: any) => {
    const { data } = await api.put(`/api/widgets/${id}`, updates);
    return data;
  },

  updateDebounced: (id: string, updates: any) => {
    debounce(`widget:${id}`, () => widgetSync.update(id, updates));
  },

  batchUpdatePositions: async (widgets: { id: string; position: any }[]) => {
    const { data } = await api.put('/api/widgets/batch', { widgets });
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/api/widgets/${id}`);
  },
};

// ===== Group Sync =====

export const groupSync = {
  fetchAll: async () => {
    const { data } = await api.get('/api/groups');
    return data;
  },

  create: async (group: any) => {
    const { data } = await api.post('/api/groups', group);
    return data;
  },

  update: async (id: string, updates: any) => {
    const { data } = await api.put(`/api/groups/${id}`, updates);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/api/groups/${id}`);
  },
};

// ===== Account Sync =====

export const accountSync = {
  fetchAll: async () => {
    const { data } = await api.get('/api/accounts');
    return data;
  },

  create: async (account: any) => {
    const { data } = await api.post('/api/accounts', account);
    return data;
  },

  update: async (id: string, updates: any) => {
    const { data } = await api.put(`/api/accounts/${id}`, updates);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/api/accounts/${id}`);
  },
};

// ===== Settings Sync =====

export const settingsSync = {
  fetchAll: async () => {
    const { data } = await api.get('/api/settings');
    return data;
  },

  get: async (key: string) => {
    const { data } = await api.get(`/api/settings/${key}`);
    return data.value;
  },

  set: async (key: string, value: any) => {
    await api.put(`/api/settings/${key}`, { value });
  },

  setDebounced: (key: string, value: any) => {
    debounce(`setting:${key}`, () => settingsSync.set(key, value));
  },

  setBulk: async (settings: Record<string, any>) => {
    await api.put('/api/settings', { settings });
  },
};

// ===== Provider Sync =====

export const providerSync = {
  fetchAll: async () => {
    const { data } = await api.get('/api/providers');
    return data;
  },

  create: async (provider: any) => {
    const { data } = await api.post('/api/providers', provider);
    return data;
  },

  update: async (id: string, updates: any) => {
    const { data } = await api.put(`/api/providers/${id}`, updates);
    return data;
  },

  remove: async (id: string) => {
    await api.delete(`/api/providers/${id}`);
  },
};
