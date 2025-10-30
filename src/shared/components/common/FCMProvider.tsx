'use client';

import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { toast } from '@/shared/hooks/use-toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { 
  initializeFCM, 
  getFCMToken, 
  onForegroundMessage, 
  requestNotificationPermission,
  checkNotificationPermission
} from '@/shared/services/firebase';
import { settingsService } from '@/shared/services/settings/settingsService';

interface FCMContextType {
  token: string | null;
  permission: NotificationPermission;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  refreshToken: () => Promise<string | null>;
  checkPermission: () => NotificationPermission;
  refreshPermission: () => void;
}

export const FCMContext = createContext<FCMContextType | undefined>(undefined);

interface FCMProviderProps {
  children: ReactNode;
}

// 최근 표시한 알림 ID 저장 (ElectronNotificationProvider와 공유)
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__recentNotificationIds = (window as unknown as Record<string, unknown>).__recentNotificationIds || new Set<string>();
}

export const FCMProvider: React.FC<FCMProviderProps> = ({ children }) => {
  const { user } = useAuthStore();
  const [state, setState] = useState({
    token: null as string | null,
    permission: 'default' as NotificationPermission,
    isInitialized: false,
    isLoading: false,
    error: null as string | null,
  });

  // FCM 초기화 (로그인 후에만)
  useEffect(() => {
    if (!user) {
      // 로그인하지 않은 경우 상태 초기화
      setState({
        token: null,
        permission: 'default',
        isInitialized: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        // 환경 확인
        const isElectron = typeof window !== 'undefined' && window.__ELECTRON__;
        // 서비스 워커 지원 확인
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        } else {
          console.warn('⚠️ Service Worker 미지원');
        }
        
        // 알림 권한 확인
        const currentPermission = checkNotificationPermission();
        const result = await initializeFCM();
        if (result.token) {
          // Firestore에 FCM 토큰 저장은 useEffect에서 처리됨
        } else {
          console.warn('⚠️ FCM 토큰을 가져올 수 없습니다.');
        }
        
        setState(prev => ({
          ...prev,
          token: result.token,
          permission: result.permission,
          isInitialized: true,
          isLoading: false,
        }));
      } catch (error) {
        console.error('❌ FCM 초기화 실패:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'FCM 초기화 실패',
          isLoading: false,
        }));
      }
    };

    initialize();
  }, [user]);

  // 포그라운드 메시지 처리 (FCM + Firestore 하이브리드)
  useEffect(() => {
    if (!state.isInitialized || !user) return;

    const isElectron = typeof window !== 'undefined' && window.__ELECTRON__;

    // 1. FCM 메시지 처리 (우선)
    const fcmUnsubscribe = onForegroundMessage(async (payload) => {
      // 설정 기반 필터링
      try {
        const settings = await settingsService.getSettings(user.uid);
        const notificationType = payload.data?.type || 'system';
        
        const isAllowed = settingsService.isNotificationAllowed(
          settings,
          notificationType,
          new Date()
        );
        
        if (!isAllowed) {
          return;
        }
      } catch (error) {
        console.error('❌ 설정 확인 실패, 알림 표시:', error);
      }
      
      const title = payload.notification?.title || '새로운 알림';
      const body = payload.notification?.body || '새로운 메시지가 도착했습니다.';
      
      // Electron 환경: window.electron API 사용
      if (isElectron && window.electron?.showNotification) {
        window.electron.showNotification({
          title,
          body,
          data: payload.data || {},
        });
        return;
      }
      
      // 웹 환경: 브라우저 네이티브 알림만 사용 (보안 컨텍스트에서만)
      const isSecure = (window as any).isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isSecure && Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'fcm-notification',
            requireInteraction: false,
            data: payload.data || {},
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
            if (payload.data?.link) {
              window.location.href = payload.data.link;
            }
          };
        } catch (error) {
          console.warn('⚠️ [FCM] 브라우저 알림 실패:', error);
        }
      } else if (isSecure) {
      }
      
      // Toast도 표시
      toast({
        title,
        description: body,
        duration: 5000,
      });
    });

    // 2. Firestore 리스너 폴백 (FCM 실패 시 또는 에뮬레이터)
    // 웹 환경에서도 Firestore inbox 감지하여 알림 표시
    let firestoreUnsubscribe: (() => void) | undefined;
    
    if (!isElectron) {
      const setupFirestoreListener = async () => {
        const { collection, query, where, onSnapshot, orderBy, limit } = await import('firebase/firestore');
        const { db } = await import('@/shared/services/firebase/config');
        
        if (!db) return;
        
        const inboxRef = collection(db, `users/${user.uid}/inbox`);
        const q = query(
          inboxRef,
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        let isFirstSnapshot = true;
        const recentIds = getRecentNotificationIds();

        firestoreUnsubscribe = onSnapshot(q, async (snapshot) => {
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            return;
          }

          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const notification = change.doc.data();
              const notificationId = change.doc.id;
              
              if (recentIds.has(notificationId)) {
                return;
              }

              recentIds.add(notificationId);
              setTimeout(() => recentIds.delete(notificationId), 5000);

              // 설정 확인
              try {
                const settings = await settingsService.getSettings(user.uid);
                const notificationType = notification.type || notification.metadata?.type || 'system';
                const timestamp = notification.createdAt?.toDate ? notification.createdAt.toDate() : new Date();
                
                const isAllowed = settingsService.isNotificationAllowed(
                  settings,
                  notificationType,
                  timestamp
                );
                
                if (!isAllowed) {
                  return;
                }
              } catch (error) {
                console.error('❌ 설정 확인 실패, 알림 표시:', error);
              }

              // 브라우저 네이티브 알림만 사용
              const title = notification.title || '새 알림';
              const body = notification.body || notification.message || '';
              
              const isSecure = (window as any).isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              if (isSecure && Notification.permission === 'granted') {
                try {
                  const browserNotification = new Notification(title, {
                    body,
                    icon: '/favicon.ico',
                    tag: `firestore-${notificationId}`,
                    requireInteraction: false,
                  });
                  
                  browserNotification.onclick = () => {
                    window.focus();
                    browserNotification.close();
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  };
                } catch (error) {
                  console.warn('⚠️ [Firestore 폴백] 브라우저 알림 실패:', error);
                }
              } else if (isSecure) {
              }
              
              // Toast도 표시
              toast({
                title,
                description: body,
                duration: 5000,
              });
            }
          });
        });
      };
      
      setupFirestoreListener();
    }

    return () => {
      if (typeof fcmUnsubscribe === 'function') {
        try { fcmUnsubscribe(); } catch {}
      }
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [state.isInitialized, user]);

const getRecentNotificationIds = () => {
  if (typeof window !== 'undefined') {
    return (window as unknown as Record<string, unknown>).__recentNotificationIds as Set<string>;
  }
  return new Set<string>();
};

  // 초기화 완료 시 토큰을 Firestore에 저장 (에뮬레이터/프로덕션 모두)
  useEffect(() => {
    if (!state.isInitialized || !state.token || !user?.uid) return;
    
    const saveTokenToFirestore = async () => {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('@/shared/services/firebase/config');
        
        if (!db) {
          console.error('❌ Firestore가 초기화되지 않았습니다.');
          return;
        }
        
        if (!state.token) {
          console.error('❌ FCM 토큰이 없습니다.');
          return;
        }
        
        // 현재 환경의 Firestore에 저장 (에뮬레이터 또는 프로덕션)
        const tokenRef = doc(db, 'users', user.uid, 'fcmTokens', state.token);
        await setDoc(tokenRef, {
          token: state.token,
          enabled: true,
          platform: typeof window !== 'undefined' && window.__ELECTRON__ ? 'electron' : 'web',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { merge: true });
      } catch (error) {
        console.error('❌ FCM 토큰 저장 실패:', error);
      }
    };
    
    saveTokenToFirestore();
  }, [state.isInitialized, state.token, user?.uid]);

  // 에러 발생 시 토스트 표시
  useEffect(() => {
    if (state.error) {
      toast({
        title: 'FCM 오류',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state.error]);

  // 알림 권한 변경 감지 (웹 브라우저)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    const handlePermissionChange = async () => {
      const currentPermission = checkNotificationPermission();
      if (currentPermission !== state.permission) {
        setState(prev => ({
          ...prev,
          permission: currentPermission,
        }));
        // 권한이 허용되면 토큰 새로고침
        if (currentPermission === 'granted' && !state.token) {
          try {
            const token = await getFCMToken();
            setState(prev => ({
              ...prev,
              token,
            }));
          } catch (error) {
            console.error('토큰 새로고침 실패:', error);
          }
        }
      }
    };

    // 권한 변경 이벤트 리스너 (일부 브라우저에서 지원)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((result) => {
        result.addEventListener('change', handlePermissionChange);
        cleanup = () => {
          result.removeEventListener('change', handlePermissionChange);
        };
      }).catch(() => {
        // 권한 API를 지원하지 않는 경우 폴링으로 대체
        const interval = setInterval(handlePermissionChange, 2000);
        cleanup = () => clearInterval(interval);
      });
    } else {
      // 권한 API를 지원하지 않는 경우 폴링으로 대체
      const interval = setInterval(handlePermissionChange, 2000);
      cleanup = () => clearInterval(interval);
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [state.permission, state.token]);

  // 알림 권한 요청
  const requestPermission = async (): Promise<boolean> => {
    try {
      const granted = await requestNotificationPermission();
      
      if (granted) {
        // 권한이 허용되면 토큰 새로고침
        const token = await getFCMToken();
        setState(prev => ({
          ...prev,
          token,
          permission: 'granted',
        }));
      } else {
        setState(prev => ({
          ...prev,
          permission: 'denied',
        }));
      }
      
      return granted;
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '권한 요청 실패',
      }));
      return false;
    }
  };

  // 로그인 직후 1회 자동 권한 요청 (안전장치 포함)
  useEffect(() => {
    // 사용자 없으면 동작 안 함
    if (!user) return;

    // 클라이언트 보장
    if (typeof window === 'undefined') return;

    // Electron 환경은 제외 (네이티브 알림 사용)
    const isElectron = (window as any).__ELECTRON__;
    if (isElectron) return;

    // 보안 컨텍스트(HTTPS 또는 localhost)에서만 요청
    const isSecure = (window as any).isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure) return;

    // 이미 권한이 결정된 경우(default가 아님) 또는 이미 토큰이 있는 경우 스킵
    if (state.permission !== 'default' || state.token) return;

    // 세션 단위 중복 요청 방지
    const prompted = sessionStorage.getItem('hs-next:notif_prompted') === '1';
    if (prompted) return;

    // 실제 요청 (버튼 인터랙션 없이 허용되는 브라우저 한정)
    (async () => {
      try {
        const granted = await requestPermission();
        // 한번만 시도하도록 마킹 (성공/실패 무관)
        sessionStorage.setItem('hs-next:notif_prompted', '1');
        if (!granted) {
          // 거부 시 추가 동작 없음 (사용자가 설정에서 다시 시도 가능)
        }
      } catch {
        sessionStorage.setItem('hs-next:notif_prompted', '1');
      }
    })();
  }, [user, state.permission, state.token]);

  // 토큰 새로고침
  const refreshToken = async (): Promise<string | null> => {
    try {
      const token = await getFCMToken();
      setState(prev => ({
        ...prev,
        token,
      }));
      return token;
    } catch (error) {
      console.error('토큰 새로고침 실패:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '토큰 새로고침 실패',
      }));
      return null;
    }
  };

  // 권한 상태 확인
  const checkPermission = (): NotificationPermission => {
    return checkNotificationPermission();
  };

  // 권한 상태 새로고침
  const refreshPermission = () => {
    const currentPermission = checkNotificationPermission();
    setState(prev => ({
      ...prev,
      permission: currentPermission,
    }));
  };

  const value: FCMContextType = {
    token: state.token,
    permission: state.permission,
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,
    requestPermission,
    refreshToken,
    checkPermission,
    refreshPermission,
  };

  return (
    <FCMContext.Provider value={value}>
      {children}
    </FCMContext.Provider>
  );
};

export const useFCMContext = (): FCMContextType => {
  const context = useContext(FCMContext);
  if (context === undefined) {
    throw new Error('useFCMContext must be used within a FCMProvider');
  }
  return context;
};

export default FCMProvider;
