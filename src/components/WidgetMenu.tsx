import React, { useEffect, useRef, useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useGroupStore } from '@/store/groupStore';
import { BarChart3, PieChart, ListOrdered, FileText, Clock, LineChart, Newspaper, Calendar, BookOpen, ArrowUpDown, Settings, Bug, Bell, Handshake, Users, Database, Globe, Server, TrendingUp, Wallet, ChevronRight } from 'lucide-react';

type WidgetType = 'chart' | 'orderForm' | 'orderbook' | 'trades' | 'deals' | 'dataProviderSettings' | 'dataProviderDemo' | 'dataProviderSetup' | 'dataProviderDebug' | 'notificationTest' | 'debugUserData' | 'debugCCXTCache' | 'exchanges' | 'markets' | 'pairs' | 'userBalances' | 'userTradingData';

interface WidgetMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
}

const WidgetMenu: React.FC<WidgetMenuProps> = ({ position, onClose }) => {
  const addWidget = useDashboardStore(s => s.addWidget);
  const activeDashboardId = useDashboardStore(s => s.activeDashboardId);
  const getActiveDashboard = useDashboardStore(s => s.getActiveDashboard);
  const { getTransparentGroup } = useGroupStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const diagnosticsMenuRef = useRef<HTMLDivElement>(null);
  
  // Debug logging for widget menu
  React.useEffect(() => {
    console.log('WidgetMenu: Active dashboard changed', { activeDashboardId });
  }, [activeDashboardId]);
  
  // Adjust position to ensure menu stays within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 320),
    y: Math.min(position.y, window.innerHeight - 500)
  };
  
  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          diagnosticsMenuRef.current && !diagnosticsMenuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  const handleAddWidget = (type: WidgetType) => {
    if (!activeDashboardId) return;
    
    // Calculate position for new widget
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Default sizes for different widget types
    const defaultSizes = {
      chart: { width: 650, height: 330 },
      orderForm: { width: 350, height: 550 },
      orderbook: { width: 500, height: 650 },
      trades: { width: 600, height: 550 },
      deals: { width: 900, height: 600 },
      dataProviderSettings: { width: 500, height: 450 },
      dataProviderDemo: { width: 700, height: 400 },
      dataProviderSetup: { width: 500, height: 400 },
      dataProviderDebug: { width: 700, height: 500 },
      notificationTest: { width: 400, height: 500 },
      debugUserData: { width: 600, height: 400 },
      debugCCXTCache: { width: 700, height: 500 },
      exchanges: { width: 600, height: 500 },
      markets: { width: 500, height: 450 },
      pairs: { width: 650, height: 550 },
      userBalances: { width: 700, height: 600 },
      userTradingData: { width: 800, height: 650 }
    };
    
    const size = defaultSizes[type];
    let x = Math.max(20, Math.floor((viewportWidth - size.width) / 2));
    let y = Math.max(80, Math.floor((viewportHeight - size.height) / 2));
    
    // Calculate z-index to be higher than all existing widgets
    const dashboard = getActiveDashboard();
    const maxZIndex = dashboard?.widgets?.length > 0 
      ? Math.max(...dashboard.widgets.map(w => w.position.zIndex || 1))
      : 1;
    const newZIndex = maxZIndex + 1;
    
    // Widget titles mapping
    const widgetTitles = {
      chart: 'Chart',
      orderForm: 'Place Order',
      orderbook: 'Order Book',
      trades: 'Trades',
      deals: 'Deals',
      dataProviderSettings: 'Data Provider Settings',
      dataProviderDemo: 'Data Provider Demo',
      dataProviderSetup: 'Data Provider Setup',
      dataProviderDebug: 'Data Provider Debug',
      notificationTest: 'Notification Test',
      debugUserData: 'Debug User Data',
      debugCCXTCache: 'Debug CCXT Cache',
      exchanges: 'Exchanges Diagnostic',
      markets: 'Markets Diagnostic',
      pairs: 'Pairs Diagnostic',
      userBalances: 'User Balances',
      userTradingData: 'User Trading Data'
    };
    
    // Widgets that don't need group selector (diagnostic, portfolio, settings, etc.)
    const widgetsWithoutGroupSelector = [
      'markets', 'exchanges', 'pairs', 'dataProviderDebug', 'dataProviderDemo', 'dataProviderSetup', 
      'debugUserData', 'debugCCXTCache', 'notificationTest',
      'deals', 'dataProviderSettings', 'userBalances', 'userTradingData'
    ];
    const shouldHideGroupSelector = widgetsWithoutGroupSelector.includes(type);
    
    // Widgets that need transparent group by default (trading widgets)
    const widgetsNeedingTransparentGroup = ['chart', 'orderForm', 'orderbook', 'trades'];
    const transparentGroup = getTransparentGroup();
    const defaultGroupId = widgetsNeedingTransparentGroup.includes(type) && transparentGroup 
      ? transparentGroup.id 
      : undefined;
    
    addWidget(activeDashboardId, {
      type,
      title: widgetTitles[type], // deprecated
      defaultTitle: widgetTitles[type],
      userTitle: undefined,
      position: { x, y, width: size.width, height: size.height, zIndex: newZIndex },
      config: {},
      groupId: defaultGroupId, // Set transparent group for trading widgets
      showGroupSelector: !shouldHideGroupSelector, // Hide group selector for widgets that don't need it
      isVisible: true,
      isMinimized: false
    });
    
    onClose();
  };

  // Widget categories
  const publicDataWidgets = [
    { type: 'chart' as WidgetType, label: 'Chart', icon: <LineChart size={16} /> },
    { type: 'orderbook' as WidgetType, label: 'Order Book (not ready)', icon: <BookOpen size={16} /> },
    { type: 'trades' as WidgetType, label: 'Trades', icon: <ArrowUpDown size={16} /> },
  ];

  const privateDataWidgets = [
    { type: 'userBalances' as WidgetType, label: 'User Balances', icon: <Wallet size={16} /> },
    { type: 'userTradingData' as WidgetType, label: 'User Trading Data (not ready)', icon: <BarChart3 size={16} /> },
    { type: 'deals' as WidgetType, label: 'Deals (not ready)', icon: <Handshake size={16} /> },
    { type: 'orderForm' as WidgetType, label: 'Place Order (not ready)', icon: <FileText size={16} /> },
  ];

  const diagnosticWidgets = [
    { type: 'exchanges' as WidgetType, label: 'Exchanges Diagnostic', icon: <Globe size={16} /> },
    { type: 'markets' as WidgetType, label: 'Markets Diagnostic', icon: <Server size={16} /> },
    { type: 'pairs' as WidgetType, label: 'Pairs Diagnostic', icon: <TrendingUp size={16} /> },
    { type: 'debugUserData' as WidgetType, label: 'Debug User Data', icon: <Users size={16} /> },
    { type: 'debugCCXTCache' as WidgetType, label: 'Debug CCXT Cache', icon: <Database size={16} /> },
    { type: 'notificationTest' as WidgetType, label: 'Notification Test', icon: <Bell size={16} /> },
    { type: 'dataProviderSettings' as WidgetType, label: 'Data Provider Settings', icon: <Settings size={16} /> },
    { type: 'dataProviderDemo' as WidgetType, label: 'Data Provider Demo', icon: <Bug size={16} /> },
    { type: 'dataProviderSetup' as WidgetType, label: 'Data Provider Setup', icon: <Settings size={16} /> },
    { type: 'dataProviderDebug' as WidgetType, label: 'Data Provider Debug', icon: <Bug size={16} /> },
  ];

  const renderWidgetButton = (widget: any) => (
    <button
      key={widget.type}
      className={`flex items-center w-full space-x-3 px-3 py-2 rounded-md transition-colors text-left text-sm ${
        widget.disabled 
          ? 'text-terminal-muted/50 cursor-not-allowed' 
          : 'hover:bg-terminal-accent/50 hover:text-terminal-text'
      }`}
      onClick={() => !widget.disabled && handleAddWidget(widget.type)}
      disabled={widget.disabled}
    >
      <span className={widget.disabled ? 'text-terminal-muted/50' : 'text-terminal-muted'}>
        {widget.icon}
      </span>
      <span>{widget.label}</span>
    </button>
  );

  return (
    <>
      <div
        ref={menuRef}
        className="widget-menu absolute rounded-lg shadow-lg overflow-hidden z-[10002] border border-terminal-border bg-terminal-widget/95 backdrop-blur-md text-terminal-text"
        style={{ left: adjustedPosition.x, top: adjustedPosition.y, width: '300px' }}
      >
        <div className="px-3 py-2 border-b border-terminal-border/50">
          <h3 className="text-sm font-medium">Add Widget</h3>
        </div>
        
        <div className="p-2">
          {/* Public Data Section */}
          <div className="mb-3">
            <div className="px-3 py-1 text-xs font-medium text-terminal-muted/70 uppercase tracking-wide">
              Public Data
            </div>
            <div className="space-y-1">
              {publicDataWidgets.map(renderWidgetButton)}
            </div>
          </div>

          {/* Private Data Section */}
          <div className="mb-3">
            <div className="px-3 py-1 text-xs font-medium text-terminal-muted/70 uppercase tracking-wide">
              Private Data
            </div>
            <div className="space-y-1">
              {privateDataWidgets.map(renderWidgetButton)}
            </div>
          </div>

          {/* Diagnostics Section with submenu */}
          <div>
            <button
              className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-terminal-accent/50 hover:text-terminal-text transition-colors text-left text-sm"
              onMouseEnter={() => setShowDiagnostics(true)}
              onMouseLeave={() => setShowDiagnostics(false)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-terminal-muted">
                  <Bug size={16} />
                </span>
                <span>Diagnostics</span>
              </div>
              <ChevronRight size={14} className="text-terminal-muted" />
            </button>
          </div>
        </div>
        
        <div className="p-2 border-t border-terminal-border/50 text-xs text-terminal-muted px-3">
          Select a widget to add to the workspace
        </div>
      </div>

      {/* Diagnostics Submenu */}
      {showDiagnostics && (
        <div
          ref={diagnosticsMenuRef}
          className="widget-menu absolute rounded-lg shadow-lg overflow-hidden z-[10003] border border-terminal-border bg-terminal-widget/95 backdrop-blur-md text-terminal-text"
          style={{ 
            left: adjustedPosition.x + 300, 
            top: adjustedPosition.y + 120, // Position relative to Diagnostics button
            width: '280px' 
          }}
          onMouseEnter={() => setShowDiagnostics(true)}
          onMouseLeave={() => setShowDiagnostics(false)}
        >
          <div className="px-3 py-2 border-b border-terminal-border/50">
            <h3 className="text-sm font-medium">Diagnostics</h3>
          </div>
          
          <div className="p-2 space-y-1">
            {diagnosticWidgets.map(renderWidgetButton)}
          </div>
        </div>
      )}
    </>
  );
};

export default WidgetMenu;
