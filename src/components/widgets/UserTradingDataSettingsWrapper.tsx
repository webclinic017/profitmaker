import React, { useCallback } from 'react';
import { useUserTradingDataWidgetStore } from '../../store/userTradingDataWidgetStore';
import UserTradingDataSettings from './UserTradingDataSettings';

interface UserTradingDataSettingsWrapperProps {
  widgetId: string;
}

const UserTradingDataSettingsWrapper: React.FC<UserTradingDataSettingsWrapperProps> = ({
  widgetId
}) => {
  const { getWidget, updateWidget } = useUserTradingDataWidgetStore();
  const widget = getWidget(widgetId);

  // Handler for showing zero positions
  const handleShowZeroPositionsChange = useCallback((checked: boolean) => {
    updateWidget(widgetId, { showZeroPositions: checked });
  }, [widgetId, updateWidget]);

  // Handler for showing closed orders
  const handleShowClosedOrdersChange = useCallback((checked: boolean) => {
    updateWidget(widgetId, { showClosedOrders: checked });
  }, [widgetId, updateWidget]);

  // Handler for trades limit
  const handleTradesLimitChange = useCallback((limit: number) => {
    updateWidget(widgetId, { tradesLimit: limit });
  }, [widgetId, updateWidget]);

  // Handler for account change
  const handleAccountChange = useCallback((accountId: string) => {
    updateWidget(widgetId, { selectedAccountId: accountId });
  }, [widgetId, updateWidget]);

  return (
    <UserTradingDataSettings
      settings={widget.settings}
      onShowZeroPositionsChange={handleShowZeroPositionsChange}
      onShowClosedOrdersChange={handleShowClosedOrdersChange}
      onTradesLimitChange={handleTradesLimitChange}
      onAccountChange={handleAccountChange}
    />
  );
};

export default UserTradingDataSettingsWrapper; 