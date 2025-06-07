import React, { useMemo } from 'react';
import ChartSettings from './ChartSettings';
import { useChartWidgetsStore } from '@/store/chartWidgetStore';
import { useDataProviderStore } from '@/store/dataProviderStore';
import { Timeframe, MarketType } from '@/types/dataProviders';

interface ChartSettingsWrapperProps {
  widgetId: string;
}

const ChartSettingsWrapper: React.FC<ChartSettingsWrapperProps> = ({ widgetId }) => {
  const { getWidget, updateWidget, setWidgetSettings } = useChartWidgetsStore();
  const { 
    subscribe, 
    unsubscribe, 
    dataFetchSettings,
    getActiveSubscriptionsList 
  } = useDataProviderStore();
  
  const widget = getWidget(widgetId);
  const activeSubscriptions = getActiveSubscriptionsList();
  
  // Check if we have active subscription for current widget settings
  const currentSubscription = useMemo(() => {
    return activeSubscriptions.find(sub => 
      sub.key.exchange === widget.exchange && 
      sub.key.symbol === widget.symbol && 
      sub.key.dataType === 'candles' &&
      sub.key.timeframe === widget.timeframe &&
      sub.key.market === widget.market
    );
  }, [activeSubscriptions, widget]);

  const getConnectionStatus = () => {
    if (!currentSubscription) return 'disconnected';
    if (!currentSubscription.isActive) return 'connecting';
    return 'connected';
  };

  // Handlers for ChartSettings
  const handleExchangeChange = (exchange: string) => {
    setWidgetSettings(widgetId, {
      ...widget,
      exchange
    });
  };

  const handleSymbolChange = (symbol: string) => {
    setWidgetSettings(widgetId, {
      ...widget,
      symbol
    });
  };

  const handleTimeframeChange = (timeframe: Timeframe) => {
    // Остановить текущую подписку если есть
    if (currentSubscription) {
      const subscriberId = `widget-${widgetId}`;
      unsubscribe(
        subscriberId, 
        widget.exchange, 
        widget.symbol, 
        'candles', 
        widget.timeframe, 
        widget.market
      );
    }

    // Обновить настройки в store
    setWidgetSettings(widgetId, {
      ...widget,
      timeframe
    });

    // Если была активная подписка, перезапустить с новым timeframe
    if (currentSubscription) {
      const subscriberId = `widget-${widgetId}`;
      setTimeout(async () => {
        try {
          updateWidget(widgetId, { isLoading: true, error: null });
          
          const result = await subscribe(
            subscriberId, 
            widget.exchange, 
            widget.symbol, 
            'candles', 
            timeframe, 
            widget.market
          );
          
          if (result.success) {
            updateWidget(widgetId, { 
              isSubscribed: true, 
              isLoading: false 
            });
          } else {
            updateWidget(widgetId, { 
              error: result.error || 'Subscription failed',
              isLoading: false 
            });
          }
        } catch (error) {
          updateWidget(widgetId, { 
            error: error instanceof Error ? error.message : 'Subscription failed',
            isLoading: false 
          });
        }
      }, 100); // Небольшая задержка для корректной обработки
    }
  };

  const handleMarketChange = (market: MarketType) => {
    setWidgetSettings(widgetId, {
      ...widget,
      market
    });
  };

  const handleSubscribe = async () => {
    try {
      updateWidget(widgetId, { isLoading: true, error: null });
      
      const subscriberId = `widget-${widgetId}`;
      const result = await subscribe(
        subscriberId, 
        widget.exchange, 
        widget.symbol, 
        'candles', 
        widget.timeframe, 
        widget.market
      );
      
      if (result.success) {
        updateWidget(widgetId, { 
          isSubscribed: true, 
          isLoading: false 
        });
      } else {
        updateWidget(widgetId, { 
          error: result.error || 'Subscription failed',
          isLoading: false 
        });
      }
    } catch (error) {
      updateWidget(widgetId, { 
        error: error instanceof Error ? error.message : 'Subscription failed',
        isLoading: false 
      });
    }
  };

  const handleUnsubscribe = () => {
    const subscriberId = `widget-${widgetId}`;
    unsubscribe(
      subscriberId, 
      widget.exchange, 
      widget.symbol, 
      'candles', 
      widget.timeframe, 
      widget.market
    );
    updateWidget(widgetId, { isSubscribed: false });
  };

  return (
    <ChartSettings
      exchange={widget.exchange}
      symbol={widget.symbol}
      timeframe={widget.timeframe}
      market={widget.market}
      isSubscribed={widget.isSubscribed}
      isLoading={widget.isLoading}
      error={widget.error}
      dataFetchMethod={dataFetchSettings.method}
      connectionStatus={getConnectionStatus()}
      onExchangeChange={handleExchangeChange}
      onSymbolChange={handleSymbolChange}
      onTimeframeChange={handleTimeframeChange}
      onMarketChange={handleMarketChange}
      onSubscribe={handleSubscribe}
      onUnsubscribe={handleUnsubscribe}
    />
  );
};

export default ChartSettingsWrapper; 