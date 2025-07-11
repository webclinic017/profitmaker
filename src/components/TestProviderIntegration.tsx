import React from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import { useUserStore } from '../store/userStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const TestProviderIntegration = () => {
  const { 
    providers, 
    createProvider, 
    getProviderForExchange,
    getProviderExchangeMappings 
  } = useDataProviderStore();
  
  const { users, activeUserId, addUser, addAccount } = useUserStore();
  const activeUser = users.find(u => u.id === activeUserId);

  const testExchanges = ['binance', 'bybit', 'okx'];

  const handleCreateProvider = () => {
    createProvider('ccxt-browser', 'Test Browser Provider', ['binance', 'bybit'], {
      sandbox: true
    });
  };

  const handleCreateUniversalProvider = () => {
    createProvider('ccxt-browser', 'Universal Provider', ['*'], {
      sandbox: true
    });
  };

  const handleCreateServerProvider = () => {
    createProvider('ccxt-server', 'CCXT Express Server', ['*'], {
      serverUrl: 'http://localhost:3001',
      token: 'your-secret-token',
      timeout: 30000,
      sandbox: true
    });
  };

  const handleCreateTestUser = () => {
    addUser({
      email: 'test@example.com',
      name: 'Test User'
    });
  };

  const handleAddBinanceAccount = () => {
    if (!activeUserId) return;
    
    addAccount(activeUserId, {
      exchange: 'binance',
      email: 'test@binance.com',
      key: 'test-api-key',
      privateKey: 'test-secret-key'
    });
  };

  const providerMappings = getProviderExchangeMappings(testExchanges);

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>🧪 Provider-Account Integration Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">👤 Users & Accounts</h3>
          <div className="flex gap-2 mb-2">
            <Button onClick={handleCreateTestUser} size="sm">
              Create Test User
            </Button>
            <Button onClick={handleAddBinanceAccount} size="sm" disabled={!activeUserId}>
              Add Binance Account
            </Button>
          </div>
          <div className="text-sm">
            Active User: {activeUser ? activeUser.name || activeUser.email : 'None'}
            <br />
            Accounts: {activeUser?.accounts.length || 0}
          </div>
        </div>

        {/* Provider Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">🔌 Data Providers</h3>
          <div className="flex gap-2 mb-2 flex-wrap">
            <Button onClick={handleCreateProvider} size="sm">
              Create Browser Provider
            </Button>
            <Button onClick={handleCreateUniversalProvider} size="sm">
              Create Universal Browser
            </Button>
            <Button onClick={handleCreateServerProvider} size="sm">
              Create Server Provider
            </Button>
          </div>
          <div className="text-sm">
            Total Providers: {Object.keys(providers).length}
          </div>
        </div>

        {/* Provider Mappings */}
        <div>
          <h3 className="text-lg font-semibold mb-2">🗺️ Provider-Exchange Mappings</h3>
          <div className="space-y-2">
            {testExchanges.map(exchange => {
              const provider = getProviderForExchange(exchange);
              const mapping = providerMappings.find(m => m.exchange === exchange);
              
              return (
                <div key={exchange} className="p-2 bg-muted rounded text-sm">
                  <strong>{exchange}:</strong>{' '}
                  {provider ? (
                    <span className="text-green-600">
                      {provider.name} (Priority: {provider.priority})
                      {mapping?.account ? ' [With API Keys]' : ' [No Keys]'}
                    </span>
                  ) : (
                    <span className="text-red-600">No Provider</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Providers List */}
        <div>
          <h3 className="text-lg font-semibold mb-2">📋 All Providers</h3>
          <div className="space-y-1">
            {Object.values(providers).map(provider => (
              <div key={provider.id} className="p-2 bg-muted rounded text-sm">
                <strong>{provider.name}</strong> - {provider.type} - 
                Exchanges: {provider.exchanges.join(', ')} - 
                Priority: {provider.priority}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestProviderIntegration; 