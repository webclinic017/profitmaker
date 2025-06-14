import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Filter, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useTradesWidgetsStore } from '../../store/tradesWidgetStore';
import { useGroupStore } from '../../store/groupStore';

interface TradesSettingsWrapperProps {
  widgetId: string;
}

const TradesSettingsWrapper: React.FC<TradesSettingsWrapperProps> = ({ widgetId }) => {
  const { 
    subscribe, 
    unsubscribe, 
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList
  } = useDataProviderStore();

  // Widget store integration
  const { getWidget, updateWidget } = useTradesWidgetsStore();
  const widgetState = getWidget(widgetId);

  // Group store integration - берем данные из выбранной группы
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();
  const selectedGroup = globalSelectedGroupId ? getGroupById(globalSelectedGroupId) : getTransparentGroup();

  // Получаем данные инструмента из selectedGroup
  const exchange = selectedGroup?.exchange || 'binance';
  const symbol = selectedGroup?.tradingPair || 'BTC/USDT';
  const market = selectedGroup?.market || 'spot';

  // Filters state
  const [filters, setFilters] = useState({
    side: 'all', // 'all', 'buy', 'sell'
    minPrice: '',
    maxPrice: '',
    minAmount: '',
    maxAmount: '',
    showLastN: '100'
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<'timestamp' | 'price' | 'amount'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Display state
  const [autoScroll, setAutoScroll] = useState(true);

  // Get current subscription info
  const activeSubscriptions = getActiveSubscriptionsList();
  const currentSubscription = activeSubscriptions.find(sub => 
    sub.key.exchange === exchange && 
    sub.key.symbol === symbol && 
    sub.key.dataType === 'trades' &&
    sub.key.market === market
  );

  return (
    <div className="space-y-6">
      {/* Trades Configuration */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4" />
            <Label className="text-sm font-medium text-terminal-text">Trades Configuration</Label>
          </div>
          <p className="text-xs text-terminal-muted mb-3">Configure trades data aggregation and limits</p>
        </div>
        
        <div className="space-y-3">
          {/* Aggregate Trades Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Aggregate Trades</Label>
              <p className="text-xs text-terminal-muted/70">Combine multiple trades into one for better performance</p>
            </div>
            <Switch
              checked={widgetState.isAggregatedTrades}
              onCheckedChange={(checked) => updateWidget(widgetId, { isAggregatedTrades: checked })}
            />
          </div>

          {/* Show Table Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Show Table Header</Label>
            </div>
            <Switch
              checked={widgetState.showTableHeader}
              onCheckedChange={(checked) => updateWidget(widgetId, { showTableHeader: checked })}
            />
          </div>

          {/* Show Statistics */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Show Statistics</Label>
            </div>
            <Switch
              checked={widgetState.showStats}
              onCheckedChange={(checked) => updateWidget(widgetId, { showStats: checked })}
            />
          </div>

          {/* Trades Limit */}
          <div className="space-y-2">
            <Label className="text-xs text-terminal-muted">Trades Limit</Label>
            <Select 
              value={widgetState.tradesLimit.toString()} 
              onValueChange={(value) => updateWidget(widgetId, { tradesLimit: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 trades</SelectItem>
                <SelectItem value="200">200 trades</SelectItem>
                <SelectItem value="500">500 trades</SelectItem>
                <SelectItem value="1000">1000 trades</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current Instrument Display */}
          <div className="p-3 rounded border bg-terminal-widget border-terminal-border space-y-2">
            <div className="text-xs text-terminal-muted">Current Instrument:</div>
            <div className="text-sm text-terminal-text">
              <strong>{exchange}</strong> • <strong>{symbol}</strong> • <strong>{market}</strong>
            </div>
            
            {/* Subscription Status */}
            {currentSubscription && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">
                    📡 Method: <strong>
                      {currentSubscription.method === 'websocket' 
                        ? 'WebSocket' 
                        : currentSubscription.isFallback 
                          ? 'REST (fallback)'
                          : 'REST'
                      }
                    </strong>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${currentSubscription.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                </div>
                
                {currentSubscription.isFallback && (
                  <div className="text-orange-600 bg-orange-100 p-2 rounded text-xs">
                    ⚠️ WebSocket unavailable, using REST fallback
                  </div>
                )}
                
                <div className="text-xs">👥 Subscribers: <strong>{currentSubscription.subscriberCount}</strong></div>
                {currentSubscription.lastUpdate > 0 && (
                  <div className="text-xs">🕐 Last update: <strong>{new Date(currentSubscription.lastUpdate).toLocaleTimeString()}</strong></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4" />
            <Label className="text-sm font-medium text-terminal-text">Filters</Label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-terminal-muted">Side</Label>
              <Select value={filters.side} onValueChange={(value) => setFilters(prev => ({ ...prev, side: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All trades</SelectItem>
                  <SelectItem value="buy">Buy only</SelectItem>
                  <SelectItem value="sell">Sell only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-terminal-muted">Show last</Label>
              <Input
                type="number"
                value={filters.showLastN}
                onChange={(e) => setFilters(prev => ({ ...prev, showLastN: e.target.value }))}
                placeholder="100"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-terminal-muted">Min. price</Label>
              <Input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-terminal-muted">Max. price</Label>
              <Input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                placeholder="No limit"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-terminal-muted">Min. volume</Label>
              <Input
                type="number"
                value={filters.minAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-terminal-muted">Max. volume</Label>
              <Input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                placeholder="No limit"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Sorting */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Sorting</Label>
          <p className="text-xs text-terminal-muted">Configure how trades are sorted</p>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-terminal-muted">Sort by</Label>
            <div className="flex items-center gap-2 mt-1">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Time</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="amount">Volume</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Display Options */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Display Options</Label>
          <p className="text-xs text-terminal-muted">Configure how trades are displayed</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-scroll" className="text-sm text-terminal-text">Auto-scroll to new trades</Label>
            <p className="text-xs text-terminal-muted">Automatically scroll to show latest trades</p>
          </div>
          <Switch
            id="auto-scroll"
            checked={autoScroll}
            onCheckedChange={setAutoScroll}
          />
        </div>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={() => {
          setFilters({
            side: 'all',
            minPrice: '',
            maxPrice: '',
            minAmount: '',
            maxAmount: '',
            showLastN: '100'
          });
          setSortBy('timestamp');
          setSortOrder('desc');
          setAutoScroll(true);
        }}>
          Reset to Default
        </Button>
      </div>
    </div>
  );
};

export default TradesSettingsWrapper; 