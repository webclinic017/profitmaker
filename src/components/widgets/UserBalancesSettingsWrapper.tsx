import React, { useCallback } from 'react';
import UserBalancesSettings from './UserBalancesSettings';
import { useUserBalancesWidgetStore, UserBalancesDisplayType } from '../../store/userBalancesWidgetStore';

interface UserBalancesSettingsWrapperProps {
  widgetId: string;
}

const UserBalancesSettingsWrapper: React.FC<UserBalancesSettingsWrapperProps> = ({ widgetId }) => {
  const { getWidget, updateWidget } = useUserBalancesWidgetStore();
  
  const widget = getWidget(widgetId);
  const { showTotal, hideSmallAmounts, displayType, smallAmountThreshold } = widget.settings;

  const handleShowTotalChange = useCallback((value: boolean) => {
    updateWidget(widgetId, { showTotal: value });
  }, [widgetId, updateWidget]);

  const handleHideSmallAmountsChange = useCallback((value: boolean) => {
    updateWidget(widgetId, { hideSmallAmounts: value });
  }, [widgetId, updateWidget]);

  const handleDisplayTypeChange = useCallback((value: UserBalancesDisplayType) => {
    updateWidget(widgetId, { displayType: value });
  }, [widgetId, updateWidget]);

  const handleSmallAmountThresholdChange = useCallback((value: number) => {
    updateWidget(widgetId, { smallAmountThreshold: value });
  }, [widgetId, updateWidget]);

  return (
    <UserBalancesSettings
      showTotal={showTotal}
      hideSmallAmounts={hideSmallAmounts}
      displayType={displayType}
      smallAmountThreshold={smallAmountThreshold}
      onShowTotalChange={handleShowTotalChange}
      onHideSmallAmountsChange={handleHideSmallAmountsChange}
      onDisplayTypeChange={handleDisplayTypeChange}
      onSmallAmountThresholdChange={handleSmallAmountThresholdChange}
    />
  );
};

export default UserBalancesSettingsWrapper; 