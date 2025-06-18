import React, { useMemo } from 'react';
import { TrendingUp, BarChart3, ShoppingCart, User, RefreshCw } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useUserTradingDataWidgetStore, TradingDataTab } from '../../store/userTradingDataWidgetStore';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import UserTradesTab from './UserTradesTab';
import UserPositionsTab from './UserPositionsTab';
import UserOrdersTab from './UserOrdersTab';

interface UserTradingDataWidgetProps {
  dashboardId?: string;
  widgetId?: string;
}

const UserTradingDataWidget: React.FC<UserTradingDataWidgetProps> = ({
  dashboardId = 'default',
  widgetId = 'user-trading-data-widget'
}) => {
  // Store integration
  const { getWidget, updateWidget } = useUserTradingDataWidgetStore();
  const widgetSettings = getWidget(widgetId).settings;
  
  // User store integration
  const { users, activeUserId } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);
  
  // Data provider integration
  const dataProvider = useDataProviderStore();
  
  // Get all user accounts with API keys
  const accountsWithKeys = useMemo(() => {
    if (!activeUser?.accounts || !Array.isArray(activeUser.accounts)) {
      return [];
    }
    return activeUser.accounts.filter(acc => acc.key && acc.privateKey);
  }, [activeUser?.accounts]);
  
  const hasValidAccounts = accountsWithKeys.length > 0;
  
  // Get selected accounts based on settings
  const selectedAccounts = useMemo(() => {
    if (!hasValidAccounts) return [];
    
    // If 'all' selected, return all accounts
    if (widgetSettings.selectedAccountId === 'all') {
      return accountsWithKeys;
    }
    
    // Return specific account
    const account = accountsWithKeys.find(acc => acc.id === widgetSettings.selectedAccountId);
    return account ? [account] : accountsWithKeys; // Fallback to all if account not found
  }, [widgetSettings.selectedAccountId, accountsWithKeys, hasValidAccounts]);

  // Handle tab change
  const handleTabChange = (tab: TradingDataTab) => {
    updateWidget(widgetId, { activeTab: tab });
  };

  // Handle account selection
  const handleAccountChange = (accountId: string) => {
    updateWidget(widgetId, { selectedAccountId: accountId });
  };

  // Handle refresh for current tab
  const handleRefresh = async () => {
    if (!hasValidAccounts) return;
    
    console.log(`🔄 Refreshing ${widgetSettings.activeTab} for ${selectedAccounts.length} account(s)`);
    
    // Refresh logic will be implemented when API methods are available
  };

  // Get display text for account selector
  const getAccountSelectorValue = () => {
    return widgetSettings.selectedAccountId || 'all';
  };

  if (!activeUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <User className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No Active User</h3>
        <p className="text-terminal-muted">
          Please select or create a user account to view trading data
        </p>
      </div>
    );
  }

  if (!hasValidAccounts) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <BarChart3 className="h-12 w-12 text-terminal-text/80 mb-4" />
        <h3 className="text-lg font-medium text-terminal-text mb-2">No API Keys Configured</h3>
        <p className="text-terminal-muted mb-4">
          Add API keys to your exchange accounts to view trading data
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
      {/* Header with account selector */}
      <div className="flex items-center justify-between p-3 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-4 w-4 text-terminal-text/80" />
          <h3 className="font-medium text-terminal-text">Trading Data</h3>
          
          {/* Account Selector */}
          <Select 
            value={getAccountSelectorValue()}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="w-48 h-8 bg-terminal-bg border-terminal-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-terminal-widget border-terminal-border">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  All Accounts ({accountsWithKeys.length})
                </div>
              </SelectItem>
              {accountsWithKeys.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{account.exchange}</span>
                    <span className="text-xs text-terminal-muted">{account.email}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-terminal-accent/20 rounded transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-3.5 w-3.5 text-terminal-text/80" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs 
          value={widgetSettings.activeTab} 
          onValueChange={(value) => handleTabChange(value as TradingDataTab)}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3 bg-terminal-background border-b border-terminal-border rounded-none h-10">
            <TabsTrigger 
              value="trades" 
              className="flex items-center gap-2 data-[state=active]:bg-terminal-accent/60"
            >
              <TrendingUp className="w-3 h-3" />
              Trades
            </TabsTrigger>
            <TabsTrigger 
              value="positions" 
              className="flex items-center gap-2 data-[state=active]:bg-terminal-accent/60"
            >
              <BarChart3 className="w-3 h-3" />
              Positions
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="flex items-center gap-2 data-[state=active]:bg-terminal-accent/60"
            >
              <ShoppingCart className="w-3 h-3" />
              Orders
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trades" className="flex-1 overflow-hidden m-0">
            <UserTradesTab 
              widgetId={widgetId}
              accounts={selectedAccounts}
              settings={widgetSettings}
            />
          </TabsContent>
          
          <TabsContent value="positions" className="flex-1 overflow-hidden m-0">
            <UserPositionsTab 
              widgetId={widgetId}
              accounts={selectedAccounts}
              settings={widgetSettings}
            />
          </TabsContent>
          
          <TabsContent value="orders" className="flex-1 overflow-hidden m-0">
            <UserOrdersTab 
              widgetId={widgetId}
              accounts={selectedAccounts}
              settings={widgetSettings}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserTradingDataWidget; 