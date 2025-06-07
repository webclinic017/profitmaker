import React from 'react';
import SettingsDrawer from './SettingsDrawer';
import { useSettingsDrawerStore } from '@/store/settingsDrawerStore';
import ChartSettingsWrapper from './widgets/ChartSettingsWrapper';

const WidgetSettingsManager: React.FC = () => {
  const { isOpen, widgetId, widgetType, widgetTitle, closeDrawer } = useSettingsDrawerStore();

  const renderSettings = () => {
    if (!widgetId || !widgetType) return null;

    switch (widgetType) {
      case 'chart':
        return <ChartSettingsWrapper widgetId={widgetId} />;
      case 'orderBook':
        return <div className="text-terminal-muted">Order Book settings coming soon...</div>;
      case 'portfolio':
        return <div className="text-terminal-muted">Portfolio settings coming soon...</div>;
      case 'trades':
        return <div className="text-terminal-muted">Trades settings coming soon...</div>;
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