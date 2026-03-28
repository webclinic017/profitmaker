export const getChartColors = (theme: 'dark' | 'light') => {
  if (theme === 'light') {
    return {
      back: '#ffffff',
      grid: '#e5e7eb',
      candleUp: '#16c784',
      candleDw: '#ea3943',
      wickUp: '#16c784',
      wickDw: '#ea3943',
      volUp: '#16c784',
      volDw: '#ea3943',
    };
  }
  return {
    back: '#000000',
    grid: '#1a1a1a',
    candleUp: '#26a69a',
    candleDw: '#ef5350',
    wickUp: '#26a69a',
    wickDw: '#ef5350',
    volUp: '#26a69a',
    volDw: '#ef5350',
  };
};

export type ChartColors = ReturnType<typeof getChartColors>;
