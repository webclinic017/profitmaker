import React from 'react';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/store/dashboardStore';

interface CollapsedWidgetsZoneProps {
  className?: string;
}

const COLLAPSED_WIDGET_HEIGHT = 40;
const COLLAPSED_WIDGET_WIDTH = 200;

export const CollapsedWidgetsZone: React.FC<CollapsedWidgetsZoneProps> = ({ className }) => {
  const activeDashboardId = useDashboardStore(s => s.activeDashboardId);
  const dashboards = useDashboardStore(s => s.dashboards);
  const toggleWidgetMinimized = useDashboardStore(s => s.toggleWidgetMinimized);
  
  const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
  const collapsedWidgets = activeDashboard?.widgets.filter(w => w.isMinimized) || [];

  const handleWidgetClick = (widgetId: string) => {
    if (activeDashboardId) {
      toggleWidgetMinimized(activeDashboardId, widgetId);
    }
  };

  if (collapsedWidgets.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[9999] bg-terminal-accent/20 backdrop-blur-sm border-t border-terminal-border",
        "flex items-center justify-center gap-2 p-2",
        className
      )}
      style={{ height: COLLAPSED_WIDGET_HEIGHT + 16 }}
    >
      {collapsedWidgets.map((widget, index) => (
        <button
          key={widget.id}
          onClick={() => handleWidgetClick(widget.id)}
          className={cn(
            "flex items-center px-3 py-2 rounded-md transition-all duration-200",
            "bg-terminal-widget/80 hover:bg-terminal-widget border border-terminal-border",
            "text-terminal-text hover:text-terminal-text-bright",
            "shadow-sm hover:shadow-md transform hover:scale-105",
            "min-w-0 max-w-[200px]"
          )}
          style={{ 
            width: COLLAPSED_WIDGET_WIDTH,
            height: COLLAPSED_WIDGET_HEIGHT - 8
          }}
          title={`Click to expand: ${widget.userTitle || widget.defaultTitle}`}
        >
          <span className="text-xs font-medium truncate">
            {widget.userTitle || widget.defaultTitle}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CollapsedWidgetsZone; 