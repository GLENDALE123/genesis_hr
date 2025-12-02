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

// 알림 timeout ID를 저장하는 Map
const notificationTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// 안전한 ID 생성을 위한 카운터
let notificationIdCounter = 0;

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
            id: `notification-${++notificationIdCounter}-${Date.now()}`,
            timestamp: new Date(),
          };
          
          set((state) => {
            // 메모리 누수 방지: 알림 개수 제한 (최대 100개)
            const MAX_NOTIFICATIONS = 100;
            const newNotifications = [...state.notifications, notification];
            
            // 알림이 너무 많으면 오래된 것부터 제거
            if (newNotifications.length > MAX_NOTIFICATIONS) {
              const removed = newNotifications.splice(0, newNotifications.length - MAX_NOTIFICATIONS);
              // 제거된 알림의 timeout도 정리
              removed.forEach(n => {
                if (notificationTimeouts.has(n.id)) {
                  clearTimeout(notificationTimeouts.get(n.id)!);
                  notificationTimeouts.delete(n.id);
                }
              });
            }
            
            return { notifications: newNotifications };
          });
          
          // 자동 제거 (duration이 설정된 경우)
          if (notificationData.duration && notificationData.duration > 0) {
            const timeoutId = setTimeout(() => {
              get().removeNotification(notification.id);
            }, notificationData.duration);
            
            // timeout ID 저장
            notificationTimeouts.set(notification.id, timeoutId);
          }
        },
        
        removeNotification: (id: string) => {
          // timeout이 있다면 정리
          if (notificationTimeouts.has(id)) {
            clearTimeout(notificationTimeouts.get(id)!);
            notificationTimeouts.delete(id);
          }
          
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }));
        },
        
        clearNotifications: () => {
          // 모든 timeout 정리
          notificationTimeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
          });
          notificationTimeouts.clear();
          
          set({ notifications: [] });
        },
        
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
