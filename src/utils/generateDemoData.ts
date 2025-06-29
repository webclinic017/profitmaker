import { OHLCVData } from '@/types/chart';

export function generateDemoData(count: number = 100): OHLCVData[] {
  const data: OHLCVData[] = [];
  const now = new Date();
  // Round to the nearest hour
  now.setMinutes(0, 0, 0);
  let timestamp = now.getTime();
  timestamp = timestamp - count * 60 * 60 * 1000; // Start from count hours ago
  let price = 50000; // Starting price
  let trend = 0; // Used for trend simulation

  for (let i = 0; i < count; i++) {
    // Simulate market trends
    if (i % 20 === 0) { // Change trend every 20 candles
      trend = Math.random() - 0.5; // Random trend between -0.5 and 0.5
    }

    // Add trend to the random walk
    const volatility = 0.02; // 2% base volatility
    const trendImpact = trend * volatility;
    
    const open = price;
    const movement = (Math.random() - 0.5) * volatility + trendImpact;
    const close = open * (1 + movement);
    
    // High and low based on the open/close range
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);
    
    // Volume increases during bigger price movements
    const baseVolume = 1000;
    const movementImpact = Math.abs(movement) * 10;
    const volume = Math.floor((baseVolume + baseVolume * movementImpact) * (1 + Math.random()));

    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    timestamp += 60 * 60 * 1000; // Add 1 hour
    price = close; // Next candle starts at previous close
  }

  return data;
} 