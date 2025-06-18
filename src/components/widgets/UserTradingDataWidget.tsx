import React, { useState, useMemo } from 'react';
import { TrendingUp, BarChart3, ShoppingCart, User, RefreshCw, Check, ChevronsUpDown } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useUserTradingDataWidgetStore, TradingDataTab } from '../../store/userTradingDataWidgetStore';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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
  
  // Account selector state
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);
  
  // Get all user accounts with API keys
  const accountsWithKeys = activeUser?.accounts.filter(acc => acc.key && acc.privateKey) || [];
  const hasValidAccounts = accountsWithKeys.length > 0;
  
  // Get selected accounts based on settings
  const selectedAccounts = useMemo(() => {
    if (!hasValidAccounts) return [];
    
    // If no specific accounts selected, return all accounts
    if (widgetSettings.selectedAccountIds.length === 0) {
      return accountsWithKeys;
    }
    
    // Return only selected accounts that have API keys
    return accountsWithKeys.filter(acc => widgetSettings.selectedAccountIds.includes(acc.id));
  }, [widgetSettings.selectedAccountIds, accountsWithKeys, hasValidAccounts]);

  // Handle tab change
  const handleTabChange = (tab: TradingDataTab) => {
    updateWidget(widgetId, { activeTab: tab });
  };

  // Handle account selection
  const handleAccountToggle = (accountId: string) => {
    const currentSelected = widgetSettings.selectedAccountIds;
    let newSelected: string[];
    
    if (currentSelected.includes(accountId)) {
      // Remove account from selection
      newSelected = currentSelected.filter(id => id !== accountId);
    } else {
      // Add account to selection
      newSelected = [...currentSelected, accountId];
    }
    
    updateWidget(widgetId, { selectedAccountIds: newSelected });
  };

  // Handle select all accounts
  const handleSelectAll = () => {
    if (widgetSettings.selectedAccountIds.length === accountsWithKeys.length) {
      // Deselect all
      updateWidget(widgetId, { selectedAccountIds: [] });
    } else {
      // Select all
      updateWidget(widgetId, { selectedAccountIds: accountsWithKeys.map(acc => acc.id) });
    }
  };

  // Handle refresh for current tab
  const handleRefresh = async () => {
    if (!hasValidAccounts) return;
    
    console.log(`🔄 Refreshing ${widgetSettings.activeTab} for ${selectedAccounts.length} account(s)`);
    
    // Refresh logic will be implemented when API methods are available
  };

  // Get display text for account selector
  const getAccountSelectorText = () => {
    if (selectedAccounts.length === 0) {
      return 'All Accounts';
    } else if (selectedAccounts.length === 1) {
      return `${selectedAccounts[0].exchange} • ${selectedAccounts[0].email}`;
    } else {
      return `${selectedAccounts.length} accounts selected`;
    }
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
          <Popover open={accountSelectorOpen} onOpenChange={setAccountSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={accountSelectorOpen}
                className="w-48 h-8 justify-between bg-terminal-bg border-terminal-border text-xs"
              >
                {getAccountSelectorText()}
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-terminal-widget border-terminal-border">
              <Command>
                <CommandInput placeholder="Search accounts..." className="h-8" />
                <CommandEmpty>No accounts found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={handleSelectAll}
                    className="cursor-pointer"
                  >
                    <Check
                      className={`mr-2 h-3 w-3 ${
                        widgetSettings.selectedAccountIds.length === 0 || 
                        widgetSettings.selectedAccountIds.length === accountsWithKeys.length
                          ? 'opacity-100' 
                          : 'opacity-0'
                      }`}
                    />
                    All Accounts ({accountsWithKeys.length})
                  </CommandItem>
                  {accountsWithKeys.map((account) => (
                    <CommandItem
                      key={account.id}
                      onSelect={() => handleAccountToggle(account.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={`mr-2 h-3 w-3 ${
                          widgetSettings.selectedAccountIds.includes(account.id) ||
                          widgetSettings.selectedAccountIds.length === 0
                            ? 'opacity-100' 
                            : 'opacity-0'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{account.exchange}</span>
                        <span className="text-xs text-terminal-muted">{account.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
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