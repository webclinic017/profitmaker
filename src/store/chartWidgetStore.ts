import { create } from 'zustand';
import { Timeframe, MarketType } from '@/types/dataProviders';

interface ChartWidgetState {
  timeframe: Timeframe;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

interface ChartWidgetsStore {
  widgets: Record<string, ChartWidgetState>;
  getWidget: (widgetId: string) => ChartWidgetState;
  updateWidget: (widgetId: string, updates: Partial<ChartWidgetState>) => void;
  removeWidget: (widgetId: string) => void;
}

const defaultChartState: ChartWidgetState = {
  timeframe: '1h',
  isSubscribed: false,
  isLoading: false,
  error: null,
};

export const useChartWidgetsStore = create<ChartWidgetsStore>((set, get) => ({
  widgets: {},
  
  getWidget: (widgetId: string) => {
    const { widgets } = get();
    return widgets[widgetId] || { ...defaultChartState };
  },
  
  updateWidget: (widgetId: string, updates: Partial<ChartWidgetState>) => {
    set((state) => ({
      widgets: {
        ...state.widgets,
        [widgetId]: {
          ...state.widgets[widgetId] || defaultChartState,
          ...updates
        }
      }
    }));
  },
  
  removeWidget: (widgetId: string) => {
    set((state) => {
      const { [widgetId]: removed, ...rest } = state.widgets;
      return { widgets: rest };
    });
  }
})); 