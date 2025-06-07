import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCandles, useTrades, useOrderBook, useDataProviders } from '../../hooks/useDataProvider';
import { formatTimestamp, formatPrice, formatVolume } from '../../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Wifi,
  WifiOff,
  BarChart3,
  BookOpen,
  ArrowUpDown
} from 'lucide-react';

interface MarketDataWidgetProps {
  dashboardId?: string;
  widgetId?: string;
  initialSymbol?: string;
  initialExchange?: string;
  showCandles?: boolean;
  showTrades?: boolean;
  showOrderBook?: boolean;
}

export const MarketDataWidget: React.FC<MarketDataWidgetProps> = ({
  dashboardId = 'demo',
  widgetId = 'market-data-widget',
  initialSymbol = 'BTC/USDT',
  initialExchange = 'binance',
  showCandles = true,
  showTrades = true,
  showOrderBook = true
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [exchange, setExchange] = useState(initialExchange);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>();

  const { providers, activeProvider } = useDataProviders();

  // Data subscriptions
  const candles = useCandles(
    symbol, 
    exchange, 
    selectedProvider, 
    dashboardId, 
    `${widgetId}-candles`
  );

  const trades = useTrades(
    symbol, 
    exchange, 
    selectedProvider, 
    dashboardId, 
    `${widgetId}-trades`
  );

  const orderbook = useOrderBook(
    symbol, 
    exchange, 
    selectedProvider, 
    dashboardId, 
    `${widgetId}-orderbook`
  );

  // Get last candle for price display
  const lastCandle = candles.data && candles.data.length > 0 
    ? candles.data[candles.data.length - 1] 
    : null;

  const priceChange = lastCandle && candles.data && candles.data.length > 1
    ? lastCandle.close - candles.data[candles.data.length - 2].close
    : 0;

  const priceChangePercent = lastCandle && candles.data && candles.data.length > 1
    ? (priceChange / candles.data[candles.data.length - 2].close) * 100
    : 0;

  // Get recent trades
  const recentTrades = trades.data?.slice(-10) || [];

  // Get best bid/ask
  const bestBid = orderbook.data?.bids[0];
  const bestAsk = orderbook.data?.asks[0];
  const spread = bestBid && bestAsk ? bestAsk.price - bestBid.price : 0;

  const getConnectionStatus = () => {
    const anyConnected = (showCandles && candles.isSubscribed) ||
                        (showTrades && trades.isSubscribed) ||
                        (showOrderBook && orderbook.isSubscribed);
    
    const anyLoading = (showCandles && candles.loading) ||
                      (showTrades && trades.loading) ||
                      (showOrderBook && orderbook.loading);

    if (anyLoading) return 'connecting';
    if (anyConnected) return 'connected';
    return 'disconnected';
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-4 p-4">
      {/* Header and settings */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && <Wifi className="h-4 w-4 text-green-500" />}
            {connectionStatus === 'connecting' && <Activity className="h-4 w-4 text-yellow-500 animate-spin" />}
            {connectionStatus === 'disconnected' && <WifiOff className="h-4 w-4 text-gray-500" />}
            <h2 className="text-lg font-semibold">Market Data</h2>
          </div>
          <Badge variant="outline">{symbol}</Badge>
          <Badge variant="secondary">{exchange}</Badge>
        </div>
        {activeProvider && (
          <Badge variant="outline" className="text-xs">
            {activeProvider.name}
          </Badge>
        )}
      </div>

      {/* Symbol settings */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Trading Pair</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="BTC/USDT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <Input
                id="exchange"
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                placeholder="binance"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main price information */}
      {showCandles && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            {candles.loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4 animate-spin" />
                Loading candles...
              </div>
            ) : candles.error ? (
              <div className="text-red-500 text-sm">{candles.error}</div>
            ) : lastCandle ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold">
                    {formatPrice(lastCandle.close)}
                  </span>
                  <div className={`flex items-center gap-1 ${
                    priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {priceChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span className="font-medium">
                      {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)}
                    </span>
                    <span className="text-sm">
                      ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Open</p>
                    <p className="font-medium">{formatPrice(lastCandle.open)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">High</p>
                    <p className="font-medium text-green-600">{formatPrice(lastCandle.high)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Low</p>
                    <p className="font-medium text-red-600">{formatPrice(lastCandle.low)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Volume</p>
                    <p className="font-medium">{formatVolume(lastCandle.volume)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Updated: {formatTimestamp(candles.lastUpdate)}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No candle data</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order book */}
      {showOrderBook && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Order Book
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderbook.loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4 animate-spin" />
                Loading order book...
              </div>
            ) : orderbook.error ? (
              <div className="text-red-500 text-sm">{orderbook.error}</div>
            ) : orderbook.data ? (
              <div className="space-y-3">
                {/* Spread */}
                {bestBid && bestAsk && (
                  <div className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                    <span className="text-muted-foreground">Spread:</span>
                    <span className="font-medium">{formatPrice(spread)}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Buy orders */}
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-2">Buy (Bid)</h4>
                    <div className="space-y-1">
                      {orderbook.data.bids.slice(0, 5).map((bid, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-green-600">{formatPrice(bid.price)}</span>
                          <span className="text-muted-foreground">{formatVolume(bid.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sell orders */}
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">Sell (Ask)</h4>
                    <div className="space-y-1">
                      {orderbook.data.asks.slice(0, 5).map((ask, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-red-600">{formatPrice(ask.price)}</span>
                          <span className="text-muted-foreground">{formatVolume(ask.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Updated: {formatTimestamp(orderbook.lastUpdate)}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No order book data</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent trades */}
      {showTrades && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Recent Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trades.loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4 animate-spin" />
                Loading trades...
              </div>
            ) : trades.error ? (
              <div className="text-red-500 text-sm">{trades.error}</div>
            ) : recentTrades.length > 0 ? (
              <div className="space-y-2">
                {recentTrades.map((trade, index) => (
                  <div key={trade.id || index} className="flex justify-between items-center py-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={trade.side === 'buy' ? 'default' : 'destructive'} 
                        className="text-xs px-1 py-0"
                      >
                        {trade.side}
                      </Badge>
                      <span className={trade.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
                        {formatPrice(trade.price)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">{formatVolume(trade.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Clock className="h-3 w-3" />
                  Updated: {formatTimestamp(trades.lastUpdate)}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No trade data</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 