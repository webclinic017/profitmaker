import React, { useState, useEffect } from 'react';
import { ccxtInstanceManager } from '../store/utils/ccxtInstanceManager';
import { Button } from './ui/button';

export const DebugCCXTCache: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refreshStats = () => {
    setStats(ccxtInstanceManager.getStats());
  };

  const handleClearCache = () => {
    ccxtInstanceManager.clearCache();
    refreshStats();
  };

  const handleCleanup = () => {
    ccxtInstanceManager.cleanup();
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
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="p-4 bg-terminal-widget border border-terminal-border rounded">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-terminal-text">CCXT Cache Debug</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </Button>
          <Button size="sm" variant="outline" onClick={refreshStats}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleCleanup}>
            Cleanup
          </Button>
          <Button size="sm" variant="destructive" onClick={handleClearCache}>
            Clear All
          </Button>
        </div>
      </div>
      
      {stats && (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-terminal-accent">
              Cached Instances: {stats.totalInstances}
            </h4>
          </div>
          
          {stats.instances.length === 0 ? (
            <p className="text-terminal-muted">No cached instances</p>
          ) : (
            <div className="space-y-2">
              {stats.instances.map((instance: any, index: number) => (
                <div 
                  key={instance.key} 
                  className="p-3 bg-terminal-bg rounded border border-terminal-border"
                >
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-terminal-muted">Exchange:</span>
                      <span className="text-terminal-text ml-2 font-semibold">
                        {instance.exchange}
                      </span>
                    </div>
                    <div>
                      <span className="text-terminal-muted">Provider:</span>
                      <span className="text-terminal-text ml-2">
                        {instance.providerId}
                      </span>
                    </div>
                    <div>
                      <span className="text-terminal-muted">Mode:</span>
                      <span className={`ml-2 font-semibold ${
                        instance.sandbox ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {instance.sandbox ? 'Sandbox' : 'Live'}
                      </span>
                    </div>
                    <div>
                      <span className="text-terminal-muted">Age:</span>
                      <span className="text-terminal-text ml-2">
                        {formatDuration(instance.age)}
                      </span>
                    </div>
                    <div>
                      <span className="text-terminal-muted">Markets:</span>
                      <span className={`ml-2 ${
                        instance.marketsLoaded ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {instance.marketsLoaded ? 'Loaded' : 'Not loaded'}
                      </span>
                    </div>
                    <div>
                      <span className="text-terminal-muted">Last Access:</span>
                      <span className="text-terminal-text ml-2">
                        {new Date(instance.lastAccess).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 