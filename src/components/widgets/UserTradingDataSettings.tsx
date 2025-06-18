import React from 'react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { UserTradingDataWidgetSettings } from '../../store/userTradingDataWidgetStore';

interface UserTradingDataSettingsProps {
  settings: UserTradingDataWidgetSettings;
  onShowZeroPositionsChange: (checked: boolean) => void;
  onShowClosedOrdersChange: (checked: boolean) => void;
  onTradesLimitChange: (limit: number) => void;
}

const UserTradingDataSettings: React.FC<UserTradingDataSettingsProps> = ({
  settings,
  onShowZeroPositionsChange,
  onShowClosedOrdersChange,
  onTradesLimitChange
}) => {
  const handleTradesLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 10 && value <= 1000) {
      onTradesLimitChange(value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-terminal-text">Display Options</h3>
        
        {/* Show Zero Positions */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-terminal-text">Show Zero Positions</Label>
            <p className="text-xs text-terminal-muted">
              Display positions with zero amount
            </p>
          </div>
          <Switch
            checked={settings.showZeroPositions}
            onCheckedChange={onShowZeroPositionsChange}
          />
        </div>

        {/* Show Closed Orders */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-terminal-text">Show Closed Orders</Label>
            <p className="text-xs text-terminal-muted">
              Include closed and canceled orders
            </p>
          </div>
          <Switch
            checked={settings.showClosedOrders}
            onCheckedChange={onShowClosedOrdersChange}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-terminal-text">Data Limits</h3>
        
        {/* Trades Limit */}
        <div className="space-y-2">
          <Label className="text-sm text-terminal-text">Trades Limit</Label>
          <p className="text-xs text-terminal-muted">
            Maximum number of trades to fetch (10-1000)
          </p>
          <Input
            type="number"
            min="10"
            max="1000"
            step="10"
            value={settings.tradesLimit}
            onChange={handleTradesLimitChange}
            className="w-24 h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-terminal-text">Current Settings</h3>
        <div className="text-xs text-terminal-muted space-y-1">
          <p>Active Tab: <span className="text-terminal-text">{settings.activeTab}</span></p>
          <p>Selected Accounts: <span className="text-terminal-text">{(settings.selectedAccountIds || []).length === 0 ? 'All' : (settings.selectedAccountIds || []).length}</span></p>
          <p>Zero Positions: <span className="text-terminal-text">{settings.showZeroPositions ? 'Yes' : 'No'}</span></p>
          <p>Closed Orders: <span className="text-terminal-text">{settings.showClosedOrders ? 'Yes' : 'No'}</span></p>
          <p>Trades Limit: <span className="text-terminal-text">{settings.tradesLimit}</span></p>
        </div>
      </div>
    </div>
  );
};

export default UserTradingDataSettings; 