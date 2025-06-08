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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-blue-600 dark:text-blue-400">
          Cached Instances: {stats?.totalInstances || 0}
        </h4>
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
        <>
          {stats.instances.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No cached instances</p>
          ) : (
            <div className="space-y-3">
              {stats.instances.map((instance: any, index: number) => (
                <div 
                  key={instance.key} 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Exchange:</span>
                      <span className="text-gray-900 dark:text-gray-100 ml-2 font-semibold">
                        {instance.exchange}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                      <span className="text-gray-800 dark:text-gray-200 ml-2">
                        {instance.providerId}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                      <span className={`ml-2 font-semibold ${
                        instance.sandbox 
                          ? 'text-yellow-600 dark:text-yellow-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {instance.sandbox ? 'Sandbox' : 'Live'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Age:</span>
                      <span className="text-gray-800 dark:text-gray-200 ml-2">
                        {formatDuration(instance.age)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Markets:</span>
                      <span className={`ml-2 font-medium ${
                        instance.marketsLoaded 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {instance.marketsLoaded ? 'Loaded' : 'Not loaded'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Last Access:</span>
                      <span className="text-gray-800 dark:text-gray-200 ml-2">
                        {new Date(instance.lastAccess).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}; 