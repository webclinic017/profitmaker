import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { useGroupStore } from '@/store/groupStore';
import { BarChart3, PieChart, ListOrdered, FileText, Clock, LineChart, Newspaper, Calendar, BookOpen, ArrowUpDown, Settings, Bug, Bell, Handshake, Users, Database, Globe, Server, TrendingUp, Wallet, ChevronRight } from 'lucide-react';

type WidgetType = 'chart' | 'orderForm' | 'orderbook' | 'trades' | 'deals' | 'dataProviderSettings' | 'dataProviderDemo' | 'dataProviderSetup' | 'dataProviderDebug' | 'notificationTest' | 'debugUserData' | 'debugCCXTCache' | 'exchanges' | 'markets' | 'pairs' | 'userBalances' | 'userTradingData';

interface WidgetMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
}

interface SubmenuPosition {
  x: number;
  y: number;
  placement: 'right' | 'left' | 'bottom' | 'top';
}

const WidgetMenu: React.FC<WidgetMenuProps> = ({ position, onClose }) => {
  const addWidget = useDashboardStore(s => s.addWidget);
  const activeDashboardId = useDashboardStore(s => s.activeDashboardId);
  const getActiveDashboard = useDashboardStore(s => s.getActiveDashboard);
  const { getTransparentGroup } = useGroupStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState<SubmenuPosition>({ x: 0, y: 0, placement: 'right' });
  const [adjustedPosition, setAdjustedPosition] = useState({ x: position.x, y: position.y });
  const diagnosticsMenuRef = useRef<HTMLDivElement>(null);
  const diagnosticsButtonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug logging for widget menu
  React.useEffect(() => {
    console.log('WidgetMenu: Active dashboard changed', { activeDashboardId });
  }, [activeDashboardId]);
  
  // Smart positioning calculation
  const calculateSmartPosition = useCallback(() => {
    const MENU_WIDTH = 300;
    const SUBMENU_WIDTH = 280;
    const PADDING = 20;
    
    // Adjust main menu position to ensure it stays within viewport
    const adjustedMainPosition = {
      x: Math.min(position.x, window.innerWidth - MENU_WIDTH - PADDING),
      y: Math.min(position.y, window.innerHeight - 500)
    };
    
    setAdjustedPosition(adjustedMainPosition);
    
    // Calculate submenu position only if diagnostics menu is visible
    if (showDiagnostics && diagnosticsButtonRef.current && menuRef.current) {
      const buttonRect = diagnosticsButtonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      
      // Try positioning to the right first (default)
      let submenuX = adjustedMainPosition.x + MENU_WIDTH;
      let submenuY = buttonRect.top - menuRect.top + adjustedMainPosition.y;
      let placement: SubmenuPosition['placement'] = 'right';
      
      // Check if submenu would go off-screen to the right
      if (submenuX + SUBMENU_WIDTH > window.innerWidth - PADDING) {
        // Try positioning to the left
        submenuX = adjustedMainPosition.x - SUBMENU_WIDTH;
        placement = 'left';
        
        // If still off-screen to the left, position below
        if (submenuX < PADDING) {
          submenuX = adjustedMainPosition.x;
          submenuY = adjustedMainPosition.y + menuRect.height;
          placement = 'bottom';
          
          // If would go off-screen below, position above
          if (submenuY + 400 > window.innerHeight - PADDING) {
            submenuY = adjustedMainPosition.y - 400;
            placement = 'top';
            
            // Final fallback: position at screen edge
            if (submenuY < PADDING) {
              submenuY = PADDING;
              submenuX = Math.min(submenuX, window.innerWidth - SUBMENU_WIDTH - PADDING);
              placement = 'right';
            }
          }
        }
      }
      
      // Ensure submenu Y position is within viewport
      if (placement === 'right' || placement === 'left') {
        submenuY = Math.max(PADDING, Math.min(submenuY, window.innerHeight - 400 - PADDING));
      }
      
      setSubmenuPosition({ x: submenuX, y: submenuY, placement });
    }
  }, [position, showDiagnostics]);
  
  // Calculate position on mount and when position changes
  useEffect(() => {
    calculateSmartPosition();
  }, [calculateSmartPosition]);
  
  // Recalculate positions when window resizes
  useEffect(() => {
    const handleResize = () => {
      calculateSmartPosition();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateSmartPosition]);
  
  // Recalculate submenu position when diagnostics menu shows
  useEffect(() => {
    if (showDiagnostics) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        calculateSmartPosition();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [showDiagnostics, calculateSmartPosition]);
  
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

  // Handle diagnostics menu visibility with hover delay
  const handleDiagnosticsMouseEnter = useCallback(() => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowDiagnostics(true);
  }, []);
  
  const handleDiagnosticsMouseLeave = useCallback(() => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set new timeout to hide submenu
    hoverTimeoutRef.current = setTimeout(() => {
      setShowDiagnostics(false);
      hoverTimeoutRef.current = null;
    }, 300); // Increased delay for easier navigation
  }, []);
  
  // Keep submenu open when hovering over it
  const handleSubmenuMouseEnter = useCallback(() => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowDiagnostics(true);
  }, []);
  
  const handleSubmenuMouseLeave = useCallback(() => {
    // Immediately hide when leaving submenu
    setShowDiagnostics(false);
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
      className={`group flex items-center w-full space-x-3 px-3 py-2 rounded-md transition-all duration-200 text-left text-sm ${
        widget.disabled 
          ? 'text-terminal-muted/50 cursor-not-allowed opacity-50' 
          : 'text-terminal-text hover:text-terminal-text hover:bg-terminal-accent/60 active:bg-terminal-accent/80 hover:shadow-sm'
      }`}
      onClick={() => !widget.disabled && handleAddWidget(widget.type)}
      disabled={widget.disabled}
    >
      <span className={`transition-colors duration-200 ${
        widget.disabled 
          ? 'text-terminal-muted/50' 
          : 'text-terminal-muted group-hover:text-terminal-text'
      }`}>
        {widget.icon}
      </span>
      <span className="transition-colors duration-200">{widget.label}</span>
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
              ref={diagnosticsButtonRef}
              className="group flex items-center justify-between w-full px-3 py-2 rounded-md text-terminal-text hover:text-terminal-text hover:bg-terminal-accent/60 active:bg-terminal-accent/80 hover:shadow-sm transition-all duration-200 text-left text-sm"
              onMouseEnter={handleDiagnosticsMouseEnter}
              onMouseLeave={handleDiagnosticsMouseLeave}
            >
              <div className="flex items-center space-x-3">
                <span className="text-terminal-muted group-hover:text-terminal-text transition-colors duration-200">
                  <Bug size={16} />
                </span>
                <span className="transition-colors duration-200">Diagnostics</span>
              </div>
              <ChevronRight 
                size={14} 
                className={`text-terminal-muted group-hover:text-terminal-text transition-all duration-200 ${
                  submenuPosition.placement === 'left' ? 'rotate-180' : ''
                }`} 
              />
            </button>
          </div>
        </div>
        
        <div className="p-2 border-t border-terminal-border/50 text-xs text-terminal-muted px-3">
          Select a widget to add to the workspace
        </div>
      </div>

      {/* Diagnostics Submenu with smart positioning */}
      {showDiagnostics && (
        <div
          ref={diagnosticsMenuRef}
          className="widget-menu absolute rounded-lg shadow-lg overflow-hidden z-[10003] border border-terminal-border bg-terminal-widget/95 backdrop-blur-md text-terminal-text"
          style={{ 
            left: submenuPosition.x,
            top: submenuPosition.y,
            width: '280px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          <div className="px-3 py-2 border-b border-terminal-border/50">
            <h3 className="text-sm font-medium">
              Diagnostics
            </h3>
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
