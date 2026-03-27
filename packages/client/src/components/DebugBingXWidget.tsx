import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RefreshCw, Settings, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useDataProviderStore } from '../store/dataProviderStore';
import { CCXTBrowserProviderImpl } from '../store/providers/ccxtBrowserProvider';

export const DebugBingXWidget: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const { users, activeUserId } = useUserStore();
  const { fetchBalance, getBalance } = useDataProviderStore();

  const activeUser = users.find(u => u.id === activeUserId);
  const bingxAccounts = activeUser?.accounts?.filter(acc => 
    acc.exchange.toLowerCase() === 'bingx' && acc.key && acc.privateKey
  ) || [];

  const runDiagnostics = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      console.log('🔍 [DebugBingX] Starting BingX diagnostics...');
      
      const info: any = {
        timestamp: new Date().toISOString(),
        userInfo: {
          activeUserId,
          totalUsers: users.length,
          activeUser: activeUser ? {
            id: activeUser.id,
            email: activeUser.email,
            totalAccounts: activeUser.accounts.length
          } : null
        },
        bingxAccounts: bingxAccounts.map(acc => ({
          id: acc.id,
          exchange: acc.exchange,
          email: acc.email,
          hasApiKey: !!acc.key,
          hasSecret: !!acc.privateKey,
          sandbox: false, // BingX accounts don't have sandbox property
          keyLength: acc.key?.length || 0,
          secretLength: acc.privateKey?.length || 0
        })),
        ccxtCache: CCXTBrowserProviderImpl.getCacheStats(),
        balanceData: {},
        errors: []
      };

      // Проверим балансы в store для каждого BingX аккаунта
      for (const account of bingxAccounts) {
        console.log(`🔍 [DebugBingX] Checking balance data for account ${account.id}`);
        
        const tradingBalance = getBalance(account.id, 'trading');
        const fundingBalance = getBalance(account.id, 'funding');
        
        info.balanceData[account.id] = {
          trading: tradingBalance ? {
            timestamp: tradingBalance.timestamp,
            balanceCount: tradingBalance.balances.length,
            totalBalance: tradingBalance.balances.reduce((sum, b) => sum + b.total, 0),
            currencies: tradingBalance.balances.map(b => b.currency)
          } : null,
          funding: fundingBalance ? {
            timestamp: fundingBalance.timestamp,
            balanceCount: fundingBalance.balances.length,
            totalBalance: fundingBalance.balances.reduce((sum, b) => sum + b.total, 0),
            currencies: fundingBalance.balances.map(b => b.currency)
          } : null
        };
      }

      // Попробуем принудительно запросить балансы
      for (const account of bingxAccounts) {
        try {
          console.log(`🔄 [DebugBingX] Force fetching balance for account ${account.id}`);
          
          // Запрашиваем оба типа балансов
          await fetchBalance(account.id, 'trading');
          await fetchBalance(account.id, 'funding');
          
          console.log(`✅ [DebugBingX] Successfully fetched balances for account ${account.id}`);
        } catch (error: any) {
          const errorMsg = `Failed to fetch balance for ${account.id}: ${error.message}`;
          console.error(`❌ [DebugBingX] ${errorMsg}`);
          info.errors.push(errorMsg);
        }
      }

      // Обновляем информацию о кэше после запросов
      info.ccxtCacheAfter = CCXTBrowserProviderImpl.getCacheStats();

      setDebugInfo(info);
      console.log('✅ [DebugBingX] Diagnostics completed:', info);

    } catch (error: any) {
      const errorMsg = `Diagnostics failed: ${error.message}`;
      console.error(`❌ [DebugBingX] ${errorMsg}`);
      setLastError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [users, activeUserId, activeUser, bingxAccounts, fetchBalance, getBalance]);

  const handleClearCache = useCallback(() => {
    CCXTBrowserProviderImpl.clearCache();
    console.log('🧹 [DebugBingX] CCXT cache cleared');
    setDebugInfo(null);
  }, []);

  const handleForceRefresh = useCallback(async () => {
    handleClearCache();
    await new Promise(resolve => setTimeout(resolve, 500));
    await runDiagnostics();
  }, [handleClearCache, runDiagnostics]);

  useEffect(() => {
    if (bingxAccounts.length > 0) {
      runDiagnostics();
    }
  }, [bingxAccounts.length, runDiagnostics]);

  const renderStatus = (condition: boolean, trueText: string, falseText: string) => (
    <div className="flex items-center gap-2">
      {condition ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className={condition ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
        {condition ? trueText : falseText}
      </span>
    </div>
  );

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <h3 className="text-lg font-semibold">BingX Debug Widget</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runDiagnostics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceRefresh}
            disabled={isLoading}
          >
            🧹 Force Refresh
          </Button>
        </div>
      </div>

      {lastError && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300 font-medium">Error</span>
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{lastError}</p>
        </div>
      )}

      <div className="grid gap-4">
        {/* User & Account Status */}
        <div className="border border-border rounded-lg p-3">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <User className="h-4 w-4" />
            User & BingX Accounts Status
          </h4>
          <div className="space-y-2 text-sm">
            {renderStatus(!!activeUser, 'Active user found', 'No active user')}
            {renderStatus(bingxAccounts.length > 0, `${bingxAccounts.length} BingX account(s) found`, 'No BingX accounts found')}
            
            {bingxAccounts.map(acc => (
              <div key={acc.id} className="ml-6 p-2 bg-muted/50 rounded text-xs">
                <div className="font-medium">{acc.email} ({acc.exchange})</div>
                <div className="text-muted-foreground">
                  ID: {acc.id} | API Key: {acc.key ? `${acc.key.substring(0, 8)}...` : 'Not set'}
                </div>
                {renderStatus(!!acc.key && !!acc.privateKey, 'API credentials configured', 'Missing API credentials')}
              </div>
            ))}
          </div>
        </div>

        {/* CCXT Cache Status */}
        {debugInfo?.ccxtCache && (
          <div className="border border-border rounded-lg p-3">
            <h4 className="font-medium mb-2">CCXT Cache Status</h4>
            <div className="text-sm space-y-1">
              <div>Total Instances: <span className="font-mono">{debugInfo.ccxtCache.totalInstances}</span></div>
              <div>Markets Cache: <span className="font-mono">{debugInfo.ccxtCache.totalMarketsCache}</span></div>
              
              {debugInfo.ccxtCache.instances && debugInfo.ccxtCache.instances.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium text-xs">Active Instances:</div>
                  {debugInfo.ccxtCache.instances.map((inst: any, idx: number) => (
                    <div key={idx} className="ml-2 text-xs bg-muted/50 p-1 rounded mt-1">
                      <div className="font-mono text-[10px]">{inst.key}</div>
                      <div className="text-muted-foreground">
                        {inst.exchangeId} | {inst.userId} | {inst.accountId} | {inst.ccxtType}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Balance Data Status */}
        {debugInfo?.balanceData && (
          <div className="border border-border rounded-lg p-3">
            <h4 className="font-medium mb-2">Balance Data Status</h4>
            <div className="space-y-2">
              {Object.keys(debugInfo.balanceData).length === 0 ? (
                <div className="text-sm text-muted-foreground">No balance data found</div>
              ) : (
                Object.entries(debugInfo.balanceData).map(([accountId, data]: [string, any]) => {
                  const account = bingxAccounts.find(acc => acc.id === accountId);
                  return (
                    <div key={accountId} className="text-sm">
                      <div className="font-medium">{account?.email || accountId}</div>
                      <div className="ml-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-16">Trading:</span>
                          {data.trading ? (
                            <span className="text-green-600 dark:text-green-400 text-xs">
                              {data.trading.balanceCount} currencies, Total: {data.trading.totalBalance.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-xs">No data</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-16">Funding:</span>
                          {data.funding ? (
                            <span className="text-green-600 dark:text-green-400 text-xs">
                              {data.funding.balanceCount} currencies, Total: {data.funding.totalBalance.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-xs">No data</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Errors */}
        {debugInfo?.errors && debugInfo.errors.length > 0 && (
          <div className="border border-red-300 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/10">
            <h4 className="font-medium mb-2 text-red-700 dark:text-red-300">Errors</h4>
            <div className="space-y-1">
              {debugInfo.errors.map((error: string, idx: number) => (
                <div key={idx} className="text-sm text-red-600 dark:text-red-400 font-mono">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div className="border border-border rounded-lg p-3">
            <h4 className="font-medium mb-2">Raw Debug Info</h4>
            <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-48">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
}; 