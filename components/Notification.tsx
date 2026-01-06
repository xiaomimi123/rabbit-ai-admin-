import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface NotificationProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-20 right-6 z-[60] space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md animate-in slide-in-from-right min-w-[300px] max-w-[500px] ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : notification.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : notification.type === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={20} />
          ) : notification.type === 'error' ? (
            <XCircle size={20} />
          ) : notification.type === 'warning' ? (
            <AlertCircle size={20} />
          ) : (
            <Info size={20} />
          )}
          <span className="text-sm font-medium flex-1">{notification.message}</span>
          <button
            onClick={() => onRemove(notification.id)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
          >
            <XCircle size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  // 🟢 修复：使用 useCallback 避免每次渲染都创建新函数
  const showNotification = React.useCallback((type: Notification['type'], message: string, duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
    
    return id;
  }, []); // 🟢 空依赖数组，函数引用永远不变

  // 🟢 修复：使用 useCallback 避免每次渲染都创建新函数
  const removeNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []); // 🟢 空依赖数组，函数引用永远不变

  return {
    notifications,
    showNotification,
    removeNotification,
  };
};

