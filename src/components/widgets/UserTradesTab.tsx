import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { ExchangeAccount } from '../../store/userStore';
import { UserTradingDataWidgetSettings } from '../../store/userTradingDataWidgetStore';

interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  cost: number;
  fee?: {
    cost: number;
    currency: string;
  };
  order?: string;
  info?: any;
}

interface UserTradesTabProps {
  widgetId: string;
  accounts: ExchangeAccount[];
  settings: UserTradingDataWidgetSettings;
}

const UserTradesTab: React.FC<UserTradesTabProps> = ({
  widgetId,
  accounts,
  settings
}) => {
  const [trades, setTrades] = useState<Array<Trade & { 
    accountId: string;
    exchange: string;
    email: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data provider integration - will use when methods are available
  const dataProvider = useDataProviderStore();

  // Load trades for accounts
  const loadTrades = useCallback(async () => {
    if (!accounts.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📊 Loading trades for ${accounts.length} account(s)`);
      
      const allTrades: (Trade & { accountId: string; exchange: string; email: string; })[] = [];
      
      // Load trades from each account
      for (const account of accounts) {
        try {
          console.log(`🔄 Fetching trades for account ${account.id} (${account.exchange})`);
          
          const trades = await dataProvider.fetchMyTrades(
            account.id,
            undefined, // symbol - get all symbols
            undefined, // since - get recent trades
            settings.tradesLimit
          );
          
          // Transform and add account info
          const tradesWithAccount = trades.map(trade => ({
            ...trade,
            accountId: account.id,
            exchange: account.exchange || 'Unknown',
            email: account.email || 'Unknown'
          }));
          
          allTrades.push(...tradesWithAccount);
          
          console.log(`✅ Loaded ${trades.length} trades for account ${account.id}`);
        } catch (error) {
          console.error(`❌ Failed to load trades for account ${account.id}:`, error);
          // Continue with other accounts even if one fails
        }
      }
      
      // Sort trades by timestamp (newest first)
      allTrades.sort((a, b) => b.timestamp - a.timestamp);
      
      setTrades(allTrades);
      console.log(`✅ Total trades loaded: ${allTrades.length}`);
      
    } catch (error) {
      console.error('❌ Failed to load trades:', error);
      setError(error instanceof Error ? error.message : 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [accounts, settings.tradesLimit, dataProvider]);

  // Load trades only when this tab is active
  useEffect(() => {
    // Check if this tab is active
    if (settings.activeTab === 'trades') {
      loadTrades();
    }
  }, [loadTrades, settings.activeTab]);

  // Format currency value
  const formatCurrency = useCallback((value: number, currency?: string) => {
    if (value === 0) return '0';
    
    if (value < 0.001) {
      return value.toFixed(8);
    } else if (value < 1) {
      return value.toFixed(6);
    } else if (value < 1000) {
      return value.toFixed(4);  
    } else {
      return value.toFixed(2);
    }
  }, []);

  // Format timestamp
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  }, []);

  // Virtualization setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  const renderTradeRow = useCallback((trade: Trade & { 
    accountId: string; 
    exchange: string; 
    email: string; 
  }, index: number, style?: React.CSSProperties) => (
    <div
      key={trade.id}
      className={`flex items-center py-3 px-3 text-sm border-b border-terminal-border/30 hover:bg-terminal-accent/10 ${
        index % 2 === 0 ? 'bg-terminal-background/50' : ''
      }`}
      style={style}
    >
      {/* Time & Account */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-terminal-muted" />
          <span className="text-xs text-terminal-muted">{formatTime(trade.timestamp)}</span>
        </div>
        <span className="text-xs text-terminal-muted truncate">
          {trade.exchange} • {trade.email}
        </span>
      </div>

      {/* Symbol & Side */}
      <div className="text-center min-w-0 flex-1">
        <div className="font-medium text-terminal-text">{trade.symbol}</div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          trade.side === 'buy' 
            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
        }`}>
          {trade.side === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trade.side.toUpperCase()}
        </div>
      </div>
      
      {/* Amount */}
      <div className="text-right min-w-0 flex-1">
        <div className="text-terminal-text">{formatCurrency(trade.amount)}</div>
        <div className="text-xs text-terminal-muted">Amount</div>
      </div>
      
      {/* Price */}
      <div className="text-right min-w-0 flex-1">
        <div className="text-terminal-text">{formatCurrency(trade.price)}</div>
        <div className="text-xs text-terminal-muted">Price</div>
      </div>
      
      {/* Cost */}
      <div className="text-right min-w-0 flex-1">
        <div className="font-medium text-terminal-text">{formatCurrency(trade.cost)}</div>
        <div className="text-xs text-terminal-muted">Total</div>
      </div>
      
      {/* Fee */}
      <div className="text-right min-w-0 flex-1">
        <div className="text-terminal-text">
          {trade.fee ? formatCurrency(trade.fee.cost) : '-'}
        </div>
        <div className="text-xs text-terminal-muted">
          {trade.fee ? trade.fee.currency : 'Fee'}
        </div>
      </div>
    </div>
  ), [formatCurrency, formatTime]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-8 h-8 text-terminal-text/80 mb-2 animate-pulse mx-auto" />
          <p className="text-terminal-muted">Loading trades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <TrendingDown className="w-8 h-8 text-red-500 mb-2 mx-auto" />
          <p className="text-red-500">Error: {error}</p>
          <button 
            onClick={loadTrades}
            className="mt-2 px-3 py-1 bg-terminal-accent/20 hover:bg-terminal-accent/30 rounded text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!trades.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-8 h-8 text-terminal-text/80 mb-2 mx-auto" />
          <p className="text-terminal-muted">No trades found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center py-2 px-3 text-xs font-medium text-terminal-muted border-b border-terminal-border bg-terminal-background/50">
        <div className="min-w-0 flex-1">Time / Account</div>
        <div className="text-center min-w-0 flex-1">Symbol / Side</div>
        <div className="text-right min-w-0 flex-1">Amount</div>
        <div className="text-right min-w-0 flex-1">Price</div>
        <div className="text-right min-w-0 flex-1">Total</div>
        <div className="text-right min-w-0 flex-1">Fee</div>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-hidden">
        {trades.length > 50 ? (
          // Use virtualization for large lists
          <div ref={parentRef} className="h-full overflow-auto">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const trade = trades[virtualRow.index];
                return renderTradeRow(trade, virtualRow.index, {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                });
              })}
            </div>
          </div>
        ) : (
          // Render normally for smaller lists
          <div className="overflow-auto">
            {trades.map((trade, index) => 
              renderTradeRow(trade, index)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTradesTab; 