# Core Features

<cite>
**Referenced Files in This Document**   
- [dashboardStore.ts](file://src/store/dashboardStore.ts)
- [placeOrderStore.ts](file://src/store/placeOrderStore.ts)
- [notificationStore.ts](file://src/store/notificationStore.ts)
- [userStore.ts](file://src/store/userStore.ts)
- [OrderForm.tsx](file://src/components/widgets/OrderForm.tsx)
- [UserBalancesWidget.tsx](file://src/components/widgets/UserBalancesWidget.tsx)
- [TradesWidget.tsx](file://src/components/widgets/TradesWidget.tsx)
- [NotificationHistory.tsx](file://src/components/NotificationHistory.tsx)
- [ExchangesWidget.tsx](file://src/components/ExchangesWidget.tsx)
</cite>

## Table of Contents
1. [Dashboard Management System](#dashboard-management-system)
2. [Trading Functionality](#trading-functionality)
3. [Multi-Account Management](#multi-account-management)
4. [Notification System](#notification-system)
5. [Integrated Trading Workflow](#integrated-trading-workflow)

## Dashboard Management System

The profitmaker trading terminal provides a comprehensive dashboard management system that enables users to create, customize, and persist widget layouts across sessions. The system is built around the `useDashboardStore` which manages multiple dashboards, each containing various widgets positioned in a flexible grid layout.

Users can create new dashboards with custom titles and descriptions, or duplicate existing ones as templates for different trading strategies. Each dashboard supports an unlimited number of widgets that can be freely positioned and resized according to user preferences. The system automatically handles z-index management to ensure proper layering when widgets overlap, bringing selected widgets to the front when interacted with.

Widgets can be minimized to a compact form that displays only essential information, allowing users to declutter their workspace while maintaining access to critical data. When minimized, widgets are automatically arranged in a collapsible zone at the bottom of the screen. Users can also toggle widget visibility to hide less frequently used components without removing them from the layout entirely.

All dashboard configurations are persisted in localStorage with validation through Zod schemas, ensuring data integrity across sessions. The system initializes with a default dashboard if none exists, providing immediate functionality upon first use. Dashboard state includes creation and update timestamps, enabling version tracking and synchronization capabilities.

```mermaid
classDiagram
class Dashboard {
+string id
+string title
+string description
+Widget[] widgets
+DashboardLayout layout
+string createdAt
+string updatedAt
+boolean isDefault
}
class Widget {
+string id
+string type
+string defaultTitle
+string userTitle
+WidgetPosition position
+object config
+string groupId
+boolean showGroupSelector
+boolean isVisible
+boolean isMinimized
+WidgetPosition preCollapsePosition
}
class WidgetPosition {
+number x
+number y
+number width
+number height
+number zIndex
}
class DashboardLayout {
+object gridSize
+boolean snapToGrid
+number gridStep
}
class DashboardStore {
+Dashboard[] dashboards
+string activeDashboardId
+addDashboard(data) string
+removeDashboard(dashboardId)
+updateDashboard(dashboardId, data)
+setActiveDashboard(dashboardId)
+duplicateDashboard(dashboardId) string
+addWidget(dashboardId, widget) string
+removeWidget(dashboardId, widgetId)
+moveWidget(dashboardId, widgetId, x, y)
+resizeWidget(dashboardId, widgetId, width, height)
+bringWidgetToFront(dashboardId, widgetId)
+toggleWidgetVisibility(dashboardId, widgetId)
+toggleWidgetMinimized(dashboardId, widgetId)
+updateWidgetTitle(dashboardId, widgetId, userTitle)
+getActiveDashboard() Dashboard
+getDashboardById(dashboardId) Dashboard
+getWidgetById(dashboardId, widgetId) Widget
+initializeWithDefault()
}
DashboardStore --> Dashboard : "manages"
Dashboard --> Widget : "contains"
Widget --> WidgetPosition : "has"
Dashboard --> DashboardLayout : "has"
```

**Diagram sources**
- [dashboardStore.ts](file://src/store/dashboardStore.ts#L91-L115)
- [dashboardStore.ts](file://src/store/dashboardStore.ts#L117-L444)

**Section sources**
- [dashboardStore.ts](file://src/store/dashboardStore.ts#L91-L444)

## Trading Functionality

The trading functionality in the profitmaker terminal centers around order placement, position monitoring, and trade history viewing through specialized widgets and state management systems. The Order Form widget serves as the primary interface for executing trades, supporting market, limit, and stop-loss order types with real-time validation and cost estimation.

When placing orders, the system performs comprehensive validation against exchange-specific constraints including minimum/maximum quantities, price steps, and available balances. Before execution, it calculates estimated costs and commission fees, providing users with transparent pricing information. The order form includes advanced options such as stop-loss and take-profit configurations, allowing for sophisticated risk management strategies.

Position monitoring is facilitated through dedicated widgets that display current open positions, unrealized profits/losses, and position sizing. These components connect to real-time data streams from connected exchanges, updating position values as market conditions change. Users can view both individual position details and aggregated portfolio exposure across multiple accounts and exchanges.

Trade history viewing is implemented through the TradesWidget component, which retrieves and displays executed orders with filtering and sorting capabilities. The widget shows essential details including order ID, symbol, side, type, price, amount, status, and timestamp. Historical trades can be exported or analyzed within the terminal interface, supporting performance review and tax reporting requirements.

```mermaid
sequenceDiagram
participant User as "Trader"
participant UI as "Order Form UI"
participant Store as "PlaceOrderStore"
participant Service as "OrderExecutionService"
participant Exchange as "Exchange API"
User->>UI : Select instrument and configure order
UI->>Store : Update form data (symbol, amount, price)
Store->>Store : Validate input parameters
Store->>Service : Request market constraints
Service->>Exchange : Fetch symbol info and balance
Exchange-->>Service : Return constraints and balance
Service-->>Store : Provide validation rules
Store->>Store : Calculate estimate and validate
UI->>Store : Submit order
Store->>Store : Final validation
alt Valid order
Store->>Service : Execute order request
Service->>Exchange : Place order via API
Exchange-->>Service : Order confirmation
Service-->>Store : Success response with order ID
Store-->>UI : Update UI with success message
UI->>User : Display order confirmation
else Invalid order
Store-->>UI : Return validation errors
UI->>User : Highlight invalid fields
end
```

**Diagram sources**
- [placeOrderStore.ts](file://src/store/placeOrderStore.ts#L35-L63)
- [placeOrderStore.ts](file://src/store/placeOrderStore.ts#L110-L411)
- [OrderForm.tsx](file://src/components/widgets/OrderForm.tsx#L10-L532)

**Section sources**
- [placeOrderStore.ts](file://src/store/placeOrderStore.ts#L35-L411)
- [OrderForm.tsx](file://src/components/widgets/OrderForm.tsx#L10-L532)

## Multi-Account Management

The profitmaker terminal supports multi-account management through a hierarchical system that allows users to connect and switch between multiple exchange accounts seamlessly. The core of this functionality is the `useUserStore` which maintains user profiles containing collections of exchange accounts with their respective API credentials.

Users can add multiple accounts from different exchanges such as Binance, Bybit, OKX, and others, storing encrypted API keys and secrets securely. Each account is identified by a unique ID and associated with specific exchange parameters including sandbox/live mode settings. The system supports both trading and funding wallets for exchanges that differentiate between these account types.

Account switching is implemented through the group selection mechanism, where users can quickly change their active trading context by selecting different account-exchange-market combinations. This enables traders to manage positions and execute orders across multiple brokers from a single unified interface. The currently selected group determines which account's balance and positions are displayed in relevant widgets.

Security is prioritized through client-side storage of credentials and optional token-based authentication for server-side operations. Users can view all connected accounts in the ExchangesWidget, which provides detailed information about each provider including connection status, priority, and scope of accessible exchanges. Account management operations include adding, removing, and updating account details with proper validation to prevent configuration errors.

```mermaid
classDiagram
class User {
+string id
+string email
+string avatarUrl
+string notes
+string name
+ExchangeAccount[] accounts
}
class ExchangeAccount {
+string id
+string exchange
+string key
+string privateKey
+string password
+string uid
+string email
+string avatarUrl
+string notes
}
class UserStore {
+User[] users
+string activeUserId
+addUser(data)
+removeUser(userId)
+setActiveUser(userId)
+updateUser(userId, data)
+addAccount(userId, account)
+removeAccount(userId, accountId)
+updateAccount(userId, account)
}
class Group {
+string id
+string userId
+string accountId
+string exchange
+string market
+string tradingPair
}
class ExchangesWidget {
+DataProvider[] providers
+string selectedProviderId
+string[] availableExchanges
+loading boolean
}
UserStore --> User : "manages"
User --> ExchangeAccount : "owns"
ExchangesWidget --> DataProvider : "displays"
```

**Diagram sources**
- [userStore.ts](file://src/store/userStore.ts#L29-L51)
- [userStore.ts](file://src/store/userStore.ts#L53-L142)
- [ExchangesWidget.tsx](file://src/components/ExchangesWidget.tsx#L6-L190)

**Section sources**
- [userStore.ts](file://src/store/userStore.ts#L29-L142)
- [ExchangesWidget.tsx](file://src/components/ExchangesWidget.tsx#L6-L190)

## Notification System

The notification system in the profitmaker terminal provides both real-time alerts and historical logging to keep users informed about critical events in their trading activities. Implemented through the `useNotificationStore`, this system supports four notification types—success, error, warning, and info—each with distinct visual styling and persistence options.

Real-time alerts appear as toast notifications in the interface corner, automatically dismissing after a timeout unless marked as persistent. Success notifications confirm order executions and connection establishments, while error notifications highlight failed operations such as rejected orders or authentication issues. Warning notifications indicate potential risks like margin calls or low balances, and info notifications provide general system updates.

All notifications are logged in a persistent history that users can access through the Notification History drawer. The history interface groups notifications by date (Today, Yesterday, or specific dates) and supports marking individual or all notifications as read, deleting notifications, and clearing the entire history. Unread notifications are indicated by a badge counter on the notification bell icon.

The system limits stored notifications to 100 entries to prevent excessive memory usage, implementing a FIFO (first-in, first-out) removal policy when the limit is exceeded. Notifications include timestamps and can contain both a title and optional detailed message content. Developers can trigger notifications programmatically using helper methods like `showSuccess()`, `showError()`, `showWarning()`, and `showInfo()` with options for persistence.

```mermaid
flowchart TD
A[Trigger Event] --> B{Event Type}
B --> |Order Success| C[Create Success Notification]
B --> |API Error| D[Create Error Notification]
B --> |Warning Condition| E[Create Warning Notification]
B --> |System Info| F[Create Info Notification]
C --> G[Add to Notification Store]
D --> G
E --> G
F --> G
G --> H[Display Toast Message]
H --> I[Auto-dismiss based on type]
G --> J[Persist in Local Storage]
J --> K[Update Unread Count]
L[User Opens History] --> M[Display Grouped Notifications]
M --> N[Today]
M --> O[Yesterday]
M --> P[Earlier Dates]
Q[User Actions] --> R[Mark as Read]
Q --> S[Delete Notification]
Q --> T[Clear All]
Q --> U[Mark All Read]
R --> K
S --> K
T --> K
U --> K
```

**Diagram sources**
- [notificationStore.ts](file://src/store/notificationStore.ts#L17-L36)
- [notificationStore.ts](file://src/store/notificationStore.ts#L43-L205)
- [NotificationHistory.tsx](file://src/components/NotificationHistory.tsx#L137-L276)

**Section sources**
- [notificationStore.ts](file://src/store/notificationStore.ts#L17-L205)
- [NotificationHistory.tsx](file://src/components/NotificationHistory.tsx#L137-L276)

## Integrated Trading Workflow

The profitmaker trading terminal integrates its core features into a seamless workflow that guides users from market analysis to execution and portfolio review. This integrated approach begins with the dashboard system, where traders can arrange analytical widgets like charts, order books, and market depth indicators to conduct technical analysis.

Once a trading opportunity is identified, users select the appropriate exchange account through the group selector, which synchronizes the Order Form widget with the chosen account's balance and market specifications. The system automatically fetches exchange constraints such as minimum order sizes and price precision, ensuring compliance with exchange rules before submission.

During order placement, real-time validation prevents common errors like insufficient funds or invalid price formats, while cost estimates provide transparency about execution expenses. Upon successful submission, the system triggers a success notification and updates position monitoring widgets to reflect the new trade, creating an immediate feedback loop.

Post-execution, users can review their trading activity through the trade history widget, analyze performance metrics, and adjust their strategy accordingly. The notification history provides an audit trail of all system events, while portfolio summary widgets aggregate positions across multiple accounts for comprehensive performance evaluation.

This end-to-end workflow is supported by persistent state management, ensuring that customized dashboards, account configurations, and trading preferences are maintained across sessions. The integration of real-time data, secure account management, and comprehensive analytics creates a professional-grade trading environment suitable for both novice and experienced traders.

```mermaid
graph TB
A[Market Analysis] --> B[Dashboard Configuration]
B --> C[Technical Analysis]
C --> D[Trading Decision]
D --> E[Account Selection]
E --> F[Order Placement]
F --> G[Real-time Validation]
G --> H[Cost Estimation]
H --> I[Order Execution]
I --> J[Confirmation Notification]
J --> K[Position Update]
K --> L[Trade History Logging]
L --> M[Performance Review]
M --> N[Strategy Adjustment]
N --> A
O[Notification System] --> J
O --> P[Error Alerts]
O --> Q[Warning Messages]
R[Multi-Account Management] --> E
S[Data Persistence] --> B
S --> E
S --> L
```

**Diagram sources**
- [dashboardStore.ts](file://src/store/dashboardStore.ts#L91-L444)
- [placeOrderStore.ts](file://src/store/placeOrderStore.ts#L35-L411)
- [userStore.ts](file://src/store/userStore.ts#L29-L142)
- [notificationStore.ts](file://src/store/notificationStore.ts#L17-L205)

**Section sources**
- [dashboardStore.ts](file://src/store/dashboardStore.ts#L91-L444)
- [placeOrderStore.ts](file://src/store/placeOrderStore.ts#L35-L411)
- [userStore.ts](file://src/store/userStore.ts#L29-L142)
- [notificationStore.ts](file://src/store/notificationStore.ts#L17-L205)