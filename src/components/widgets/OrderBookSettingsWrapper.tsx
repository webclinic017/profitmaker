import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { BookOpen, TrendingUp, TrendingDown, BarChart } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useOrderBookWidgetsStore } from '../../store/orderBookWidgetStore';

interface OrderBookSettingsWrapperProps {
  widgetId: string;
}

const OrderBookSettingsWrapper: React.FC<OrderBookSettingsWrapperProps> = ({ widgetId }) => {
  const { 
    subscribe, 
    unsubscribe, 
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList
  } = useDataProviderStore();

  const { getWidget, updateWidget, setWidgetSettings } = useOrderBookWidgetsStore();
  
  const widget = getWidget(widgetId);

  // Use widget state from store
  const {
    exchange,
    symbol,
    displayDepth,
    showCumulative,
    priceDecimals,
    amountDecimals,
    isSubscribed,
    isLoading,
    error
  } = widget;

  // Get current subscription info
  const activeSubscriptions = getActiveSubscriptionsList();
  const currentSubscription = useMemo(() => {
    return activeSubscriptions.find(sub => 
      sub.key.exchange === exchange && 
      sub.key.symbol === symbol && 
      sub.key.dataType === 'orderbook'
    );
  }, [activeSubscriptions, exchange, symbol]);

  // Handle subscription
  useEffect(() => {
    if (isSubscribed && activeProviderId) {
      const subscriberId = `${widgetId}-settings`;
      
      subscribe(subscriberId, exchange, symbol, 'orderbook');
      console.log(`📊 OrderBook Settings: subscribed to data: ${exchange} ${symbol}`);

      return () => {
        unsubscribe(subscriberId, exchange, symbol, 'orderbook');
        console.log(`📊 OrderBook Settings: unsubscribed from data: ${exchange} ${symbol}`);
      };
    }
  }, [isSubscribed, exchange, symbol, activeProviderId, subscribe, unsubscribe, widgetId]);

  const handleSubscribe = async () => {
    if (!activeProviderId) {
      console.error('❌ No active provider');
      return;
    }

    try {
      updateWidget(widgetId, { isSubscribed: true, isLoading: true, error: null });
      
      const subscriberId = `${widgetId}-settings`;
      const result = await subscribe(subscriberId, exchange, symbol, 'orderbook');
      
      if (result.success) {
        updateWidget(widgetId, { isLoading: false });
      } else {
        updateWidget(widgetId, { 
          error: result.error || 'Subscription failed',
          isLoading: false,
          isSubscribed: false
        });
      }
      
      console.log(`🚀 Starting orderbook subscription from settings: ${exchange} ${symbol}`);
    } catch (error) {
      console.error('❌ Error subscribing to orderbook from settings:', error);
      updateWidget(widgetId, { 
        error: error instanceof Error ? error.message : 'Subscription failed',
        isLoading: false,
        isSubscribed: false
      });
    }
  };

  const handleUnsubscribe = () => {
    updateWidget(widgetId, { isSubscribed: false });
    console.log(`🛑 Stopping orderbook subscription from settings: ${exchange} ${symbol}`);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6 text-terminal-text">
      {/* Connection Settings */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Connection Settings</Label>
          <p className="text-xs text-terminal-muted">Configure data source for order book</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm text-terminal-text">Exchange</Label>
            <Input
              value={exchange}
              onChange={(e) => setWidgetSettings(widgetId, { 
                ...widget, 
                exchange: e.target.value 
              })}
              placeholder="binance"
              disabled={isSubscribed}
              className="bg-terminal-widget border-terminal-border text-terminal-text"
            />
          </div>

          <div>
            <Label className="text-sm text-terminal-text">Trading pair</Label>
            <Input
              value={symbol}
              onChange={(e) => setWidgetSettings(widgetId, { 
                ...widget, 
                symbol: e.target.value 
              })}
              placeholder="BTC/USDT"
              disabled={isSubscribed}
              className="bg-terminal-widget border-terminal-border text-terminal-text"
            />
          </div>

          <div className="flex items-center gap-2">
            {!isSubscribed ? (
              <Button 
                onClick={handleSubscribe} 
                className="flex-1" 
                disabled={!activeProviderId}
                variant="outline"
              >
                {activeProviderId ? 'Subscribe to orderbook' : 'No active provider'}
              </Button>
            ) : (
              <Button 
                onClick={handleUnsubscribe} 
                variant="destructive" 
                className="flex-1"
              >
                Unsubscribe
              </Button>
            )}
          </div>

          {/* Connection Status */}
          {isSubscribed && currentSubscription && (
            <div className={`text-xs p-2 rounded space-y-1 ${
              currentSubscription.isFallback 
                ? 'text-orange-700 bg-orange-50 border border-orange-200' 
                : 'text-gray-500 bg-blue-50'
            }`}>
              <div className="flex items-center justify-between">
                <span>
                  📡 Fetch method: <strong>
                    {currentSubscription.method === 'websocket' 
                      ? 'WebSocket (real-time)' 
                      : currentSubscription.isFallback 
                        ? '🔄 REST (fallback from WebSocket)'
                        : 'REST (interval)'
                    }
                  </strong>
                </span>
                <span className={`w-2 h-2 rounded-full ${currentSubscription.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </div>
              
              {currentSubscription.isFallback && (
                <div className="text-orange-600 bg-orange-100 p-1 rounded text-xs">
                  ⚠️ WebSocket unavailable for this exchange/pair, using REST as fallback method
                </div>
              )}
              
              {currentSubscription.method === 'rest' && (
                <div>⏱️ Update interval: <strong>{dataFetchSettings.restIntervals.orderbook}ms</strong></div>
              )}
              <div>👥 Subscribers to this data: <strong>{currentSubscription.subscriberCount}</strong></div>
              {currentSubscription.lastUpdate > 0 && (
                <div>🕐 Last update: <strong>{formatTime(currentSubscription.lastUpdate)}</strong></div>
              )}

              {/* Display used CCXT method */}
              {currentSubscription.ccxtMethod && (
                <div className="text-xs bg-blue-100 p-1 rounded">
                  🔧 CCXT method: <strong>{currentSubscription.ccxtMethod}</strong>
                  {currentSubscription.ccxtMethod === 'watchOrderBookForSymbols' && ' (⚡ diff updates)'}
                  {currentSubscription.ccxtMethod === 'watchOrderBook' && ' (📋 full snapshots)'}
                  {currentSubscription.ccxtMethod === 'fetchOrderBook' && ' (🔄 REST requests)'}
                </div>
              )}
            </div>
          )}
          
          {isSubscribed && !currentSubscription && (
            <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
              ⚠️ Subscription is being created... Please wait for connection.
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Display Settings */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Display Settings</Label>
          <p className="text-xs text-terminal-muted">Configure how order book is displayed</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-terminal-text">Depth</Label>
            <Select value={displayDepth.toString()} onValueChange={(value) => setWidgetSettings(widgetId, { 
              ...widget, 
              displayDepth: parseInt(value) 
            })}>
              <SelectTrigger className="bg-terminal-widget border-terminal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 levels</SelectItem>
                <SelectItem value="10">10 levels</SelectItem>
                <SelectItem value="20">20 levels</SelectItem>
                <SelectItem value="50">50 levels</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-terminal-text">Price decimals</Label>
            <Select value={priceDecimals.toString()} onValueChange={(value) => setWidgetSettings(widgetId, { 
              ...widget, 
              priceDecimals: parseInt(value) 
            })}>
              <SelectTrigger className="bg-terminal-widget border-terminal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-terminal-text">Volume decimals</Label>
            <Select value={amountDecimals.toString()} onValueChange={(value) => setWidgetSettings(widgetId, { 
              ...widget, 
              amountDecimals: parseInt(value) 
            })}>
              <SelectTrigger className="bg-terminal-widget border-terminal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="show-cumulative"
              checked={showCumulative}
              onCheckedChange={(checked) => setWidgetSettings(widgetId, { 
                ...widget, 
                showCumulative: checked 
              })}
            />
            <Label htmlFor="show-cumulative" className="text-xs text-terminal-text">Cumulative volume</Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Reset Settings */}
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => {
            setWidgetSettings(widgetId, {
              exchange: 'binance',
              symbol: 'BTC/USDT',
              displayDepth: 10,
              showCumulative: true,
              priceDecimals: 2,
              amountDecimals: 4
            });
          }}
        >
          Reset to Default
        </Button>
      </div>

      {!isSubscribed && (
        <div className="text-xs text-terminal-muted text-center pt-2 border-t border-terminal-border">
          💡 Widget automatically deduplicates subscriptions - if multiple widgets request the same data, only one connection is created.
        </div>
      )}
    </div>
  );
};

export default OrderBookSettingsWrapper; 