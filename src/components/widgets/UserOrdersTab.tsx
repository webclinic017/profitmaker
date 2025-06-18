import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ShoppingCart, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { ExchangeAccount } from '../../store/userStore';
import { UserTradingDataWidgetSettings } from '../../store/userTradingDataWidgetStore';

interface Order {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  stopPrice?: number;
  filled: number;
  remaining: number;
  average?: number;
  status: 'open' | 'closed' | 'canceled' | 'expired' | 'rejected';
  fee?: {
    cost: number;
    currency: string;
  };
  info?: any;
}

interface UserOrdersTabProps {
  widgetId: string;
  accounts: ExchangeAccount[];
  settings: UserTradingDataWidgetSettings;
}

const UserOrdersTab: React.FC<UserOrdersTabProps> = ({
  widgetId,
  accounts,
  settings
}) => {
  const [orders, setOrders] = useState<Array<Order & { 
    accountId: string;
    exchange: string;
    email: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data provider integration
  const dataProvider = useDataProviderStore();

  // Load orders for accounts
  const loadOrders = useCallback(async () => {
    console.log(`🔍 [UserOrdersTab] Starting loadOrders. Accounts length: ${accounts.length}`);
    console.log(`🔍 [UserOrdersTab] Settings:`, { showClosedOrders: settings.showClosedOrders });
    console.log(`🔍 [UserOrdersTab] Accounts:`, accounts.map(acc => ({ 
      id: acc.id, 
      exchange: acc.exchange, 
      email: acc.email,
      hasKey: !!acc.key,
      hasPrivateKey: !!acc.privateKey 
    })));
    
    if (!accounts.length) {
      console.log(`⚠️ [UserOrdersTab] No accounts found, returning early`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📊 [UserOrdersTab] Loading orders for ${accounts.length} account(s)`);
      
      const allOrders: (Order & { accountId: string; exchange: string; email: string; })[] = [];
      
      // Load orders from each account
      for (const account of accounts) {
        try {
          console.log(`🔄 [UserOrdersTab] Fetching orders for account ${account.id} (${account.exchange})`);
          console.log(`🔍 [UserOrdersTab] Account details:`, {
            id: account.id,
            exchange: account.exchange,
            email: account.email,
            hasKey: !!account.key,
            hasPrivateKey: !!account.privateKey,
            keyLength: account.key?.length || 0,
            privateKeyLength: account.privateKey?.length || 0
          });
          
          let orders: any[] = [];
          
          if (settings.showClosedOrders) {
            console.log(`📋 [UserOrdersTab] Fetching ALL orders (open + closed) for account ${account.id}`);
            try {
              // Try to fetch all orders (open + closed)
              orders = await dataProvider.fetchOrders(
                account.id,
                undefined, // symbol - get all symbols
                undefined, // since - get recent orders
                100 // limit
              );
            } catch (error) {
              console.warn(`⚠️ [UserOrdersTab] fetchOrders failed for ${account.id}, falling back to fetchOpenOrders:`, error.message);
              // Fallback to open orders only if fetchOrders fails
              orders = await dataProvider.fetchOpenOrders(
                account.id,
                undefined // symbol - get all symbols
              );
            }
          } else {
            console.log(`📋 [UserOrdersTab] Fetching OPEN orders only for account ${account.id}`);
            // Fetch only open orders
            orders = await dataProvider.fetchOpenOrders(
              account.id,
              undefined // symbol - get all symbols
            );
          }
          
          console.log(`📊 [UserOrdersTab] Raw orders received for account ${account.id}:`, orders);
          
          // Transform and add account info
          const ordersWithAccount = orders.map(order => ({
            ...order,
            accountId: account.id,
            exchange: account.exchange || 'Unknown',
            email: account.email || 'Unknown'
          }));
          
          allOrders.push(...ordersWithAccount);
          
          console.log(`✅ [UserOrdersTab] Loaded ${orders.length} orders for account ${account.id}`);
        } catch (error) {
          console.error(`❌ [UserOrdersTab] Failed to load orders for account ${account.id}:`, error);
          console.error(`❌ [UserOrdersTab] Error details:`, {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            accountId: account.id,
            exchange: account.exchange
          });
          // Continue with other accounts even if one fails
        }
      }
      
      // Sort orders by timestamp (newest first)
      allOrders.sort((a, b) => b.timestamp - a.timestamp);
      
      setOrders(allOrders);
      console.log(`✅ [UserOrdersTab] Total orders loaded: ${allOrders.length}`);
      console.log(`📊 [UserOrdersTab] Final orders:`, allOrders);
      
    } catch (error) {
      console.error('❌ [UserOrdersTab] Failed to load orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [accounts, settings.showClosedOrders, dataProvider]);

  // Load orders on mount and when accounts change
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

  // Get status icon and color
  const getStatusInfo = useCallback((status: Order['status']) => {
    switch (status) {
      case 'open':
        return { icon: Clock, color: 'text-blue-600 dark:text-blue-400' };
      case 'closed':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400' };
      case 'canceled':
        return { icon: XCircle, color: 'text-red-600 dark:text-red-400' };
      case 'expired':
        return { icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600 dark:text-red-400' };
      default:
        return { icon: Clock, color: 'text-terminal-muted' };
    }
  }, []);

  // Virtualization setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 5,
  });

  const renderOrderRow = useCallback((order: Order & { 
    accountId: string; 
    exchange: string; 
    email: string; 
  }, index: number, style?: React.CSSProperties) => {
    const statusInfo = getStatusInfo(order.status);
    const StatusIcon = statusInfo.icon;
    const fillPercentage = order.amount > 0 ? (order.filled / order.amount) * 100 : 0;
    
    return (
      <div
        key={order.id}
        className={`flex items-center py-3 px-3 text-sm border-b border-terminal-border/30 hover:bg-terminal-accent/10 ${
          index % 2 === 0 ? 'bg-terminal-background/50' : ''
        }`}
        style={style}
      >
        {/* Time & Exchange */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-terminal-muted" />
            <span className="text-xs text-terminal-muted">{formatTime(order.timestamp)}</span>
          </div>
          <span className="text-xs text-terminal-muted truncate">
            {order.exchange} • {order.email}
          </span>
        </div>

        {/* Symbol & Type */}
        <div className="text-center min-w-0 flex-1">
          <div className="font-medium text-terminal-text">{order.symbol}</div>
          <div className="text-xs text-terminal-muted">{order.type.toUpperCase()}</div>
        </div>
        
        {/* Side */}
        <div className="text-center min-w-0 flex-1">
          <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            order.side === 'buy' 
              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
          }`}>
            {order.side.toUpperCase()}
          </div>
        </div>
        
        {/* Amount */}
        <div className="text-right min-w-0 flex-1">
          <div className="text-terminal-text">{formatCurrency(order.amount)}</div>
          <div className="text-xs text-terminal-muted">Amount</div>
        </div>
        
        {/* Price */}
        <div className="text-right min-w-0 flex-1">
          <div className="text-terminal-text">
            {order.price ? formatCurrency(order.price) : 'Market'}
          </div>
          <div className="text-xs text-terminal-muted">Price</div>
        </div>
        
        {/* Filled */}
        <div className="text-right min-w-0 flex-1">
          <div className="text-terminal-text">{formatCurrency(order.filled)}</div>
          <div className="text-xs text-terminal-muted">
            {fillPercentage.toFixed(1)}%
          </div>
        </div>
        
        {/* Status */}
        <div className="text-center min-w-0 flex-1">
          <div className="flex items-center justify-center gap-1">
            <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {order.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    );
  }, [formatCurrency, formatTime, getStatusInfo]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-8 h-8 text-terminal-text/80 mb-2 animate-pulse mx-auto" />
          <p className="text-terminal-muted">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 text-red-500 mb-2 mx-auto" />
          <p className="text-red-500">Error: {error}</p>
          <button 
            onClick={loadOrders}
            className="mt-2 px-3 py-1 bg-terminal-accent/20 hover:bg-terminal-accent/30 rounded text-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-8 h-8 text-terminal-text/80 mb-2 mx-auto" />
          <p className="text-terminal-muted">No orders found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center py-2 px-3 text-xs font-medium text-terminal-muted border-b border-terminal-border bg-terminal-background/50">
        <div className="min-w-0 flex-1">Time / Exchange</div>
        <div className="text-center min-w-0 flex-1">Symbol</div>
        <div className="text-center min-w-0 flex-1">Side</div>
        <div className="text-right min-w-0 flex-1">Amount</div>
        <div className="text-right min-w-0 flex-1">Price</div>
        <div className="text-right min-w-0 flex-1">Filled</div>
        <div className="text-center min-w-0 flex-1">Status</div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-hidden">
        {orders.length > 50 ? (
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
                const order = orders[virtualRow.index];
                return renderOrderRow(order, virtualRow.index, {
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
            {orders.map((order, index) => 
              renderOrderRow(order, index)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserOrdersTab; 