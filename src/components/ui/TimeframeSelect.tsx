import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { Timeframe } from '../../types/dataProviders';
import { useDataProviderStore } from '../../store/dataProviderStore';

// Mapping timeframes to display labels (CCXT format - lowercase)
const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',
  '12h': '12h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
};

interface TimeframeSelectProps {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
  exchange: string; // NEW: Required exchange parameter
  className?: string;
}

const TimeframeSelect: React.FC<TimeframeSelectProps> = ({
  value,
  onChange,
  exchange,
  className = ''
}) => {
  const { getTimeframesForExchange } = useDataProviderStore();
  
  // Get available timeframes for this exchange
  const availableTimeframes = useMemo(() => {
    console.log(`🎯 [TimeframeSelect] Getting timeframes for exchange: ${exchange}`);
    const timeframes = getTimeframesForExchange(exchange);
    console.log(`🎯 [TimeframeSelect] Received timeframes:`, timeframes);
    return timeframes.map(tf => ({
      id: tf,
      label: TIMEFRAME_LABELS[tf] || tf.toUpperCase()
    }));
  }, [exchange, getTimeframesForExchange]);
  
  // Ensure current value is available, fallback to first available if not
  const currentValue = useMemo(() => {
    const isCurrentValueAvailable = availableTimeframes.some(tf => tf.id === value);
    if (!isCurrentValueAvailable && availableTimeframes.length > 0) {
      // Auto-switch to first available timeframe
      const firstAvailable = availableTimeframes[0].id;
      setTimeout(() => onChange(firstAvailable), 0);
      return firstAvailable;
    }
    return value;
  }, [value, availableTimeframes, onChange]);
  
  return (
    <div 
      className={`absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-terminal-bg/90 backdrop-blur-sm border border-terminal-border rounded-lg p-1 shadow-lg ${className}`}
    >
      <Clock className="w-3 h-3 text-terminal-muted ml-1 pointer-events-none" />
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value as Timeframe)}
        className="bg-transparent text-terminal-text text-sm border-none outline-none pl-1 pr-1 py-1 cursor-pointer appearance-none min-w-[2.5rem]"
        style={{ 
          background: 'transparent',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
      >
        {availableTimeframes.map(tf => (
          <option key={tf.id} value={tf.id} className="bg-terminal-bg text-terminal-text">
            {tf.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimeframeSelect; 