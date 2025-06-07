import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { OrderBook, OrderBookEntry } from '../../types/dataProviders';
import { BookOpen, TrendingUp, TrendingDown, DollarSign, BarChart } from 'lucide-react';

interface OrderBookWidgetV2Props {
  dashboardId?: string;
  widgetId?: string;
  initialExchange?: string;
  initialSymbol?: string;
}

const OrderBookWidgetV2Inner: React.FC<OrderBookWidgetV2Props> = ({
  dashboardId = 'default',
  widgetId = 'orderbook-widget-v2',
  initialExchange = 'binance',
  initialSymbol = 'BTC/USDT'
}) => {
  const { 
    subscribe, 
    unsubscribe, 
    getOrderBook, 
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList
  } = useDataProviderStore();

  // Settings state
  const [exchange, setExchange] = useState(initialExchange);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Display settings
  const [displayDepth, setDisplayDepth] = useState(10);
  const [showCumulative, setShowCumulative] = useState(true);
  const [priceDecimals, setPriceDecimals] = useState(2);
  const [amountDecimals, setAmountDecimals] = useState(4);

  // Get data from store (automatically updated)
  const rawOrderBook = getOrderBook(exchange, symbol);
  const activeSubscriptions = getActiveSubscriptionsList();
  
  // Detailed logging of orderbook data
  React.useEffect(() => {
    console.log(`📊 [OrderBook-${widgetId}] Raw data received:`, {
      exchange,
      symbol,
      rawOrderBook,
      hasData: !!rawOrderBook,
      dataKeys: rawOrderBook ? Object.keys(rawOrderBook) : null,
      bidsLength: rawOrderBook?.bids?.length || 0,
      asksLength: rawOrderBook?.asks?.length || 0,
      timestamp: rawOrderBook?.timestamp,
      firstBid: rawOrderBook?.bids?.[0],
      firstAsk: rawOrderBook?.asks?.[0]
    });
  }, [rawOrderBook, exchange, symbol, widgetId]);
  
  // Check if there's an active subscription for current exchange/symbol
  const currentSubscriptionKey = `${exchange}:${symbol}:orderbook`;
  const currentSubscription = activeSubscriptions.find(sub => 
    sub.key.exchange === exchange && 
    sub.key.symbol === symbol && 
    sub.key.dataType === 'orderbook'
  );

  // Processing and formatting orderbook data
  const processedOrderBook = useMemo(() => {
    console.log(`🔄 [OrderBook-${widgetId}] Processing orderbook data:`, {
      hasRawData: !!rawOrderBook,
      rawOrderBook: rawOrderBook
    });
    
    if (!rawOrderBook) {
      console.log(`❌ [OrderBook-${widgetId}] No raw orderbook data`);
      return null;
    }

    try {
      // Check that data is in correct format
      if (!rawOrderBook.bids || !rawOrderBook.asks || 
          !Array.isArray(rawOrderBook.bids) || !Array.isArray(rawOrderBook.asks)) {
        console.warn(`❌ [OrderBook-${widgetId}] Invalid orderbook data format:`, {
          rawOrderBook,
          hasBids: !!rawOrderBook.bids,
          hasAsks: !!rawOrderBook.asks,
          bidsIsArray: Array.isArray(rawOrderBook.bids),
          asksIsArray: Array.isArray(rawOrderBook.asks),
          bidsType: typeof rawOrderBook.bids,
          asksType: typeof rawOrderBook.asks
        });
        return null;
      }

      // Log format of first entry for debugging
      if (rawOrderBook.bids.length > 0) {
        const firstBid = rawOrderBook.bids[0];
        console.log(`📊 [OrderBook-${widgetId}] Format sample - bid:`, {
          isArray: Array.isArray(firstBid),
          type: typeof firstBid,
          value: firstBid,
          keys: firstBid && typeof firstBid === 'object' ? Object.keys(firstBid) : null
        });
      }
      
      if (rawOrderBook.asks.length > 0) {
        const firstAsk = rawOrderBook.asks[0];
        console.log(`📊 [OrderBook-${widgetId}] Format sample - ask:`, {
          isArray: Array.isArray(firstAsk),
          type: typeof firstAsk,
          value: firstAsk,
          keys: firstAsk && typeof firstAsk === 'object' ? Object.keys(firstAsk) : null
        });
      }

      const formatEntry = (entry: OrderBookEntry | [number, number]) => {
        // Handle array format [price, amount] from CCXT Pro
        if (Array.isArray(entry)) {
          const [price, amount] = entry;
          if (typeof price !== 'number' || typeof amount !== 'number') {
            console.warn(`❌ [OrderBook-${widgetId}] Invalid orderbook array entry:`, {
              entry,
              price,
              amount,
              priceType: typeof price,
              amountType: typeof amount
            });
            return null;
          }
          return {
            price,
            amount,
            total: price * amount
          };
        }
        
        // Handle object format {price, amount}
        if (!entry || typeof entry.price !== 'number' || typeof entry.amount !== 'number') {
          console.warn(`❌ [OrderBook-${widgetId}] Invalid orderbook object entry:`, {
            entry,
            hasPrice: 'price' in entry,
            hasAmount: 'amount' in entry,
            priceType: typeof entry.price,
            amountType: typeof entry.amount
          });
          return null;
        }
        return {
          price: entry.price,
          amount: entry.amount,
          total: entry.price * entry.amount
        };
      };

      // Take only needed depth and filter null values
      const bids = (rawOrderBook.bids as (OrderBookEntry | [number, number])[]).slice(0, displayDepth).map(formatEntry).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      const asks = (rawOrderBook.asks as (OrderBookEntry | [number, number])[]).slice(0, displayDepth).map(formatEntry).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      
      console.log(`📊 [OrderBook-${widgetId}] Processed entries:`, {
        originalBidsLength: rawOrderBook.bids.length,
        originalAsksLength: rawOrderBook.asks.length,
        processedBidsLength: bids.length,
        processedAsksLength: asks.length,
        displayDepth,
        sampleBid: bids[0],
        sampleAsk: asks[0]
      });

    // Add cumulative volumes if needed
    if (showCumulative) {
      let bidsCumulative = 0;
      let asksCumulative = 0;

      bids.forEach(bid => {
        bidsCumulative += bid.amount;
        (bid as any).cumulative = bidsCumulative;
      });

      asks.forEach(ask => {
        asksCumulative += ask.amount;
        (ask as any).cumulative = asksCumulative;
      });
    }

      const result = {
        bids,
        asks,
        timestamp: rawOrderBook.timestamp,
        spread: asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0,
        spreadPercent: asks.length > 0 && bids.length > 0 
          ? ((asks[0].price - bids[0].price) / bids[0].price) * 100 
          : 0
      };
      
      console.log(`✅ [OrderBook-${widgetId}] Processing completed successfully:`, {
        result,
        hasBids: result.bids.length > 0,
        hasAsks: result.asks.length > 0,
        spread: result.spread,
        spreadPercent: result.spreadPercent
      });
      
      return result;
    } catch (error) {
      console.error(`❌ [OrderBook-${widgetId}] Error processing orderbook data:`, error);
      return null;
    }
  }, [rawOrderBook, displayDepth, showCumulative, widgetId]);

  // Statistics
  const stats = useMemo(() => {
    if (!processedOrderBook) {
      return { 
        bidVolume: 0, 
        askVolume: 0, 
        bidCount: 0, 
        askCount: 0,
        totalVolume: 0,
        bestBid: 0,
        bestAsk: 0
      };
    }

    const bidVolume = processedOrderBook.bids.reduce((sum, bid) => sum + bid.total, 0);
    const askVolume = processedOrderBook.asks.reduce((sum, ask) => sum + ask.total, 0);
    const bestBid = processedOrderBook.bids.length > 0 ? processedOrderBook.bids[0].price : 0;
    const bestAsk = processedOrderBook.asks.length > 0 ? processedOrderBook.asks[0].price : 0;

    return { 
      bidVolume, 
      askVolume, 
      bidCount: processedOrderBook.bids.length,
      askCount: processedOrderBook.asks.length,
      totalVolume: bidVolume + askVolume,
      bestBid,
      bestAsk
    };
  }, [processedOrderBook]);

  // Automatic data subscription (store manages the fetch method itself)
  useEffect(() => {
    if (isSubscribed && activeProviderId) {
      const subscriberId = `${dashboardId}-${widgetId}`;
      
      // Just subscribe - store will decide whether to use REST or WebSocket
      subscribe(subscriberId, exchange, symbol, 'orderbook');
      console.log(`📊 OrderBook widget subscribed to data: ${exchange} ${symbol} (method: ${dataFetchSettings.method})`);

      return () => {
        unsubscribe(subscriberId, exchange, symbol, 'orderbook');
        console.log(`📊 OrderBook widget unsubscribed from data: ${exchange} ${symbol}`);
      };
    }
  }, [isSubscribed, exchange, symbol, activeProviderId, subscribe, unsubscribe, dashboardId, widgetId, dataFetchSettings.method]);

  const handleSubscribe = async () => {
    if (!activeProviderId) {
      console.error('❌ No active provider');
      return;
    }

    try {
      setIsSubscribed(true);
      console.log(`🚀 Starting orderbook subscription: ${exchange} ${symbol}`);
    } catch (error) {
      console.error('❌ Error subscribing to orderbook:', error);
      setIsSubscribed(false);
    }
  };

  const handleUnsubscribe = () => {
    setIsSubscribed(false);
    console.log(`🛑 Stopping orderbook subscription: ${exchange} ${symbol}`);
  };

  const formatPrice = (price: number): string => {
    return price.toFixed(priceDecimals);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(amountDecimals);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
    return volume.toFixed(2);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Order Book {isSubscribed && <span className="text-green-500 text-sm">(🔴 LIVE)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection settings */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm">Exchange</Label>
              <Input
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                placeholder="binance"
                disabled={isSubscribed}
              />
            </div>
            <div>
              <Label className="text-sm">Trading pair</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="BTC/USDT"
                disabled={isSubscribed}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSubscribed ? (
              <Button onClick={handleSubscribe} className="flex-1" disabled={!activeProviderId}>
                {activeProviderId ? 'Subscribe to orderbook' : 'No active provider'}
              </Button>
            ) : (
              <Button onClick={handleUnsubscribe} variant="destructive" className="flex-1">
                Unsubscribe
              </Button>
            )}
          </div>

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

        <Separator />

        {/* Display settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Display settings</Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Depth</Label>
              <Select value={displayDepth.toString()} onValueChange={(value) => setDisplayDepth(parseInt(value))}>
                <SelectTrigger>
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
              <Label className="text-xs">Price decimals</Label>
              <Select value={priceDecimals.toString()} onValueChange={(value) => setPriceDecimals(parseInt(value))}>
                <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Volume decimals</Label>
              <Select value={amountDecimals.toString()} onValueChange={(value) => setAmountDecimals(parseInt(value))}>
                <SelectTrigger>
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
              <input
                type="checkbox"
                id="show-cumulative"
                checked={showCumulative}
                onChange={(e) => setShowCumulative(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="show-cumulative" className="text-xs">Cumulative volume</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Statistics */}
        {processedOrderBook && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Statistics</Label>
            
            {/* Spread */}
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-xs text-gray-600 mb-1">Spread</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{formatPrice(processedOrderBook.spread)}</span>
                <span className="text-xs text-gray-500">
                  {processedOrderBook.spreadPercent.toFixed(4)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-green-50 p-2 rounded">
                <div className="flex items-center gap-1 text-green-700">
                  <TrendingUp className="h-3 w-3" />
                  <span>Buy orders</span>
                </div>
                <div className="font-mono">{stats.bidCount} levels</div>
                <div className="font-mono text-green-600">{formatVolume(stats.bidVolume)}</div>
              </div>
              <div className="bg-red-50 p-2 rounded">
                <div className="flex items-center gap-1 text-red-700">
                  <TrendingDown className="h-3 w-3" />
                  <span>Sell orders</span>
                </div>
                <div className="font-mono">{stats.askCount} levels</div>
                <div className="font-mono text-red-600">{formatVolume(stats.askVolume)}</div>
              </div>
            </div>

            <div className="bg-blue-50 p-2 rounded">
              <div className="flex items-center gap-1 text-blue-700 text-xs mb-1">
                <BarChart className="h-3 w-3" />
                <span>Best prices</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600">Bid: {formatPrice(stats.bestBid)}</span>
                <span className="text-red-600">Ask: {formatPrice(stats.bestAsk)}</span>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* OrderBook */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Order Book</Label>
          
          {!processedOrderBook ? (
            <div className="text-center text-gray-400 py-4">
              {(() => {
                console.log(`🎨 [OrderBook-${widgetId}] Render: No processed data`, {
                  isSubscribed,
                  hasRawData: !!rawOrderBook,
                  processedOrderBook
                });
                return isSubscribed ? 'Waiting for data...' : 'Subscribe to receive orderbook data';
              })()}
            </div>
          ) : (
            <div className="space-y-1">
              {(() => {
                console.log(`🎨 [OrderBook-${widgetId}] Render: Displaying orderbook data`, {
                  bidsCount: processedOrderBook.bids.length,
                  asksCount: processedOrderBook.asks.length,
                  spread: processedOrderBook.spread,
                  timestamp: processedOrderBook.timestamp
                });
                return null;
              })()}
              
              {/* Headers */}
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 px-2">
                <div>Price</div>
                <div className="text-right">Volume</div>
                <div className="text-right">{showCumulative ? 'Cumul.' : 'Total'}</div>
              </div>

              {/* Asks (sells) - top */}
              <div className="max-h-32 overflow-y-auto">
                {processedOrderBook.asks.slice().reverse().map((ask, index) => (
                  <div key={`ask-${index}`} className="grid grid-cols-3 gap-2 text-xs p-1 bg-red-50 border-l-2 border-red-500">
                    <div className="font-mono text-red-600">{formatPrice(ask.price)}</div>
                    <div className="font-mono text-right">{formatAmount(ask.amount)}</div>
                    <div className="font-mono text-right text-gray-600">
                      {showCumulative ? formatAmount((ask as any).cumulative || 0) : formatVolume(ask.total)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Spread */}
              <div className="bg-gray-100 p-2 text-center">
                <div className="text-xs text-gray-600">Spread: {formatPrice(processedOrderBook.spread)}</div>
                <div className="text-xs text-gray-500">({processedOrderBook.spreadPercent.toFixed(4)}%)</div>
              </div>

              {/* Bids (buys) - bottom */}
              <div className="max-h-32 overflow-y-auto">
                {processedOrderBook.bids.map((bid, index) => (
                  <div key={`bid-${index}`} className="grid grid-cols-3 gap-2 text-xs p-1 bg-green-50 border-l-2 border-green-500">
                    <div className="font-mono text-green-600">{formatPrice(bid.price)}</div>
                    <div className="font-mono text-right">{formatAmount(bid.amount)}</div>
                    <div className="font-mono text-right text-gray-600">
                      {showCumulative ? formatAmount((bid as any).cumulative || 0) : formatVolume(bid.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isSubscribed && (
          <div className="text-xs text-gray-400 text-center pt-2 border-t">
            💡 Widget automatically deduplicates subscriptions - if multiple widgets request the same data, only one connection is created.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const OrderBookWidgetV2: React.FC<OrderBookWidgetV2Props> = (props) => {
  return (
    <ErrorBoundary>
      <OrderBookWidgetV2Inner {...props} />
    </ErrorBoundary>
  );
}; 