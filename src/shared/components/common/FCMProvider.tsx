'use client';

import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { toast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { 
  initializeFCM, 
  getFCMToken, 
  onForegroundMessage, 
  requestNotificationPermission 
} from '@/shared/services/firebase';

interface FCMContextType {
  token: string | null;
  permission: NotificationPermission;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  refreshToken: () => Promise<string | null>;
}

const FCMContext = createContext<FCMContextType | undefined>(undefined);

interface FCMProviderProps {
  children: ReactNode;
}

export const FCMProvider: React.FC<FCMProviderProps> = ({ children }) => {
  const { user } = useAuth();
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
    };

    initialize();
  }, [user]);

  // 포그라운드 메시지 처리 (한 번만 등록)
  useEffect(() => {
    if (!state.isInitialized || !user) return;

    // 메시지 핸들러 등록 (Firebase onMessage는 unsubscribe를 반환하지 않음)
    // 대신 isInitialized가 true일 때 한 번만 등록됨
    onForegroundMessage((payload) => {
      console.log('📬 포그라운드 메시지 수신:', payload);
      
      // 토스트 알림 표시
      toast({
        title: payload.notification?.title || '새로운 알림',
        description: payload.notification?.body || '새로운 메시지가 도착했습니다.',
        duration: 5000,
      });
    });

    // Firebase Messaging의 onMessage는 cleanup 함수를 제공하지 않음
    // 메시징 인스턴스가 cleanup되면 자동으로 정리됨
  }, [state.isInitialized, user]);

  // 초기화 완료 시 토큰 정보 로그
  useEffect(() => {
    if (state.isInitialized && state.token) {
      console.log('FCM 토큰:', state.token);
      
      // 여기서 서버에 토큰을 전송할 수 있습니다
      // 예: sendTokenToServer(state.token);
    }
  }, [state.isInitialized, state.token]);

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

  const value: FCMContextType = {
    token: state.token,
    permission: state.permission,
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,
    requestPermission,
    refreshToken,
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
