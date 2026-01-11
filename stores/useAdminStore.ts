/**
 * Zustand 全局状态管理 Store
 * 用于管理管理后台的全局状态
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==================== 类型定义 ====================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AdminState {
  // 通知系统
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // 用户列表筛选状态（持久化）
  userListFilters: {
    search: string;
    sortBy: 'ratBalance' | 'inviteCount' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  };
  setUserListFilters: (filters: Partial<AdminState['userListFilters']>) => void;
  resetUserListFilters: () => void;
  
  // 自动刷新配置（持久化）
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  
  // 侧边栏折叠状态（持久化）
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

// ==================== 默认值 ====================

const defaultUserListFilters: AdminState['userListFilters'] = {
  search: '',
  sortBy: 'ratBalance',
  sortOrder: 'desc',
};

// ==================== Store 创建 ====================

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      // 通知系统（不持久化）
      notifications: [],
      
      addNotification: (type, message) => 
        set((state) => ({
          notifications: [
            ...state.notifications,
            { id: Date.now().toString(), type, message }
          ]
        })),
      
      removeNotification: (id) => 
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      // 用户列表筛选状态（持久化）
      userListFilters: defaultUserListFilters,
      
      setUserListFilters: (filters) =>
        set((state) => ({
          userListFilters: { ...state.userListFilters, ...filters }
        })),
      
      resetUserListFilters: () => 
        set({ userListFilters: defaultUserListFilters }),
      
      // 自动刷新配置（持久化）
      autoRefreshEnabled: true,
      setAutoRefreshEnabled: (enabled) => set({ autoRefreshEnabled: enabled }),
      
      // 侧边栏状态（持久化）
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'rabbit-admin-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // 只持久化部分状态
      partialize: (state) => ({
        userListFilters: state.userListFilters,
        autoRefreshEnabled: state.autoRefreshEnabled,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// ==================== Selectors (性能优化) ====================

// 使用 selectors 避免不必要的重渲染
export const useNotifications = () => useAdminStore((state) => state.notifications);
export const useNotificationActions = () => useAdminStore((state) => ({
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}));

export const useUserListFilters = () => useAdminStore((state) => state.userListFilters);
export const useUserListFilterActions = () => useAdminStore((state) => ({
  setUserListFilters: state.setUserListFilters,
  resetUserListFilters: state.resetUserListFilters,
}));

export const useAutoRefresh = () => useAdminStore((state) => ({
  enabled: state.autoRefreshEnabled,
  setEnabled: state.setAutoRefreshEnabled,
}));

export const useSidebar = () => useAdminStore((state) => ({
  collapsed: state.sidebarCollapsed,
  toggle: state.toggleSidebar,
}));

