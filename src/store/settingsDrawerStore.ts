import { create } from 'zustand';

interface SettingsDrawerState {
  isOpen: boolean;
  widgetId: string | null;
  widgetType: string | null;
  widgetTitle: string | null;
  openDrawer: (widgetId: string, widgetType: string, widgetTitle: string) => void;
  closeDrawer: () => void;
}

export const useSettingsDrawerStore = create<SettingsDrawerState>((set) => ({
  isOpen: false,
  widgetId: null,
  widgetType: null,
  widgetTitle: null,
  openDrawer: (widgetId, widgetType, widgetTitle) => set({
    isOpen: true,
    widgetId,
    widgetType,
    widgetTitle
  }),
  closeDrawer: () => set({
    isOpen: false,
    widgetId: null,
    widgetType: null,
    widgetTitle: null
  })
})); 