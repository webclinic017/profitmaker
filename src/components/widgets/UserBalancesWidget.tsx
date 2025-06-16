import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Search, TrendingUp, TrendingDown, Wallet, User } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTheme } from '../../hooks/useTheme';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useUserStore, ExchangeAccount } from '../../store/userStore';
import { MarketType, WalletType, Balance } from '../../types/dataProviders';
import { Input } from '../ui/input';

interface UserBalancesWidgetProps {
  dashboardId?: string;
  widgetId?: string;
}

interface AccountBalance {
  account: ExchangeAccount;
  balances: Balance[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: number | null;
}

const UserBalancesWidget: React.FC<UserBalancesWidgetProps> = ({
  dashboardId = 'default',
  widgetId = 'user-balances-widget'
}) => {
  // Store integration
  const { 
    subscribe, 
    unsubscribe, 
    initializeBalanceData,
    getBalance,
    getActiveSubscriptionsList,
    fetchBalance
  } = useDataProviderStore();

  // User store integration
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);
  
  // Debug user state
  useEffect(() => {
    console.log(`🔍 [UserBalances] User state:`, {
      usersCount: users.length,
      activeUserId,
      activeUser: activeUser ? {
        id: activeUser.id,
        email: activeUser.email,
        accountsCount: activeUser.accounts.length,
        accounts: activeUser.accounts.map(acc => ({
          id: acc.id,
          exchange: acc.exchange,
          email: acc.email,
          hasKeys: !!(acc.key && acc.privateKey)
        }))
      } : null
    });
  }, [users, activeUserId, activeUser]);

  // Widget state
  const [accountBalances, setAccountBalances] = useState<Map<string, AccountBalance>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'currency' | 'total' | 'free' | 'used' | 'account'>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');


  // Theme integration
  const { theme } = useTheme();

  // Get balances for all user accounts
  const allBalances = useMemo(() => {
    if (!activeUser?.accounts) return [];
    
    const balances: Array<{
      accountId: string;
      exchange: string;
      email: string;
      walletType: WalletType;
      balances: Balance[];
      timestamp?: number;
    }> = [];
    
    activeUser.accounts.forEach(account => {
      if (!account.key || !account.privateKey) return; // Skip accounts without API keys
      
      ['trading', 'funding'].forEach(walletType => {
        const exchangeBalances = getBalance(account.id, walletType as WalletType);
        
        if (exchangeBalances?.balances && exchangeBalances.balances.length > 0) {
          balances.push({
            accountId: account.id,
            exchange: account.exchange,
            email: account.email,
            walletType: walletType as WalletType,
            balances: exchangeBalances.balances,
            timestamp: exchangeBalances.timestamp
          });
        }
      });
    });
    
    return balances;
  }, [activeUser?.accounts, getBalance]);

  // Filter and sort balances
  const filteredAndSortedBalances = useMemo(() => {
    // Flatten balances from all accounts
    let flatBalances: (Balance & { 
      accountId: string; 
      exchange: string; 
      email: string; 
      walletType: WalletType;
      timestamp?: number;
    })[] = [];
    
    allBalances.forEach(accountBalance => {
      accountBalance.balances.forEach(balance => {
        flatBalances.push({
          ...balance,
          accountId: accountBalance.accountId,
          exchange: accountBalance.exchange,
          email: accountBalance.email,
          walletType: accountBalance.walletType,
          timestamp: accountBalance.timestamp
        });
      });
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      flatBalances = flatBalances.filter(balance => 
        balance.currency.toLowerCase().includes(query) ||
        balance.exchange.toLowerCase().includes(query) ||
        balance.email.toLowerCase().includes(query)
      );
    }

    // Filter out zero balances
    flatBalances = flatBalances.filter(balance => balance.total > 0);

    // Apply sorting
    flatBalances.sort((a, b) => {
      let compareResult = 0;
      
      switch (sortBy) {
        case 'currency':
          compareResult = a.currency.localeCompare(b.currency);
          break;
        case 'total':
          compareResult = b.total - a.total;
          break;  
        case 'free':
          compareResult = b.free - a.free;
          break;
        case 'used':
          compareResult = b.used - a.used;
          break;
        case 'account':
          compareResult = a.exchange.localeCompare(b.exchange) ||
                        a.email.localeCompare(b.email);
          break;
        default:
          compareResult = b.total - a.total;
      }
      
      return sortDirection === 'desc' ? -compareResult : compareResult;
    });

    return flatBalances;
  }, [allBalances, searchQuery, sortBy, sortDirection]);

  // Format currency value
  const formatCurrency = useCallback((value: number, currency: string) => {
    if (value === 0) return '0';
    
    // Show more decimals for small values
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

  // Get wallet addresses for additional info
  const getWalletAddresses = useCallback(async (exchange: string) => {
    try {
      // This would call fetchDepositAddresses() if available
      console.log(`🏦 [UserBalances] Fetching wallet addresses for ${exchange}...`);
      // TODO: Implement wallet address fetching
      // const addresses = await exchangeInstance.fetchDepositAddresses();
    } catch (error) {
      console.warn(`⚠️ [UserBalances] Could not fetch wallet addresses for ${exchange}:`, error);
    }
  }, []);

  // Subscribe to balances for all user accounts
  const subscribeToAllAccounts = useCallback(async () => {
    if (!activeUser?.accounts) {
      console.log(`🚫 [UserBalances] No active user or accounts available`);
      return;
    }
    
    console.log(`🚀 [UserBalances] Starting balance fetch for ${activeUser.accounts.length} accounts:`, 
      activeUser.accounts.map(acc => ({ exchange: acc.exchange, email: acc.email, hasKeys: !!(acc.key && acc.privateKey) }))
    );
    
    for (const account of activeUser.accounts) {
      if (!account.key || !account.privateKey) {
        console.log(`⚠️ [UserBalances] Skipping account ${account.exchange} (${account.email}) - no API keys`);
        continue;
      }
      
      try {
        console.log(`🚀 [UserBalances] Fetching balances for account ${account.id} (${account.exchange}:${account.email})`);
        
        // Fetch both trading and funding balances
        await fetchBalance(account.id, 'trading');
        await fetchBalance(account.id, 'funding');
        
        console.log(`✅ [UserBalances] Fetched balances for account ${account.id} (${account.exchange})`);
      } catch (error) {
        console.error(`❌ [UserBalances] Failed to fetch balances for account ${account.id} (${account.exchange}):`, error);
      }
    }
  }, [activeUser?.accounts, fetchBalance]);



  // Handle sort
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Auto-fetch balances when user changes
  useEffect(() => {
    if (activeUser?.accounts && activeUser.accounts.length > 0) {
      subscribeToAllAccounts();
    }
  }, [activeUser?.accounts, subscribeToAllAccounts]);

  // Check if we have any accounts with API keys
  const accountsWithKeys = activeUser?.accounts.filter(acc => acc.key && acc.privateKey) || [];
  const hasValidAccounts = accountsWithKeys.length > 0;

  // Virtualization setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredAndSortedBalances.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  const renderBalanceRow = useCallback((balance: Balance & { 
    accountId: string; 
    exchange: string; 
    email: string; 
    walletType: WalletType;
    timestamp?: number;
  }, index: number, style?: React.CSSProperties) => (
    <div
      key={`${balance.accountId}-${balance.currency}-${balance.walletType}`}
      className={`flex items-center py-2 px-3 text-sm border-b border-terminal-border/30 hover:bg-terminal-accent/10 ${
        index % 2 === 0 ? 'bg-terminal-background/50' : ''
      }`}
      style={style}
    >
      {/* Account info */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-medium text-terminal-text truncate">
          {balance.currency}
        </span>
        <span className="text-xs text-terminal-muted truncate">
          {balance.exchange} • {balance.email}
          {balance.walletType === 'funding' && (
            <span className="ml-1 px-1 bg-terminal-accent/20 text-terminal-accent rounded text-xs">
              FUNDING
            </span>
          )}
        </span>
      </div>
      
      {/* Free amount */}
      <div className="text-right min-w-0 flex-1">
        <div className="text-terminal-text truncate">
          {formatCurrency(balance.free, balance.currency)}
        </div>
        <div className="text-xs text-terminal-muted">Free</div>
      </div>
      
      {/* Used amount */}
      <div className="text-right min-w-0 flex-1">
        <div className="text-terminal-text truncate">
          {formatCurrency(balance.used, balance.currency)}
        </div>
        <div className="text-xs text-terminal-muted">Locked</div>
      </div>
      
      {/* Total amount */}
      <div className="text-right min-w-0 flex-1">
        <div className="font-medium text-terminal-text truncate">
          {formatCurrency(balance.total, balance.currency)}
        </div>
        <div className="text-xs text-terminal-muted">Total</div>
      </div>
      
      {/* USD Value */}
      {balance.usdValue !== undefined && (
        <div className="text-right min-w-0 flex-1">
          <div className="text-terminal-accent truncate">
            ${formatCurrency(balance.usdValue, 'USD')}
          </div>
          <div className="text-xs text-terminal-muted">USD</div>
        </div>
      )}
    </div>
  ), [formatCurrency]);

  if (!activeUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <User className="h-12 w-12 text-terminal-muted mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No Active User</h3>
        <p className="text-terminal-muted">
          Please select or create a user account to view balances
        </p>
      </div>
    );
  }

  if (!hasValidAccounts) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <Wallet className="h-12 w-12 text-terminal-muted mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No API Keys Configured</h3>
        <p className="text-terminal-muted mb-4">
          Add API keys to your exchange accounts to view balances
        </p>
        <div className="text-sm text-terminal-muted">
          <p>Current user: {activeUser.email}</p>
          <p>Accounts: {activeUser.accounts.length}</p>
          <p>With API keys: {accountsWithKeys.length}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-terminal-accent" />
          <h3 className="font-medium text-terminal-text">User Balances</h3>
          <span className="text-xs text-terminal-muted">
            ({filteredAndSortedBalances.length} assets)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={subscribeToAllAccounts}
            className="p-1.5 hover:bg-terminal-accent/20 rounded transition-colors"
            title="Refresh balances"
          >
            <RefreshCw className="h-3.5 w-3.5 text-terminal-muted" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-terminal-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-muted" />
          <Input
            type="text"
            placeholder="Search currencies, exchanges, or accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-terminal-background border-terminal-border text-terminal-text placeholder-terminal-muted"
          />
        </div>
      </div>

      {/* Table Header */}
      <div className="flex items-center py-2 px-3 text-xs font-medium text-terminal-muted border-b border-terminal-border bg-terminal-background/50">
        <button 
          onClick={() => handleSort('account')}
          className="flex items-center gap-1 min-w-0 flex-1 hover:text-terminal-text"
        >
          Account
          {sortBy === 'account' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
          )}
        </button>
        
        <button 
          onClick={() => handleSort('free')}
          className="flex items-center gap-1 text-right min-w-0 flex-1 hover:text-terminal-text"
        >
          Free
          {sortBy === 'free' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
          )}
        </button>
        
        <button 
          onClick={() => handleSort('used')}
          className="flex items-center gap-1 text-right min-w-0 flex-1 hover:text-terminal-text"
        >
          Locked
          {sortBy === 'used' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
          )}
        </button>
        
        <button 
          onClick={() => handleSort('total')}
          className="flex items-center gap-1 text-right min-w-0 flex-1 hover:text-terminal-text"
        >
          Total
          {sortBy === 'total' && (
            sortDirection === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
          )}
        </button>
        
        <div className="text-right min-w-0 flex-1">USD Value</div>
      </div>

      {/* Balance List */}
      <div className="flex-1 overflow-hidden">
        {filteredAndSortedBalances.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Wallet className="h-8 w-8 text-terminal-muted mb-2" />
            <p className="text-terminal-muted">
              {searchQuery ? 'No matching balances found' : 'No balances available'}
            </p>
            <p className="text-xs text-terminal-muted mt-1">
              {activeUser.email}
            </p>
          </div>
        ) : filteredAndSortedBalances.length > 50 ? (
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
                const balance = filteredAndSortedBalances[virtualRow.index];
                return renderBalanceRow(balance, virtualRow.index, {
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
            {filteredAndSortedBalances.map((balance, index) => 
              renderBalanceRow(balance, index)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserBalancesWidget; 