import React, { useState, useEffect, useMemo } from 'react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Label } from '../ui/label';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { Trade } from '../../types/dataProviders';
import { DollarSign, Hash, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface TradesWidgetV2Props {
  dashboardId?: string;
  widgetId?: string;
  initialExchange?: string;
  initialSymbol?: string;
}

const TradesWidgetV2Inner: React.FC<TradesWidgetV2Props> = ({
  dashboardId = 'default',
  widgetId = 'trades-widget-v2',
  initialExchange = 'binance',
  initialSymbol = 'BTC/USDT'
}) => {
  const { 
    getTrades, 
    getActiveSubscriptionsList
  } = useDataProviderStore();

  // Temporary filters (will be moved to settings later)
  const [filters] = useState({
    side: 'all',
    minPrice: '',
    maxPrice: '',
    minAmount: '',
    maxAmount: '',
    showLastN: '100'
  });

  // Temporary sorting (will be moved to settings later)
  const [sortBy] = useState<'timestamp' | 'price' | 'amount'>('timestamp');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  // Get data from store (using hardcoded values for now)
  const rawTrades = getTrades(initialExchange, initialSymbol);
  const activeSubscriptions = getActiveSubscriptionsList();
  
  // Check if there's an active subscription for current exchange/symbol
  const currentSubscription = activeSubscriptions.find(sub => 
    sub.key.exchange === initialExchange && 
    sub.key.symbol === initialSymbol && 
    sub.key.dataType === 'trades'
  );

  // Apply filters and sorting
  const processedTrades = useMemo(() => {
    let filtered = [...rawTrades];

    // Filter by trade side
    if (filters.side !== 'all') {
      filtered = filtered.filter(trade => trade.side === filters.side);
    }

    // Filter by price
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      if (!isNaN(minPrice)) {
        filtered = filtered.filter(trade => trade.price >= minPrice);
      }
    }
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      if (!isNaN(maxPrice)) {
        filtered = filtered.filter(trade => trade.price <= maxPrice);
      }
    }

    // Filter by volume
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount)) {
        filtered = filtered.filter(trade => trade.amount >= minAmount);
      }
    }
    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount)) {
        filtered = filtered.filter(trade => trade.amount <= maxAmount);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Limit the number of displayed trades
    const limit = parseInt(filters.showLastN);
    if (!isNaN(limit) && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [rawTrades, filters, sortBy, sortOrder]);

  // Statistics for filtered data
  const stats = useMemo(() => {
    if (processedTrades.length === 0) {
      return { totalAmount: 0, totalVolume: 0, avgPrice: 0, buyCount: 0, sellCount: 0 };
    }

    const totalAmount = processedTrades.reduce((sum, trade) => sum + trade.amount, 0);
    const totalVolume = processedTrades.reduce((sum, trade) => sum + (trade.price * trade.amount), 0);
    const avgPrice = totalVolume / totalAmount;
    const buyCount = processedTrades.filter(trade => trade.side === 'buy').length;
    const sellCount = processedTrades.filter(trade => trade.side === 'sell').length;

    return { totalAmount, totalVolume, avgPrice, buyCount, sellCount };
  }, [processedTrades]);

  const formatPrice = (price: number): string => {
    return price.toFixed(8).replace(/\.?0+$/, '');
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(8).replace(/\.?0+$/, '');
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
    return volume.toFixed(2);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Connection Status (minimal) */}
      {currentSubscription && (
        <div className="text-xs text-terminal-muted bg-terminal-widget p-2 rounded border border-terminal-border">
          <div className="flex items-center justify-between">
            <span>📡 {initialExchange.toUpperCase()} {initialSymbol}</span>
            <span className={`w-2 h-2 rounded-full ${currentSubscription.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          </div>
        </div>
      )}

      {/* Quick Statistics */}
      {processedTrades.length > 0 && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-terminal-widget p-2 rounded border border-terminal-border">
            <div className="flex items-center gap-1 text-terminal-muted">
              <Hash className="h-3 w-3" />
              <span>Volume:</span>
            </div>
            <div className="font-mono text-terminal-text">{formatAmount(stats.totalAmount)}</div>
          </div>
          <div className="bg-terminal-widget p-2 rounded border border-terminal-border">
            <div className="flex items-center gap-1 text-terminal-muted">
              <DollarSign className="h-3 w-3" />
              <span>Total:</span>
            </div>
            <div className="font-mono text-terminal-text">{formatVolume(stats.totalVolume)}</div>
          </div>
          <div className="bg-terminal-widget p-2 rounded border border-terminal-border">
            <div className="flex items-center gap-1 text-green-500">
              <TrendingUp className="h-3 w-3" />
              <span>Buys:</span>
            </div>
            <div className="font-mono text-terminal-text">{stats.buyCount}</div>
          </div>
          <div className="bg-terminal-widget p-2 rounded border border-terminal-border">
            <div className="flex items-center gap-1 text-red-500">
              <TrendingDown className="h-3 w-3" />
              <span>Sells:</span>
            </div>
            <div className="font-mono text-terminal-text">{stats.sellCount}</div>
          </div>
        </div>
      )}

      {/* Trades list header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-terminal-text">Trades</Label>
        <div className="text-xs text-terminal-muted">
          {rawTrades.length} total / {processedTrades.length} filtered
        </div>
      </div>

      {/* Trades list */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto space-y-1">
          {processedTrades.length === 0 ? (
            <div className="text-center text-terminal-muted py-8">
              {currentSubscription ? 'Waiting for trade data...' : 'No active subscription'}
            </div>
          ) : (
            processedTrades.map((trade, index) => (
              <div
                key={`${trade.id || index}-${trade.timestamp}`}
                className={`flex items-center justify-between text-xs p-2 rounded border-l-2 ${
                  trade.side === 'buy' 
                    ? 'bg-green-500/5 border-green-500 hover:bg-green-500/10' 
                    : 'bg-red-500/5 border-red-500 hover:bg-red-500/10'
                } transition-colors`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${trade.side === 'buy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-terminal-muted" />
                    <span className="font-mono text-terminal-muted">{formatTime(trade.timestamp)}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-mono font-medium text-terminal-text">
                    {formatPrice(trade.price)} × {formatAmount(trade.amount)}
                  </div>
                  <div className="text-terminal-muted">
                    ≈ {formatVolume(trade.price * trade.amount)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer info */}
      {!currentSubscription && (
        <div className="text-xs text-terminal-muted text-center py-2 border-t border-terminal-border">
          💡 Use settings to configure data source and filters
        </div>
      )}
    </div>
  );
};

export const TradesWidgetV2: React.FC<TradesWidgetV2Props> = (props) => {
  return (
    <ErrorBoundary>
      <TradesWidgetV2Inner {...props} />
    </ErrorBoundary>
  );
}; 