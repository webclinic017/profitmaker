import React from 'react';
import SettingsDrawer from './SettingsDrawer';
import { useSettingsDrawerStore } from '@/store/settingsDrawerStore';
import ChartSettingsWrapper from './widgets/ChartSettingsWrapper';
import TradesSettingsWrapper from './widgets/TradesSettingsWrapper';
import OrderBookSettingsWrapper from './widgets/OrderBookSettingsWrapper';

const WidgetSettingsManager: React.FC = () => {
  const { isOpen, widgetId, widgetType, widgetTitle, groupId, closeDrawer } = useSettingsDrawerStore();

  const renderSettings = () => {
    if (!widgetId || !widgetType) return null;

    switch (widgetType) {
      case 'chart':
        return <ChartSettingsWrapper widgetId={widgetId} selectedGroupId={groupId || undefined} />;
      case 'orderbook':
      case 'orderBook':
        return <OrderBookSettingsWrapper widgetId={widgetId} />;
      case 'portfolio':
        return <div className="text-terminal-muted">Portfolio settings coming soon...</div>;
      case 'trades':
        return <TradesSettingsWrapper widgetId={widgetId} />;
      case 'orderForm':
        return <div className="text-terminal-muted">Order Form settings coming soon...</div>;
      default:
        return <div className="text-terminal-muted">No settings available for this widget</div>;
    }
  };

  return (
    <SettingsDrawer
      isOpen={isOpen}
      onClose={closeDrawer}
      title={`${widgetTitle || 'Widget'} Settings`}
    >
      {renderSettings()}
    </SettingsDrawer>
  );
};

export default WidgetSettingsManager; 