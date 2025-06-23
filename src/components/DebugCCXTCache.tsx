import React, { useState, useEffect, useMemo } from 'react';
import { CCXTBrowserProviderImpl } from '../store/providers/ccxtBrowserProvider';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Settings, Database, Trash2, RefreshCw, Clock, Users, Code, Zap } from 'lucide-react';

export const DebugCCXTCache: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshStats = () => {
    setStats(CCXTBrowserProviderImpl.getCacheStats());
  };

  const handleClearCache = () => {
    CCXTBrowserProviderImpl.clearCache();
    refreshStats();
  };

  const handleCleanup = () => {
    CCXTBrowserProviderImpl.cleanup();
    refreshStats();
  };

  useEffect(() => {
    refreshStats();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshStats, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const groupedStats = useMemo(() => {
    if (!stats || !stats.instances) return null;

    const grouped = {
      byProvider: {} as Record<string, any[]>,
      byUser: {} as Record<string, any[]>,
      byExchange: {} as Record<string, any[]>,
      byCcxtType: {} as Record<string, any[]>,
      byMarketType: {} as Record<string, any[]>
    };

    stats.instances.forEach((instance: any) => {
      // Group by provider
      if (!grouped.byProvider[instance.providerId]) {
        grouped.byProvider[instance.providerId] = [];
      }
      grouped.byProvider[instance.providerId].push(instance);

      // Group by user
      if (!grouped.byUser[instance.userId]) {
        grouped.byUser[instance.userId] = [];
      }
      grouped.byUser[instance.userId].push(instance);

      // Group by exchange
      if (!grouped.byExchange[instance.exchangeId]) {
        grouped.byExchange[instance.exchangeId] = [];
      }
      grouped.byExchange[instance.exchangeId].push(instance);

      // Group by ccxtType
      if (!grouped.byCcxtType[instance.ccxtType]) {
        grouped.byCcxtType[instance.ccxtType] = [];
      }
      grouped.byCcxtType[instance.ccxtType].push(instance);

      // Group by marketType
      if (!grouped.byMarketType[instance.marketType]) {
        grouped.byMarketType[instance.marketType] = [];
      }
      grouped.byMarketType[instance.marketType].push(instance);
    });

    return grouped;
  }, [stats]);

  if (!stats) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 animate-spin" />
          <span>Loading cache stats...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">CCXT Browser Provider Cache</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-700">Total Instances</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalInstances}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700">Markets Cache</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.totalMarketsCache}</div>
          </div>
        </div>

        {/* Instance Type Distribution */}
        {groupedStats && (
          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Code className="h-4 w-4 text-purple-600" />
              <span className="text-purple-700">CCXT Type Distribution</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(groupedStats.byCcxtType).map(([ccxtType, instances]) => (
                <div key={ccxtType} className={`p-3 rounded-lg ${ccxtType === 'pro' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {ccxtType === 'pro' ? <Zap className="h-4 w-4 text-purple-600" /> : <Database className="h-4 w-4 text-blue-600" />}
                    <span className={`font-medium ${ccxtType === 'pro' ? 'text-purple-700' : 'text-blue-700'}`}>
                      {ccxtType === 'pro' ? 'CCXT Pro (WebSocket)' : 'CCXT Regular (REST)'}
                    </span>
                  </div>
                  <div className={`text-xl font-bold ${ccxtType === 'pro' ? 'text-purple-600' : 'text-blue-600'}`}>
                    {instances.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Instance List */}
        {stats.instances.length > 0 && (
          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span>Instance Details</span>
            </h4>
            <div className="space-y-2">
              {stats.instances.map((instance: any, idx: number) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border-l-4 border-l-blue-500">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-mono text-xs text-gray-500 mb-1">Instance Key:</div>
                      <div className="font-mono text-xs bg-white p-1 rounded border break-all">
                        {instance.key}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Provider:</span>
                        <span className="font-medium text-blue-600">{instance.providerId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">User:</span>
                        <span className="font-medium">{instance.userId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Account:</span>
                        <span className="font-medium">{instance.accountId}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mt-3 pt-2 border-t text-sm">
                    <div>
                      <span className="text-gray-600">Exchange:</span>
                      <div className="font-medium text-green-600">{instance.exchangeId}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Market:</span>
                      <div className="font-medium text-orange-600">{instance.marketType}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <div className={`font-medium ${instance.ccxtType === 'pro' ? 'text-purple-600' : 'text-blue-600'}`}>
                        {instance.ccxtType}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Markets:</span>
                      <div className={`font-medium ${instance.marketsLoaded ? 'text-green-600' : 'text-red-600'}`}>
                        {instance.marketsLoaded ? '✅ Loaded' : '❌ Not loaded'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Age: {formatDuration(instance.age)}</span>
                    </div>
                    <div>
                      Last Access: {new Date(instance.lastAccess).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalInstances === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <h4 className="font-medium mb-1">No CCXT Instances Cached</h4>
            <p className="text-sm">Cache will populate when CCXT instances are created</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleClearCache}
            disabled={stats.totalInstances === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Cache ({stats.totalInstances})
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCleanup}
            disabled={stats.totalInstances === 0}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Cleanup Expired
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshStats}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Stats
          </Button>
        </div>
      </div>
    </Card>
  );
}; 