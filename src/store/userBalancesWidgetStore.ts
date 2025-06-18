import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserBalancesDisplayType = 'table' | 'pie';

interface UserBalancesWidgetSettings {
  showTotal: boolean;
  hideSmallAmounts: boolean;
  displayType: UserBalancesDisplayType;
  smallAmountThreshold: number; // USD threshold for small amounts
}

interface UserBalancesWidgetState {
  widgetId: string;
  settings: UserBalancesWidgetSettings;
}

interface UserBalancesWidgetStore {
  widgets: Map<string, UserBalancesWidgetState>;
  getWidget: (widgetId: string) => UserBalancesWidgetState;
  updateWidget: (widgetId: string, updates: Partial<UserBalancesWidgetSettings>) => void;
  setWidgetSettings: (widgetId: string, settings: Partial<UserBalancesWidgetSettings>) => void;
}

const defaultSettings: UserBalancesWidgetSettings = {
  showTotal: true,
  hideSmallAmounts: false,
  displayType: 'table',
  smallAmountThreshold: 1.0, // Hide amounts less than $1
};

const defaultWidgetState = (widgetId: string): UserBalancesWidgetState => ({
  widgetId,
  settings: { ...defaultSettings }
});

export const useUserBalancesWidgetStore = create<UserBalancesWidgetStore>()(
  persist(
    (set, get) => ({
      widgets: new Map(),
      
      getWidget: (widgetId: string) => {
        const widget = get().widgets.get(widgetId);
        if (!widget) {
          const newWidget = defaultWidgetState(widgetId);
          set(state => ({
            widgets: new Map(state.widgets).set(widgetId, newWidget)
          }));
          return newWidget;
        }
        return widget;
      },
      
      updateWidget: (widgetId: string, updates: Partial<UserBalancesWidgetSettings>) => {
        set(state => {
          const newWidgets = new Map(state.widgets);
          const existingWidget = newWidgets.get(widgetId) || defaultWidgetState(widgetId);
          
          newWidgets.set(widgetId, {
            ...existingWidget,
            settings: {
              ...existingWidget.settings,
              ...updates
            }
          });
          
          return { widgets: newWidgets };
        });
      },
      
      setWidgetSettings: (widgetId: string, settings: Partial<UserBalancesWidgetSettings>) => {
        get().updateWidget(widgetId, settings);
      }
    }),
    {
      name: 'user-balances-widget-store',
      partialize: (state) => ({
        widgets: Array.from(state.widgets.entries())
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.widgets)) {
          state.widgets = new Map(state.widgets);
        }
      }
    }
  )
); 