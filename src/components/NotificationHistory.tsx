import React from 'react';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X, 
  CheckCheck,
  Trash2
} from 'lucide-react';
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotificationStore, Notification, NotificationType } from '@/store/notificationStore';
import { formatTimestamp } from '@/utils/formatters';

interface NotificationHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Icons for notification types
const notificationIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

// Colors for notification types
const notificationColors: Record<NotificationType, string> = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-orange-600 dark:text-orange-400',
  info: 'text-blue-600 dark:text-blue-400',
};

// Цвета бейджей
const badgeColors: Record<NotificationType, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  warning: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
};

const NotificationItem: React.FC<{ 
  notification: Notification; 
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ notification, onMarkAsRead, onRemove }) => {
  const IconComponent = notificationIcons[notification.type];

  return (
    <div className={`p-4 border-l-4 ${
      notification.read 
        ? 'bg-muted/30 border-l-muted' 
        : 'bg-background border-l-primary'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${notificationColors[notification.type]}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-medium text-sm ${
                  notification.read ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {notification.title}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${badgeColors[notification.type]}`}
                >
                  {notification.type}
                </Badge>
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                )}
              </div>
              
              {notification.message && (
                <p className={`text-sm ${
                  notification.read ? 'text-muted-foreground' : 'text-muted-foreground'
                }`}>
                  {notification.message}
                </p>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                {formatTimestamp(notification.timestamp)}
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-8 w-8 p-0"
                  title="Mark as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(notification.id)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  title="Delete notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationHistory: React.FC<NotificationHistoryProps> = ({ open, onOpenChange }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll 
  } = useNotificationStore();

  // Group notifications by days
  const groupedNotifications = React.useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'long'
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });
    
    return groups;
  }, [notifications]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md ml-auto h-full">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <DrawerTitle>Notifications</DrawerTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription>
            History of all notifications
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          {notifications.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No notifications
                </h3>
                <p className="text-sm text-muted-foreground">
                  All notifications will appear here
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Control buttons */}
              <div className="p-4 border-b bg-muted/20">
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={markAllAsRead}
                      className="flex-1"
                    >
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Mark all read
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={clearAll}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all
                  </Button>
                </div>
              </div>
              
              {/* Notifications list */}
              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => (
                    <div key={groupKey}>
                      <div className="sticky top-0 bg-background/95 backdrop-blur-sm px-4 py-2 border-b">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {groupKey}
                        </h3>
                      </div>
                      {groupNotifications.map((notification, index) => (
                        <div key={notification.id}>
                          <NotificationItem
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onRemove={removeNotification}
                          />
                          {index < groupNotifications.length - 1 && (
                            <Separator className="ml-12" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default NotificationHistory; 