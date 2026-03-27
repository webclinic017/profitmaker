import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Trash2,
  CheckCheck
} from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';

const NotificationTestWidget: React.FC = () => {
  const { 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo,
    notifications,
    unreadCount,
    markAllAsRead,
    clearAll
  } = useNotificationStore();

  const handleTestSuccess = () => {
    showSuccess(
      'Provider successfully updated!',
      'Configuration has been saved and applied',
      false
    );
  };

  const handleTestError = () => {
    showError(
      'Connection failed',
      'Unable to connect to exchange API. Please check your credentials.',
      false
    );
  };

  const handleTestWarning = () => {
    showWarning(
      'Rate limit approaching',
      'You are approaching the API rate limit. Consider reducing request frequency.',
      false
    );
  };

  const handleTestInfo = () => {
    showInfo(
      'New market data available',
      'Real-time data stream has been established for BTC/USDT',
      false
    );
  };

  const handleTestPersistent = () => {
    showError(
      'Critical system error',
      'Database connection lost. Manual intervention required.',
      true // persistent
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Test Notifications</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestSuccess}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
            Success
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestError}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4 text-red-600" />
            Error
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestWarning}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            Warning
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestInfo}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4 text-blue-600" />
            Info
          </Button>
        </div>
        
        <Button
          size="sm"
          variant="destructive"
          onClick={handleTestPersistent}
          className="w-full"
        >
          Test Persistent Error
        </Button>
      </div>

      {notifications.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-medium">Quick Actions</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={markAllAsRead}
                className="flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={clearAll}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Click the bell icon in navbar to view history</p>
        <p>• Notifications appear as toasts on the right</p>
        <p>• Persistent notifications stay until dismissed</p>
        <p>• Total notifications: {notifications.length}</p>
        <p>• Unread: {unreadCount}</p>
      </div>
    </div>
  );
};

export default NotificationTestWidget; 