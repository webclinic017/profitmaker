import React from 'react';
import { Badge } from '../../ui/badge';

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'connected': return '🟢';
    case 'disconnected': return '🔴';
    case 'error': return '⚠️';
    default: return '⚪';
  }
};

export const getStatusBadge = (status: string) => {
  const variant = status === 'connected' ? 'default' : status === 'error' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{status}</Badge>;
};

export const formatTimestamp = (timestamp: number | undefined): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleTimeString();
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 400 && status < 500) return 'text-yellow-400';
  if (status >= 500) return 'text-red-400';
  return 'text-gray-400';
};

export const formatRequestLogTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
};
