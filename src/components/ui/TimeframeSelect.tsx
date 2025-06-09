import React from 'react';
import { Clock } from 'lucide-react';
import { Timeframe } from '../../types/dataProviders';

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '1m', label: '1M' },
  { id: '5m', label: '5M' },
  { id: '15m', label: '15M' },
  { id: '30m', label: '30M' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
];

interface TimeframeSelectProps {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
  className?: string;
}

const TimeframeSelect: React.FC<TimeframeSelectProps> = ({
  value,
  onChange,
  className = ''
}) => {
  return (
    <div 
      className={`absolute top-2 right-2 z-10 flex items-center gap-1 bg-terminal-bg/90 backdrop-blur-sm border border-terminal-border rounded-lg p-1 shadow-lg ${className}`}
    >
      <Clock className="w-3 h-3 text-terminal-muted ml-1 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Timeframe)}
        className="bg-transparent text-terminal-text text-sm border-none outline-none pl-1 pr-1 py-1 cursor-pointer appearance-none min-w-[2.5rem]"
        style={{ 
          background: 'transparent',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
      >
        {TIMEFRAMES.map(tf => (
          <option key={tf.id} value={tf.id} className="bg-terminal-bg text-terminal-text">
            {tf.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimeframeSelect; 