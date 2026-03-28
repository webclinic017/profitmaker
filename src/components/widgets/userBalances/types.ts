import type { ExchangeAccount } from '../../../store/userStore';
import type { Balance } from '../../../types/dataProviders';

export interface UserBalancesWidgetProps {
  dashboardId?: string;
  widgetId?: string;
}

export interface AccountBalance {
  account: ExchangeAccount;
  balances: Balance[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: number | null;
}

export type SortField = 'currency' | 'free' | 'used' | 'total' | 'exchange' | 'market' | 'usdValue';
export type SortDirection = 'asc' | 'desc';
