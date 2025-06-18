import React, { useMemo } from 'react';
import { TrendingUp, BarChart3, ShoppingCart, User, RefreshCw } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useUserTradingDataWidgetStore, TradingDataTab } from '../../store/userTradingDataWidgetStore';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import UserTradesTab from './UserTradesTab';
import UserPositionsTab from './UserPositionsTab';
import UserOrdersTab from './UserOrdersTab';

interface UserTradingDataWidgetProps {
  dashboardId?: string;
  widgetId?: string;
}

// Header actions component for the widget
export const UserTradingDataHeaderActions: React.FC<{ widgetId: string }> = ({ widgetId }) => {
  const { getWidget } = useUserTradingDataWidgetStore();
  const { users, activeUserId } = useUserStore();
  
  const widgetSettings = getWidget(widgetId).settings;
  const activeUser = users.find(u => u.id === activeUserId);
  
  const accountsWithKeys = useMemo(() => {
    if (!activeUser?.accounts || !Array.isArray(activeUser.accounts)) {
      return [];
    }
    return activeUser.accounts.filter(acc => acc.key && acc.privateKey);
  }, [activeUser?.accounts]);
  
  const hasValidAccounts = accountsWithKeys.length > 0;
  
  const selectedAccounts = useMemo(() => {
    if (!hasValidAccounts) return [];
    
    if (widgetSettings.selectedAccountId === 'all') {
      return accountsWithKeys;
    }
    
    const account = accountsWithKeys.find(acc => acc.id === widgetSettings.selectedAccountId);
    return account ? [account] : accountsWithKeys;
  }, [widgetSettings.selectedAccountId, accountsWithKeys, hasValidAccounts]);

  const handleRefresh = async () => {
    if (!hasValidAccounts) return;
    
    console.log(`🔄 Refreshing ${widgetSettings.activeTab} for ${selectedAccounts.length} account(s)`);
    
    // Refresh logic will be implemented when API methods are available
  };

  return (
    <button
      onClick={handleRefresh}
      className="p-1 rounded-sm hover:bg-terminal-widget/50 transition-colors"
      title="Refresh data"
      disabled={!hasValidAccounts}
    >
      <RefreshCw size={14} className="text-terminal-muted hover:text-terminal-text transition-colors" />
    </button>
  );
};

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
      {/* Tabs */}
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
  );
};

export default UserTradingDataWidget; 