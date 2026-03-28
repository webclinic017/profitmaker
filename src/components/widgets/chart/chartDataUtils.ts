import type { Candle } from '../../../types/dataProviders';
import type { ChartColors } from './chartColors';

export const candlesToOHLCV = (candles: Candle[]) =>
  candles.map(c => [c.timestamp, c.open, c.high, c.low, c.close, c.volume]);

export const createChartPanes = (ohlcvData: any[], colors: ChartColors) => [
  {
    overlays: [
      {
        name: 'Chart',
        type: 'Candles',
        data: ohlcvData,
        settings: {
          colorCandleUp: colors.candleUp,
          colorCandleDw: colors.candleDw,
          colorWickUp: colors.wickUp,
          colorWickDw: colors.wickDw,
        },
      },
    ],
  },
  {
    overlays: [
      {
        name: 'Volume',
        type: 'Volume',
        data: ohlcvData,
        settings: {
          colorVolUp: colors.volUp,
          colorVolDw: colors.volDw,
        },
      },
    ],
  },
];

export const generateOverlayName = (symbol: string, exchange: string, market: string) => {
  const exchangeName = exchange.charAt(0).toUpperCase() + exchange.slice(1);
  const marketType = market === 'spot' ? 'Spot' : 'Futures';
  return `${symbol} (${exchangeName}:${marketType})`;
};
