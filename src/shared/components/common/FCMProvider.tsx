'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useFCM } from '@/shared/hooks/useFCM';
import { toast } from '@/shared/hooks/use-toast';

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
  const fcm = useFCM();

  // 포그라운드 메시지 처리
  useEffect(() => {
    if (fcm.isInitialized) {
      fcm.onMessage((payload) => {
        console.log('포그라운드 메시지 수신:', payload);
        
        // 토스트 알림 표시
        toast({
          title: payload.notification?.title || '새로운 알림',
          description: payload.notification?.body || '새로운 메시지가 도착했습니다.',
          duration: 5000,
        });
      });
    }
  }, [fcm.isInitialized, fcm.onMessage]);

  // 초기화 완료 시 토큰 정보 로그
  useEffect(() => {
    if (fcm.isInitialized && fcm.token) {
      console.log('FCM 토큰:', fcm.token);
      
      // 여기서 서버에 토큰을 전송할 수 있습니다
      // 예: sendTokenToServer(fcm.token);
    }
  }, [fcm.isInitialized, fcm.token]);

  // 에러 발생 시 토스트 표시
  useEffect(() => {
    if (fcm.error) {
      toast({
        title: 'FCM 오류',
        description: fcm.error,
        variant: 'destructive',
      });
    }
  }, [fcm.error]);

  const value: FCMContextType = {
    token: fcm.token,
    permission: fcm.permission,
    isInitialized: fcm.isInitialized,
    isLoading: fcm.isLoading,
    error: fcm.error,
    requestPermission: fcm.requestPermission,
    refreshToken: fcm.refreshToken,
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
