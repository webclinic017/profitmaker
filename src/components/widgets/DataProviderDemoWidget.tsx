import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { Badge } from '../ui/badge';
import { Activity, Users, Wifi, Database, Play, Square, Eye } from 'lucide-react';

interface DemoSubscriber {
  id: string;
  name: string;
  isActive: boolean;
  color: string;
}

const DataProviderDemoWidgetInner: React.FC = () => {
  const { 
    subscribe, 
    unsubscribe, 
    getTrades,
    getActiveSubscriptionsList,
    dataFetchSettings
  } = useDataProviderStore();

  const [exchange, setExchange] = useState('binance');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [subscribers, setSubscribers] = useState<DemoSubscriber[]>([
    { id: 'demo-1', name: 'Subscriber A', isActive: false, color: 'bg-blue-100 text-blue-800' },
    { id: 'demo-2', name: 'Subscriber B', isActive: false, color: 'bg-green-100 text-green-800' },
    { id: 'demo-3', name: 'Subscriber C', isActive: false, color: 'bg-purple-100 text-purple-800' },
    { id: 'demo-4', name: 'Subscriber D', isActive: false, color: 'bg-orange-100 text-orange-800' },
  ]);

  const activeSubscriptions = getActiveSubscriptionsList();
  const currentTrades = getTrades(exchange, symbol);
  
  // Find current subscription for our data
  const currentSubscription = activeSubscriptions.find(
    sub => sub.key.exchange === exchange && 
           sub.key.symbol === symbol && 
           sub.key.dataType === 'trades'
  );

  const toggleSubscriber = async (subscriberId: string) => {
    const subscriber = subscribers.find(s => s.id === subscriberId);
    if (!subscriber) return;

    if (subscriber.isActive) {
      // Unsubscribe
      unsubscribe(subscriberId, exchange, symbol, 'trades');
    } else {
      // Subscribe
      await subscribe(subscriberId, exchange, symbol, 'trades');
    }

    // Update local state
    setSubscribers(prev => 
      prev.map(s => 
        s.id === subscriberId ? { ...s, isActive: !s.isActive } : s
      )
    );
  };

  const toggleAllSubscribers = async () => {
    const allActive = subscribers.every(s => s.isActive);
    
    if (allActive) {
      // Unsubscribe all
      for (const subscriber of subscribers) {
        if (subscriber.isActive) {
          unsubscribe(subscriber.id, exchange, symbol, 'trades');
        }
      }
      setSubscribers(prev => prev.map(s => ({ ...s, isActive: false })));
    } else {
      // Subscribe all
      for (const subscriber of subscribers) {
        if (!subscriber.isActive) {
          await subscribe(subscriber.id, exchange, symbol, 'trades');
        }
      }
      setSubscribers(prev => prev.map(s => ({ ...s, isActive: true })));
    }
  };

  const activeSubscriberCount = subscribers.filter(s => s.isActive).length;
  const allActive = subscribers.every(s => s.isActive);
  const anyActive = subscribers.some(s => s.isActive);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Subscription Deduplication Demo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Data settings</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Exchange</Label>
              <Input
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                placeholder="binance"
                disabled={anyActive}
              />
            </div>
            <div>
              <Label className="text-xs">Trading pair</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="BTC/USDT"
                disabled={anyActive}
              />
            </div>
          </div>
          
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            📡 Fetch method: <strong>{dataFetchSettings.method === 'websocket' ? 'WebSocket' : 'REST'}</strong>
            {dataFetchSettings.method === 'rest' && (
              <span> (interval: {dataFetchSettings.restIntervals.trades}ms)</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Subscriber management */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Subscribers</Label>
            <Button
              onClick={toggleAllSubscribers}
              size="sm"
              variant={allActive ? "destructive" : "default"}
            >
                             {allActive ? (
                 <>
                   <Square className="h-4 w-4 mr-1" />
                   Unsubscribe all
                 </>
               ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Subscribe all
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {subscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  subscriber.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      subscriber.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm font-medium">{subscriber.name}</span>
                  </div>
                  <Button
                    onClick={() => toggleSubscriber(subscriber.id)}
                    size="sm"
                    variant={subscriber.isActive ? "destructive" : "outline"}
                  >
                    {subscriber.isActive ? 'Stop' : 'Start'}
                  </Button>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  ID: {subscriber.id}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Deduplication statistics */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Deduplication statistics</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Active subscribers</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{activeSubscriberCount}</div>
              <div className="text-xs text-gray-600">of {subscribers.length} total</div>
            </div>

            <div className="bg-green-50 p-3 rounded">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Real connections</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {currentSubscription ? 1 : 0}
              </div>
              <div className="text-xs text-gray-600">
                {currentSubscription ? 'Shared connection' : 'No connection'}
              </div>
            </div>
          </div>

          {currentSubscription && (
            <div className="bg-gray-50 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4" />
                <span className="text-sm font-medium">Connection information</span>
              </div>
              <div className="text-xs space-y-1">
                <div>🔑 Key: <span className="font-mono">{exchange}:{symbol}:trades</span></div>
                <div>👥 Subscribers: <span className="font-mono">{currentSubscription.subscriberCount}</span></div>
                <div>📡 Method: <span className="font-mono">{currentSubscription.method}</span></div>
                <div>🟢 Status: <span className="font-mono">{currentSubscription.isActive ? 'Active' : 'Inactive'}</span></div>
                <div>⏰ Last update: <span className="font-mono">
                  {currentSubscription.lastUpdate ? new Date(currentSubscription.lastUpdate).toLocaleTimeString() : 'Never'}
                </span></div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded">
            <strong>💡 Deduplication principle:</strong><br />
            No matter how many subscribers request the same data — the system creates only one connection to the API.
            This saves server resources and doesn't exceed API limits.
          </div>
        </div>

        <Separator />

        {/* Latest data */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Latest data ({currentTrades.length} trades)</Label>
          
          {currentTrades.length > 0 ? (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {currentTrades.slice(0, 5).map((trade, index) => (
                <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                  <span className={`font-mono ${trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                    {trade.side.toUpperCase()}
                  </span>
                  <span className="font-mono">{trade.price}</span>
                  <span className="font-mono">{trade.amount}</span>
                  <span className="text-gray-500">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-4">
              {anyActive ? 'Waiting for data...' : 'Activate subscribers to receive data'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const DataProviderDemoWidget: React.FC = () => {
  return (
    <ErrorBoundary>
      <DataProviderDemoWidgetInner />
    </ErrorBoundary>
  );
}; 