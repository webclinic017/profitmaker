import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TradingDataTab = 'trades' | 'positions' | 'orders';

export interface UserTradingDataWidgetSettings {
  activeTab: TradingDataTab;
  selectedAccountIds: string[]; // Массив ID выбранных аккаунтов, пустой массив = все аккаунты
  showZeroPositions: boolean;
  showClosedOrders: boolean;
  tradesLimit: number;
}

interface UserTradingDataWidgetState {
  widgetId: string;
  settings: UserTradingDataWidgetSettings;
}

interface UserTradingDataWidgetStore {
  widgets: Map<string, UserTradingDataWidgetState>;
  getWidget: (widgetId: string) => UserTradingDataWidgetState;
  updateWidget: (widgetId: string, updates: Partial<UserTradingDataWidgetSettings>) => void;
  setWidgetSettings: (widgetId: string, settings: Partial<UserTradingDataWidgetSettings>) => void;
}

const defaultSettings: UserTradingDataWidgetSettings = {
  activeTab: 'trades',
  selectedAccountIds: [], // Пустой массив = все аккаунты
  showZeroPositions: false,
  showClosedOrders: false,
  tradesLimit: 100,
};

const defaultWidgetState = (widgetId: string): UserTradingDataWidgetState => ({
  widgetId,
  settings: { ...defaultSettings }
});

export const useUserTradingDataWidgetStore = create<UserTradingDataWidgetStore>()(
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
      
      updateWidget: (widgetId: string, updates: Partial<UserTradingDataWidgetSettings>) => {
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
      
      setWidgetSettings: (widgetId: string, settings: Partial<UserTradingDataWidgetSettings>) => {
        get().updateWidget(widgetId, settings);
      }
    }),
    {
      name: 'user-trading-data-widget-store',
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