import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { RefreshCw, Play, Pause, Wifi, WifiOff, Activity, Loader2 } from 'lucide-react';
import { Timeframe, MarketType } from '../../types/dataProviders';
import { useExchangesList } from '../../hooks/useExchangesList';
import { useDataProviderStore } from '../../store/dataProviderStore';

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
  // Новые пропсы для управления редактированием
  isReadOnly?: boolean;
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
  isReadOnly = false
}) => {
  // Загружаем реальные данные из провайдеров с безопасной обработкой ошибок
  const { exchanges, loading: exchangesLoading, error: exchangesError } = useExchangesList();
  const { getMarketsForExchange } = useDataProviderStore();
  
  // Fallback данные на случай ошибок
  const fallbackExchanges = [
    { id: 'binance', name: 'Binance' },
    { id: 'bybit', name: 'Bybit' },
    { id: 'okx', name: 'OKX' },
    { id: 'kucoin', name: 'KuCoin' },
    { id: 'coinbase', name: 'Coinbase' },
    { id: 'kraken', name: 'Kraken' },
    { id: 'huobi', name: 'Huobi' },
    { id: 'gateio', name: 'Gate.io' }
  ];

  const safeExchanges = exchangesError || exchanges.length === 0 ? fallbackExchanges : exchanges;
  
  // Состояние для загрузки рынков и символов
  const [availableMarkets, setAvailableMarkets] = useState<string[]>(['spot', 'futures', 'margin']);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT',
    'XRP/USDT', 'DOT/USDT', 'DOGE/USDT', 'AVAX/USDT', 'MATIC/USDT'
  ]);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [symbolsLoading, setSymbolsLoading] = useState(false);

  // Безопасная загрузка рынков при изменении биржи
  useEffect(() => {
    if (!exchange || !getMarketsForExchange) {
      setAvailableMarkets(['spot', 'futures', 'margin']);
      return;
    }
    
    const loadMarkets = async () => {
      setMarketsLoading(true);
      try {
        console.log(`🔍 Loading markets for exchange: ${exchange}`);
        const markets = await getMarketsForExchange(exchange);
        console.log(`✅ Loaded markets for ${exchange}:`, markets);
        setAvailableMarkets(markets && markets.length > 0 ? markets : ['spot', 'futures', 'margin']);
      } catch (error) {
        console.error('❌ Failed to load markets:', error);
        setAvailableMarkets(['spot', 'futures', 'margin']);
      } finally {
        setMarketsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadMarkets, 100);
    return () => clearTimeout(timeoutId);
  }, [exchange, getMarketsForExchange]);

  // Загрузка символов (пока статические, но можно расширить)
  useEffect(() => {
    if (!exchange || !market) return;
    
    const loadSymbols = async () => {
      setSymbolsLoading(true);
      try {
        // TODO: Добавить загрузку реальных символов из провайдера
        const commonSymbols = [
          'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT',
          'XRP/USDT', 'DOT/USDT', 'DOGE/USDT', 'AVAX/USDT', 'MATIC/USDT',
          'LTC/USDT', 'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'FTM/USDT'
        ];
        setAvailableSymbols(commonSymbols);
      } catch (error) {
        console.error('Failed to load symbols:', error);
        setAvailableSymbols(['BTC/USDT', 'ETH/USDT']);
      } finally {
        setSymbolsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadSymbols, 50);
    return () => clearTimeout(timeoutId);
  }, [exchange, market]);
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
            {isReadOnly ? (
              <div className="h-8 px-3 py-2 bg-muted border border-input rounded-md text-sm flex items-center">
                {safeExchanges.find(ex => ex.id === exchange)?.name || exchange}
              </div>
            ) : (
              <Select value={exchange} onValueChange={onExchangeChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                  {exchangesLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </SelectTrigger>
                <SelectContent>
                  {safeExchanges.map(ex => (
                    <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Market</Label>
            {isReadOnly ? (
              <div className="h-8 px-3 py-2 bg-muted border border-input rounded-md text-sm flex items-center">
                {market.charAt(0).toUpperCase() + market.slice(1)}
              </div>
            ) : (
              <Select value={market} onValueChange={onMarketChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                  {marketsLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </SelectTrigger>
                <SelectContent>
                  {availableMarkets.map(m => (
                    <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Symbol</Label>
          {isReadOnly ? (
            <Input
              value={symbol}
              readOnly
              className="h-8 bg-muted"
            />
          ) : (
            <Select value={symbol} onValueChange={onSymbolChange}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select symbol..." />
                {symbolsLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </SelectTrigger>
              <SelectContent>
                {availableSymbols.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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