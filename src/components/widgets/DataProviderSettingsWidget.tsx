import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { DataFetchMethod, DataType } from '../../types/dataProviders';
import { Settings, Wifi, WifiOff, Clock, Activity, BarChart, Database } from 'lucide-react';

const DataProviderSettingsWidgetInner: React.FC = () => {
  const { 
    dataFetchSettings, 
    setDataFetchMethod, 
    setRestInterval,
    getActiveSubscriptionsList
  } = useDataProviderStore();

  const [tradesInterval, setTradesInterval] = useState(dataFetchSettings.restIntervals.trades.toString());
  const [candlesInterval, setCandlesInterval] = useState(dataFetchSettings.restIntervals.candles.toString());
  const [orderbookInterval, setOrderbookInterval] = useState(dataFetchSettings.restIntervals.orderbook.toString());

  const activeSubscriptions = getActiveSubscriptionsList();

  const handleMethodChange = async (method: DataFetchMethod) => {
    console.log(`🔄 Changing data fetch method to: ${method}...`);
    await setDataFetchMethod(method);
    console.log(`✅ Data fetch method successfully changed to: ${method}`);
  };

  const handleIntervalChange = (dataType: DataType, value: string) => {
    const interval = parseInt(value);
    if (!isNaN(interval) && interval > 0) {
      setRestInterval(dataType, interval);
      console.log(`⏱️ ${dataType} interval set to ${interval}ms`);
    }
  };

  const handleTradesIntervalSubmit = () => {
    handleIntervalChange('trades', tradesInterval);
  };

  const handleCandlesIntervalSubmit = () => {
    handleIntervalChange('candles', candlesInterval);
  };

  const handleOrderbookIntervalSubmit = () => {
    handleIntervalChange('orderbook', orderbookInterval);
  };

  const formatInterval = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${ms / 1000}s`;
    return `${ms / 60000}m`;
  };

  return (
    <div className="space-y-6">
      {/* Data fetching method selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400">Data Fetching Method</Label>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="websocket-mode"
              checked={dataFetchSettings.method === 'websocket'}
              onCheckedChange={(checked) => handleMethodChange(checked ? 'websocket' : 'rest')}
            />
            <Label htmlFor="websocket-mode" className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              {dataFetchSettings.method === 'websocket' ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500 dark:text-green-400" />
                  WebSocket (real-time)
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                  REST (interval requests)
                </>
              )}
            </Label>
          </div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          {dataFetchSettings.method === 'websocket' 
            ? 'Real-time data fetching via WebSocket connections. Automatically falls back to REST if WebSocket is not supported.'
            : 'Data fetching via REST API with configurable intervals. Suitable for debugging and exchanges without WebSocket support.'
          }
        </div>
      </div>

      <Separator />

      {/* REST interval settings (shown only when REST is selected) */}
      {dataFetchSettings.method === 'rest' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <Label className="text-sm font-medium text-blue-600 dark:text-blue-400">REST Request Intervals</Label>
          </div>

          {/* Trades interval */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <Label className="text-sm text-gray-800 dark:text-gray-200">Trades</Label>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Current: {formatInterval(dataFetchSettings.restIntervals.trades)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Interval in milliseconds"
                value={tradesInterval}
                onChange={(e) => setTradesInterval(e.target.value)}
                className="flex-1"
                min="100"
                step="100"
              />
              <Button onClick={handleTradesIntervalSubmit} size="sm">
                Apply
              </Button>
            </div>
          </div>

          {/* Candles interval */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart className="h-4 w-4 text-green-500 dark:text-green-400" />
              <Label className="text-sm text-gray-800 dark:text-gray-200">Candles</Label>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Current: {formatInterval(dataFetchSettings.restIntervals.candles)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Interval in milliseconds"
                value={candlesInterval}
                onChange={(e) => setCandlesInterval(e.target.value)}
                className="flex-1"
                min="100"
                step="100"
              />
              <Button onClick={handleCandlesIntervalSubmit} size="sm">
                Apply
              </Button>
            </div>
          </div>

          {/* OrderBook interval */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500 dark:text-purple-400" />
              <Label className="text-sm text-gray-800 dark:text-gray-200">Order Book</Label>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Current: {formatInterval(dataFetchSettings.restIntervals.orderbook)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Interval in milliseconds"
                value={orderbookInterval}
                onChange={(e) => setOrderbookInterval(e.target.value)}
                className="flex-1"
                min="100"
                step="100"
              />
              <Button onClick={handleOrderbookIntervalSubmit} size="sm">
                Apply
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <span className="font-semibold text-yellow-800 dark:text-yellow-200">💡 Recommendations:</span>{' '}
            <span className="text-yellow-700 dark:text-yellow-300">
              Trades 500-1000ms, Candles 5000ms, OrderBook 200-500ms. 
              Too frequent requests may lead to API rate limit violations.
            </span>
          </div>
        </div>
      )}

      <Separator />

      {/* Active subscriptions information */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-blue-600 dark:text-blue-400">Active Subscriptions</Label>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Total active subscriptions: <span className="font-mono">{activeSubscriptions.length}</span>
        </div>
        
        {activeSubscriptions.length > 0 && (
          <div className="space-y-3 max-h-32 overflow-y-auto">
            {activeSubscriptions.map((subscription, index) => (
              <div key={index} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    subscription.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="font-mono text-gray-900 dark:text-gray-100">
                    {subscription.key.exchange}:{subscription.key.symbol}:{subscription.key.dataType}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 dark:text-gray-400">
                    {subscription.method === 'websocket' ? '📡' : '🔄'} {subscription.method}
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {subscription.subscriberCount} subscriber{subscription.subscriberCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubscriptions.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            No active subscriptions. Add data widgets to create subscriptions.
          </div>
        )}
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
        💡 Subscriptions are automatically deduplicated - if multiple widgets request the same data, only one connection is created.
      </div>
    </div>
  );
};

export const DataProviderSettingsWidget: React.FC = () => {
  return (
    <ErrorBoundary>
      <DataProviderSettingsWidgetInner />
    </ErrorBoundary>
  );
}; 