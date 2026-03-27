import { create } from 'zustand';

interface SettingsDrawerState {
  isOpen: boolean;
  widgetId: string | null;
  widgetType: string | null;
  widgetTitle: string | null;
  groupId: string | null;
  openDrawer: (widgetId: string, widgetType: string, widgetTitle: string, groupId?: string) => void;
  closeDrawer: () => void;
}

export const useSettingsDrawerStore = create<SettingsDrawerState>((set) => ({
  isOpen: false,
  widgetId: null,
  widgetType: null,
  widgetTitle: null,
  groupId: null,
  openDrawer: (widgetId, widgetType, widgetTitle, groupId) => set({
    isOpen: true,
    widgetId,
    widgetType,
    widgetTitle,
    groupId: groupId || null
  }),
  closeDrawer: () => set({
    isOpen: false,
    widgetId: null,
    widgetType: null,
    widgetTitle: null,
    groupId: null
  })
})); 