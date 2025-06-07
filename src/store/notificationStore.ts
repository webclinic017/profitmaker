import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  persistent?: boolean; // Для важных уведомлений
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isHistoryOpen: boolean;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  toggleHistory: () => void;
  setHistoryOpen: (open: boolean) => void;
  
  // Helper methods
  showSuccess: (title: string, message?: string, persistent?: boolean) => void;
  showError: (title: string, message?: string, persistent?: boolean) => void;
  showWarning: (title: string, message?: string, persistent?: boolean) => void;
  showInfo: (title: string, message?: string, persistent?: boolean) => void;
}

// Генератор ID для уведомлений
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    immer((set, get) => ({
      notifications: [],
      unreadCount: 0,
      isHistoryOpen: false,

      addNotification: (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: generateNotificationId(),
          timestamp: Date.now(),
          read: false
        };

        set(state => {
          state.notifications.unshift(notification); // Добавляем в начало
          state.unreadCount += 1;
          
          // Ограничиваем историю до 100 уведомлений
          if (state.notifications.length > 100) {
            state.notifications = state.notifications.slice(0, 100);
          }
        });

        // Показываем toast в UI
        const toastId = notification.id;
        
        switch (notification.type) {
          case 'success':
            toast.success(notification.title, {
              id: toastId,
              description: notification.message,
              duration: notification.persistent ? Infinity : 4000,
            });
            break;
          case 'error':
            toast.error(notification.title, {
              id: toastId,
              description: notification.message,
              duration: notification.persistent ? Infinity : 6000,
            });
            break;
          case 'warning':
            toast.warning(notification.title, {
              id: toastId,
              description: notification.message,
              duration: notification.persistent ? Infinity : 5000,
            });
            break;
          case 'info':
            toast.info(notification.title, {
              id: toastId,
              description: notification.message,
              duration: notification.persistent ? Infinity : 4000,
            });
            break;
        }

        console.log(`📢 [Notification] ${notification.type.toUpperCase()}: ${notification.title}`, notification.message);
      },

      markAsRead: (id) => {
        set(state => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && !notification.read) {
            notification.read = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        });
      },

      markAllAsRead: () => {
        set(state => {
          state.notifications.forEach(n => n.read = true);
          state.unreadCount = 0;
        });
      },

      removeNotification: (id) => {
        set(state => {
          const index = state.notifications.findIndex(n => n.id === id);
          if (index !== -1) {
            const notification = state.notifications[index];
            if (!notification.read) {
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
            state.notifications.splice(index, 1);
          }
        });
        
        // Также удаляем toast если он еще показывается
        toast.dismiss(id);
      },

      clearAll: () => {
        set(state => {
          state.notifications = [];
          state.unreadCount = 0;
        });
        
        // Закрываем все активные toasts
        toast.dismiss();
      },

      toggleHistory: () => {
        set(state => {
          state.isHistoryOpen = !state.isHistoryOpen;
        });
      },

      setHistoryOpen: (open) => {
        set(state => {
          state.isHistoryOpen = open;
        });
      },

      // Helper methods
      showSuccess: (title, message, persistent = false) => {
        get().addNotification({
          type: 'success',
          title,
          message,
          persistent
        });
      },

      showError: (title, message, persistent = false) => {
        get().addNotification({
          type: 'error',
          title,
          message,
          persistent
        });
      },

      showWarning: (title, message, persistent = false) => {
        get().addNotification({
          type: 'warning',
          title,
          message,
          persistent
        });
      },

      showInfo: (title, message, persistent = false) => {
        get().addNotification({
          type: 'info',
          title,
          message,
          persistent
        });
      },
    })),
    {
      name: 'notification-store',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount
      }),
    }
  )
); 