import { useState, useEffect } from 'react';
import { requestLogger, RequestLogEntry } from '../utils/requestLogger';

export function useRequestLogger() {
  const [logs, setLogs] = useState<RequestLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Инициализация с текущими логами
    setLogs(requestLogger.getLogs());
    setIsLoading(false);

    // Подписка на изменения
    const unsubscribe = requestLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    logs,
    isLoading,
    stats: requestLogger.getStats(),
    clearLogs: () => requestLogger.clearLogs(),
    getFilteredLogs: (filter: Parameters<typeof requestLogger.getFilteredLogs>[0]) => 
      requestLogger.getFilteredLogs(filter)
  };
} 