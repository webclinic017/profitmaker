import React, { useState } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

const TestServerProvider = () => {
  const { providers, createProvider } = useDataProviderStore();
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [token, setToken] = useState('your-secret-token');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateServerProvider = () => {
    try {
      createProvider('ccxt-server', 'Test CCXT Server', ['*'], {
        serverUrl,
        token,
        timeout: 30000,
        sandbox: false
      });
      setTestResult('✅ Server provider created successfully!');
    } catch (error) {
      setTestResult(`❌ Error creating provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestServerConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      // Test health endpoint
      const response = await fetch(`${serverUrl}/health`);
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Server is healthy! Status: ${data.status}, Time: ${data.timestamp}`);
      } else {
        setTestResult(`❌ Server health check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestExchangeInstance = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch(`${serverUrl}/api/exchange/instance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exchangeId: 'kraken',
          marketType: 'spot',
          ccxtType: 'regular',
          sandbox: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Exchange instance created: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setTestResult(`❌ Exchange instance failed: ${response.status} - ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestTicker = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`${serverUrl}/api/exchange/fetchTicker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          config: {
            exchangeId: 'kraken',
            marketType: 'spot',
            ccxtType: 'regular',
            sandbox: false
          },
          symbol: 'BTC/USD'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const ticker = data.data;
          setTestResult(`✅ Ticker data received:
Symbol: ${ticker.symbol}
Price: $${ticker.last?.toLocaleString()}
24h Change: ${ticker.percentage?.toFixed(2)}%
Volume: ${ticker.baseVolume?.toFixed(2)} BTC`);
        } else {
          setTestResult(`❌ Ticker request failed: ${data.error}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setTestResult(`❌ Ticker request failed: ${response.status} - ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCorsProxy = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Test direct API call that would normally fail due to CORS
      const response = await fetch(`${serverUrl}/api/proxy/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD',
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.result) {
          const ticker = Object.values(data.data.result)[0] as any;
          setTestResult(`✅ CORS Proxy successful! Direct Kraken API call:
Pair: XBTUSD
Last Price: $${parseFloat(ticker.c[0]).toLocaleString()}
24h Volume: ${parseFloat(ticker.v[1]).toFixed(2)} BTC
High: $${parseFloat(ticker.h[1]).toLocaleString()}
Low: $${parseFloat(ticker.l[1]).toLocaleString()}

🎯 This call would fail in browser due to CORS!`);
        } else {
          setTestResult(`❌ Proxy request failed: ${JSON.stringify(data, null, 2)}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setTestResult(`❌ Proxy request failed: ${response.status} - ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebSocket = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`${serverUrl}/api/exchange/watchTicker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          config: {
            exchangeId: 'kraken',
            marketType: 'spot',
            ccxtType: 'pro',
            sandbox: false
          },
          symbol: 'BTC/USD'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const ticker = data.data;
          setTestResult(`✅ WebSocket ticker received via server:
Symbol: ${ticker.symbol}
Price: $${ticker.last?.toLocaleString()}
24h Change: ${ticker.percentage?.toFixed(2)}%
Volume: ${ticker.baseVolume?.toFixed(2)} BTC
Timestamp: ${new Date(ticker.timestamp).toLocaleString()}

🚀 WebSocket data successfully proxied through server!`);
        } else {
          setTestResult(`❌ WebSocket request failed: ${data.error}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setTestResult(`❌ WebSocket request failed: ${response.status} - ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setTestResult(`❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const serverProviders = Object.values(providers).filter(p => p.type === 'ccxt-server');

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🖥️ CCXT Server Provider Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Server Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serverUrl">Server URL</Label>
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:3001"
              />
            </div>
            <div>
              <Label htmlFor="token">API Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="your-secret-token"
              />
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tests</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleTestServerConnection}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button 
              onClick={handleTestExchangeInstance}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Testing...' : 'Test Exchange Instance'}
            </Button>
            <Button
              onClick={handleTestTicker}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Testing...' : 'Test Ticker Data'}
            </Button>
            <Button
              onClick={handleTestCorsProxy}
              disabled={isLoading}
              variant="outline"
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              {isLoading ? 'Testing...' : 'Test CORS Bypass'}
            </Button>
            <Button
              onClick={handleTestWebSocket}
              disabled={isLoading}
              variant="outline"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              {isLoading ? 'Testing...' : 'Test WebSocket'}
            </Button>
            <Button 
              onClick={handleCreateServerProvider}
              disabled={isLoading}
            >
              Create Server Provider
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <Alert>
            <AlertDescription>
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Providers */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Current Server Providers ({serverProviders.length})</h3>
          {serverProviders.length === 0 ? (
            <p className="text-muted-foreground">No server providers created yet.</p>
          ) : (
            <div className="space-y-2">
              {serverProviders.map(provider => (
                <div key={provider.id} className="p-3 bg-muted rounded-lg">
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-muted-foreground">
                    URL: {provider.config.serverUrl} | 
                    Exchanges: {provider.exchanges.includes('*') ? 'All' : provider.exchanges.join(', ')} |
                    Status: {provider.status} |
                    Priority: {provider.priority}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Instructions</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>1. Make sure the Express server is running: <code>npm run server</code></p>
            <p>2. Test the connection to verify server is accessible</p>
            <p>3. Test exchange instance creation to verify CCXT integration</p>
            <p>4. Test ticker data to verify market data retrieval</p>
            <p>5. <strong>Test CORS Bypass</strong> - the main purpose of server provider!</p>
            <p>6. <strong>Test WebSocket</strong> - verify CCXT Pro WebSocket functionality</p>
            <p>7. Create server provider to integrate with the application</p>
            <p className="text-green-600 font-medium">💡 Server provider bypasses browser CORS restrictions</p>
            <p className="text-blue-600 font-medium">🚀 WebSocket support via CCXT Pro on server</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestServerProvider;
