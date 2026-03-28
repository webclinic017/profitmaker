export const formatCurrency = (value: number, decimals = 8): string => {
  if (value === 0) return '0';
  if (value >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (value >= 0.0001) return value.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const STABLECOINS = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'FRAX', 'LUSD', 'USDD', 'GUSD', 'FDUSD', 'PYUSD'];

export const isStablecoin = (currency: string): boolean =>
  STABLECOINS.includes(currency.toUpperCase());

export const formatUsdValue = (value: number | null | undefined): string => {
  if (value == null) return '-';
  if (value >= 1000) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
};
