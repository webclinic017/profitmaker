import React, { useState, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useOrderBookWidgetsStore } from '../../store/orderBookWidgetStore';
import { OrderBook, OrderBookEntry } from '../../types/dataProviders';

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

  const { getWidget, updateWidget, setWidgetSettings } = useOrderBookWidgetsStore();
  
  const widget = getWidget(widgetId);
  
  // Use widget state from store
  const {
    exchange,
    symbol,
    market,
    displayDepth,
    showCumulative,
    priceDecimals,
    amountDecimals,
    isSubscribed,
    isLoading,
    error
  } = widget;

  // Get data from store (automatically updated) with market from store
  const rawOrderBook = getOrderBook(exchange, symbol, market as any);
  const activeSubscriptions = getActiveSubscriptionsList();
  
  // Detailed logging of orderbook data
  React.useEffect(() => {
    console.log(`📊 [OrderBook-${widgetId}] Raw data received:`, {
      exchange,
      symbol,
      market,
      rawOrderBook,
      hasData: !!rawOrderBook,
      dataKeys: rawOrderBook ? Object.keys(rawOrderBook) : null,
      bidsLength: rawOrderBook?.bids?.length || 0,
      asksLength: rawOrderBook?.asks?.length || 0,
      timestamp: rawOrderBook?.timestamp,
      firstBid: rawOrderBook?.bids?.[0],
      firstAsk: rawOrderBook?.asks?.[0]
    });
  }, [rawOrderBook, exchange, symbol, market, widgetId]);
  
  // Check if there's an active subscription for current exchange/symbol/market
  const currentSubscription = activeSubscriptions.find(sub => 
    sub.key.exchange === exchange && 
    sub.key.symbol === symbol && 
    sub.key.dataType === 'orderbook' &&
    sub.key.market === market
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
      
      // Just subscribe - store will decide whether to use REST or WebSocket, using market from store
      subscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market as any);
      console.log(`📊 OrderBook widget subscribed to data: ${exchange} ${symbol} ${market} market (method: ${dataFetchSettings.method})`);

      return () => {
        unsubscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market as any);
        console.log(`📊 OrderBook widget unsubscribed from data: ${exchange} ${symbol} ${market} market`);
      };
    }
  }, [isSubscribed, exchange, symbol, market, activeProviderId, subscribe, unsubscribe, dashboardId, widgetId, dataFetchSettings.method]);

  const handleSubscribe = async () => {
    if (!activeProviderId) {
      console.error('❌ No active provider');
      return;
    }

    try {
      updateWidget(widgetId, { isSubscribed: true, isLoading: true, error: null });
      console.log(`🚀 Starting orderbook subscription: ${exchange} ${symbol}`);
    } catch (error) {
      console.error('❌ Error subscribing to orderbook:', error);
      updateWidget(widgetId, { 
        error: error instanceof Error ? error.message : 'Subscription failed',
        isLoading: false,
        isSubscribed: false
      });
    }
  };

  const handleUnsubscribe = () => {
    updateWidget(widgetId, { isSubscribed: false });
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

  // Subscribe automatically on component mount
  useEffect(() => {
    handleSubscribe();
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {!processedOrderBook ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            {(() => {
              console.log(`🎨 [OrderBook-${widgetId}] Render: No processed data`, {
                isSubscribed,
                hasRawData: !!rawOrderBook,
                processedOrderBook
              });
              return isSubscribed ? 'Waiting for data...' : 'Subscribe to receive orderbook data';
            })()}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-1">
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
          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-500 px-2 py-1 border-b border-gray-200">
            <div>Price</div>
            <div className="text-right">Volume</div>
            <div className="text-right">{showCumulative ? 'Cumul.' : 'Total'}</div>
          </div>

          {/* Asks (sells) - top */}
          <div className="flex-1 overflow-y-auto">
            {processedOrderBook.asks.slice().reverse().map((ask, index) => (
              <div key={`ask-${index}`} className="grid grid-cols-3 gap-2 text-xs p-1 bg-red-50 hover:bg-red-100 border-l-2 border-red-500">
                <div className="font-mono text-red-600">{formatPrice(ask.price)}</div>
                <div className="font-mono text-right">{formatAmount(ask.amount)}</div>
                <div className="font-mono text-right text-gray-600">
                  {showCumulative ? formatAmount((ask as any).cumulative || 0) : formatVolume(ask.total)}
                </div>
              </div>
            ))}
          </div>

          {/* Spread */}
          <div className="bg-gray-100 p-2 text-center border-y border-gray-200">
            <div className="text-xs text-gray-600">Spread: {formatPrice(processedOrderBook.spread)}</div>
            <div className="text-xs text-gray-500">({processedOrderBook.spreadPercent.toFixed(4)}%)</div>
          </div>

          {/* Bids (buys) - bottom */}
          <div className="flex-1 overflow-y-auto">
            {processedOrderBook.bids.map((bid, index) => (
              <div key={`bid-${index}`} className="grid grid-cols-3 gap-2 text-xs p-1 bg-green-50 hover:bg-green-100 border-l-2 border-green-500">
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
  );
};

export const OrderBookWidgetV2: React.FC<OrderBookWidgetV2Props> = (props) => {
  return (
    <ErrorBoundary>
      <OrderBookWidgetV2Inner {...props} />
    </ErrorBoundary>
  );
}; 