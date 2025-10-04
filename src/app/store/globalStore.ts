import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'ko' | 'en';
  sidebarCollapsed: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

interface GlobalState {
  // UI State
  sidebarOpen: boolean;
  loading: boolean;
  notifications: Notification[];
  
  // User Preferences
  preferences: UserPreferences;
  
  // System State
  isOnline: boolean;
  lastSyncTime: Date | null;
}

interface GlobalActions {
  // UI Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  
  // Notification Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Preferences Actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setTheme: (theme: UserPreferences['theme']) => void;
  setLanguage: (language: UserPreferences['language']) => void;
  toggleSidebarCollapsed: () => void;
  
  // System Actions
  setOnlineStatus: (isOnline: boolean) => void;
  updateLastSyncTime: () => void;
  
  // Utility Actions
  resetGlobalState: () => void;
}

const initialPreferences: UserPreferences = {
  theme: 'system',
  language: 'ko',
  sidebarCollapsed: false,
  notificationsEnabled: true,
  soundEnabled: true,
};

const initialState: GlobalState = {
  sidebarOpen: true,
  loading: false,
  notifications: [],
  preferences: initialPreferences,
  isOnline: true,
  lastSyncTime: null,
};

export const useGlobalStore = create<GlobalState & GlobalActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // UI Actions
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        
        setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen }),
        
        setLoading: (loading: boolean) => set({ loading }),
        
        // Notification Actions
        addNotification: (notificationData) => {
          const notification: Notification = {
            ...notificationData,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
          };
          
          set((state) => ({
            notifications: [...state.notifications, notification]
          }));
          
          // 자동 제거 (duration이 설정된 경우)
          if (notificationData.duration && notificationData.duration > 0) {
            setTimeout(() => {
              get().removeNotification(notification.id);
            }, notificationData.duration);
          }
        },
        
        removeNotification: (id: string) => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }));
        },
        
        clearNotifications: () => set({ notifications: [] }),
        
        // Preferences Actions
        updatePreferences: (newPreferences) => {
          set((state) => ({
            preferences: { ...state.preferences, ...newPreferences }
          }));
        },
        
        setTheme: (theme) => {
          get().updatePreferences({ theme });
        },
        
        setLanguage: (language) => {
          get().updatePreferences({ language });
        },
        
        toggleSidebarCollapsed: () => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              sidebarCollapsed: !state.preferences.sidebarCollapsed
            }
          }));
        },
        
        // System Actions
        setOnlineStatus: (isOnline: boolean) => set({ isOnline }),
        
        updateLastSyncTime: () => set({ lastSyncTime: new Date() }),
        
        // Utility Actions
        resetGlobalState: () => set(initialState),
      }),
      {
        name: 'global-store',
        partialize: (state) => ({ 
          // UI 상태는 persist하지 않고, 사용자 설정만 persist
          preferences: state.preferences,
        }),
      }
    ),
    { name: 'global-store' }
  )
);
