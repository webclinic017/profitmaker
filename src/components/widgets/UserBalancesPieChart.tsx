import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Balance } from '../../types/dataProviders';
import { WalletType } from '../../types/dataProviders';

interface PieChartData {
  name: string;
  value: number;
  usdValue: number;
  percentage: number;
  currency: string;
  exchange: string;
  walletType: WalletType;
  color: string;
}

interface UserBalancesPieChartProps {
  balances: Array<Balance & { 
    accountId: string; 
    exchange: string; 
    email: string; 
    walletType: WalletType;
    timestamp?: number;
    usdRate?: string;
    priceLoading?: boolean;
    percentage?: number;
  }>;
  formatCurrency: (value: number, currency: string) => string;
}

// Color palette for pie chart
const COLORS = [
  '#10B981', // emerald-500
  '#3B82F6', // blue-500
  '#F59E0B', // yellow-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#EC4899', // pink-500
  '#84CC16', // lime-500
  '#6366F1', // indigo-500
  '#14B8A6', // teal-500
  '#F43F5E', // rose-500
];

const UserBalancesPieChart: React.FC<UserBalancesPieChartProps> = ({
  balances,
  formatCurrency
}) => {
  const pieData = useMemo(() => {
    const data: PieChartData[] = balances
      .filter(balance => balance.usdValue && balance.usdValue > 0)
      .map((balance, index) => ({
        name: `${balance.currency} (${balance.exchange})`,
        value: balance.total,
        usdValue: balance.usdValue || 0,
        percentage: balance.percentage || 0,
        currency: balance.currency,
        exchange: balance.exchange,
        walletType: balance.walletType,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.usdValue - a.usdValue);

    return data;
  }, [balances]);

  const totalUsdValue = useMemo(() => {
    return pieData.reduce((sum, item) => sum + item.usdValue, 0);
  }, [pieData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PieChartData;
      return (
        <div className="bg-terminal-bg border border-terminal-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-terminal-text">{data.currency}</p>
          <p className="text-xs text-terminal-muted">{data.exchange} • {data.walletType.toUpperCase()}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-terminal-text">
              Amount: {formatCurrency(data.value, data.currency)}
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              USD Value: ${formatCurrency(data.usdValue, 'USD')}
            </p>
            <p className="text-sm text-terminal-muted">
              Share: {data.percentage.toFixed(2)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-terminal-text">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!pieData.length) {
    return (
      <div className="h-full flex items-center justify-center text-terminal-muted">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-terminal-muted/20 flex items-center justify-center mb-2 mx-auto">
            <PieChart className="w-6 h-6" />
          </div>
          <p>No data available for pie chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percentage }) => `${percentage.toFixed(1)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="usdValue"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UserBalancesPieChart; 