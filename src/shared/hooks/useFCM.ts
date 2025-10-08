import { useState, useEffect, useCallback } from 'react';
import { 
  initializeFCM, 
  getFCMToken, 
  onForegroundMessage, 
  checkNotificationPermission,
  requestNotificationPermission 
} from '@/shared/services/firebase';

interface MessagePayload {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: Record<string, string>;
}

interface FCMState {
  token: string | null;
  permission: NotificationPermission;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

interface FCMHook extends FCMState {
  requestPermission: () => Promise<boolean>;
  refreshToken: () => Promise<string | null>;
  onMessage: (callback: (payload: MessagePayload) => void) => void;
}

export const useFCM = (): FCMHook => {
  const [state, setState] = useState<FCMState>({
    token: null,
    permission: 'default',
    isInitialized: false,
    isLoading: true,
    error: null,
  });

  // FCM 초기화
  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await initializeFCM();
      
      setState(prev => ({
        ...prev,
        token: result.token,
        permission: result.permission,
        isInitialized: true,
        isLoading: false,
      }));
    } catch (error) {
      console.error('FCM 초기화 실패:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'FCM 초기화 실패',
        isLoading: false,
      }));
    }
  }, []);

  // 알림 권한 요청
  const requestPermission = useCallback(async (): Promise<boolean> => {
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
  }, []);

  // 토큰 새로고침
  const refreshToken = useCallback(async (): Promise<string | null> => {
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
  }, []);

  // 포그라운드 메시지 리스너 설정
  const onMessage = useCallback((callback: (payload: MessagePayload) => void) => {
    onForegroundMessage(callback);
  }, []);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 권한 상태 모니터링
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkPermission = () => {
      const currentPermission = checkNotificationPermission();
      setState(prev => ({
        ...prev,
        permission: currentPermission,
      }));
    };

    // 초기 권한 확인
    checkPermission();

    // 권한 변경 감지 (일부 브라우저에서 지원)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then(permission => {
          permission.addEventListener('change', checkPermission);
          return () => permission.removeEventListener('change', checkPermission);
        })
        .catch(() => {
          // 권한 API를 지원하지 않는 브라우저
        });
    }
  }, []);

  return {
    ...state,
    requestPermission,
    refreshToken,
    onMessage,
  };
};

export default useFCM;
