import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { RefreshCw, Play, Pause, Wifi, WifiOff, Activity } from 'lucide-react';
import { Timeframe, MarketType } from '../../types/dataProviders';

const EXCHANGES = [
  { id: 'binance', label: 'Binance' },
  { id: 'bybit', label: 'Bybit' },
  { id: 'okx', label: 'OKX' },
  { id: 'kucoin', label: 'KuCoin' },
];

const MARKETS: { id: MarketType; label: string }[] = [
  { id: 'spot', label: 'Spot' },
  { id: 'futures', label: 'Futures' },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '1m', label: '1M' },
  { id: '5m', label: '5M' },
  { id: '15m', label: '15M' },
  { id: '30m', label: '30M' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
];

interface ChartSettingsProps {
  exchange: string;
  symbol: string;
  timeframe: Timeframe;
  market: MarketType;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  dataFetchMethod: 'websocket' | 'rest';
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  onExchangeChange: (exchange: string) => void;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onMarketChange: (market: MarketType) => void;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}

const ChartSettings: React.FC<ChartSettingsProps> = ({
  exchange,
  symbol,
  timeframe,
  market,
  isSubscribed,
  isLoading,
  error,
  dataFetchMethod,
  connectionStatus,
  onExchangeChange,
  onSymbolChange,
  onTimeframeChange,
  onMarketChange,
  onSubscribe,
  onUnsubscribe,
}) => {
  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Activity className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Status */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Connection Status</Label>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex items-center gap-2">
            <span className="font-medium">{symbol}</span>
            <span className="text-muted-foreground">({exchange.toUpperCase()})</span>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus}
            </Badge>
          </div>
        </div>
        {error && (
          <div className="text-red-400 text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      <Separator />

      {/* Exchange Settings */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Market Configuration</Label>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Exchange</Label>
            <Select value={exchange} onValueChange={onExchangeChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCHANGES.map(ex => (
                  <SelectItem key={ex.id} value={ex.id}>{ex.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Market</Label>
            <Select value={market} onValueChange={onMarketChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Symbol</Label>
          <Input
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
            placeholder="BTC/USDT"
            className="h-8"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Timeframe</Label>
          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map(tf => (
                <SelectItem key={tf.id} value={tf.id}>{tf.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Connection Control */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Data Connection</Label>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            Method: {dataFetchMethod.toUpperCase()}
          </Badge>
          
          <Button
            onClick={isSubscribed ? onUnsubscribe : onSubscribe}
            disabled={isLoading}
            size="sm"
            variant={isSubscribed ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : isSubscribed ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isLoading ? 'Loading...' : isSubscribed ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>• WebSocket provides real-time updates</p>
          <p>• REST polling updates at intervals</p>
          <p>• Chart data is cached for performance</p>
        </div>
      </div>
    </div>
  );
};

export default ChartSettings; 