import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useDataProviderStore } from '../store/dataProviderStore';
import { useNotificationStore } from '../store/notificationStore';

const TestCCXTServerProvider: React.FC = () => {
  const { createProvider, providers } = useDataProviderStore();
  const { showSuccess, showError } = useNotificationStore();
  
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [token, setToken] = useState('your-secret-token');
  const [isCreating, setIsCreating] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch(`${serverUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        showSuccess(
          'Connection successful!',
          `Server is running: ${data.message}`
        );
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      showError(
        'Connection failed',
        `Could not connect to server: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  const createServerProvider = async () => {
    setIsCreating(true);
    try {
      const newProvider = createProvider(
        'ccxt-server',
        'Test CCXT Server',
        ['*'], // All exchanges
        {
          serverUrl,
          token,
          timeout: 30000
        }
      );

      showSuccess(
        'CCXT Server Provider created!',
        `Provider "${newProvider.name}" has been created successfully`
      );
    } catch (error) {
      showError(
        'Error creating provider',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const existingServerProviders = Object.values(providers).filter(p => p.type === 'ccxt-server');

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Test CCXT Server Provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="server-url">Server URL</Label>
          <Input
            id="server-url"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:3001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">Authentication Token</Label>
          <Input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="your-secret-token"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={testConnection}
            disabled={isTestingConnection || !serverUrl}
            variant="outline"
          >
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </Button>

          <Button
            onClick={createServerProvider}
            disabled={isCreating || !serverUrl || !token}
          >
            {isCreating ? 'Creating...' : 'Create Provider'}
          </Button>
        </div>

        {existingServerProviders.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Existing CCXT Server Providers:</h4>
            <div className="space-y-2">
              {existingServerProviders.map(provider => (
                <div key={provider.id} className="text-sm p-2 bg-muted rounded">
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-muted-foreground">
                    URL: {(provider.config as any).serverUrl}
                  </div>
                  <div className="text-muted-foreground">
                    Exchanges: {provider.exchanges.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestCCXTServerProvider;
