import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useDataProviderStore } from '../store/dataProviderStore';
import { useNotificationStore } from '../store/notificationStore';
import { DataProviderDebugWidget } from './widgets/DataProviderDebugWidget';

const TestDebugWidgetCCXTServer: React.FC = () => {
  const { createProvider, providers, removeProvider } = useDataProviderStore();
  const { showSuccess, showError } = useNotificationStore();

  const createTestCCXTServerProvider = () => {
    try {
      const testProvider = createProvider(
        'ccxt-server',
        'Test CCXT Server (Debug)',
        ['binance', 'bybit'],
        {
          serverUrl: 'http://localhost:3001',
          token: 'your-secret-token',
          timeout: 30000
        }
      );

      showSuccess(
        'Test CCXT Server Provider Created',
        `Provider "${testProvider.name}" created for Debug Widget testing`
      );
    } catch (error) {
      showError(
        'Error creating test provider',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  };

  const cleanupTestProviders = () => {
    const testProviders = Object.values(providers).filter(p => 
      p.name.includes('Test CCXT Server (Debug)')
    );

    testProviders.forEach(provider => {
      removeProvider(provider.id);
    });

    if (testProviders.length > 0) {
      showSuccess(
        'Test providers cleaned up',
        `Removed ${testProviders.length} test provider(s)`
      );
    }
  };

  const testCCXTServerProviders = Object.values(providers).filter(p => 
    p.type === 'ccxt-server' && p.name.includes('Test CCXT Server (Debug)')
  );

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Test Debug Widget CCXT Server Editing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={createTestCCXTServerProvider}>
              Create Test CCXT Server Provider
            </Button>
            <Button 
              variant="outline" 
              onClick={cleanupTestProviders}
              disabled={testCCXTServerProviders.length === 0}
            >
              Cleanup Test Providers
            </Button>
          </div>

          {testCCXTServerProviders.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ Test CCXT Server provider created! Now you can:
              </p>
              <ul className="text-sm text-green-600 dark:text-green-400 mt-2 ml-4 list-disc">
                <li>Find the provider in the Debug Widget below</li>
                <li>Click the Edit button (pencil icon)</li>
                <li>Modify Server URL, Token, and Timeout fields</li>
                <li>Test that changes are saved correctly</li>
              </ul>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p><strong>Testing Instructions:</strong></p>
            <ol className="list-decimal ml-4 mt-1 space-y-1">
              <li>Create a test CCXT Server provider using the button above</li>
              <li>In the Debug Widget below, find your test provider</li>
              <li>Click the Edit button (pencil icon) to enter edit mode</li>
              <li>Verify that CCXT Server specific fields appear:
                <ul className="list-disc ml-4 mt-1">
                  <li>Server URL (should show: http://localhost:3001)</li>
                  <li>Authentication Token (should show: your-secret-token)</li>
                  <li>Timeout (should show: 30000)</li>
                </ul>
              </li>
              <li>Modify the values and click Save</li>
              <li>Verify that changes are persisted</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Provider Debug Widget</CardTitle>
        </CardHeader>
        <CardContent>
          <DataProviderDebugWidget />
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDebugWidgetCCXTServer;
