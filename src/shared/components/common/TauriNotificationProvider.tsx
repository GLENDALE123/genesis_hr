/**
 * Tauri 알림 프로바이더
 * Tauri 환경에서 Firestore 실시간 알림을 수신하고 표시
 */

'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useRealtimeNotifications } from '@/features/notifications';
import { TauriNotificationService } from '@/shared/services/notifications';

interface TauriNotificationProviderProps {
  children: React.ReactNode;
}

export const TauriNotificationProvider: React.FC<TauriNotificationProviderProps> = ({ 
  children 
}) => {
  const { user } = useAuthStore();

  // Tauri 환경인지 확인
  const isTauri = TauriNotificationService.isTauriEnvironment();

  // Firestore 실시간 알림 리스닝
  useRealtimeNotifications(user?.uid || null);

  useEffect(() => {
    if (isTauri) {
      console.log('Tauri 알림 프로바이더가 활성화되었습니다.');
    }
  }, [isTauri]);

  return <>{children}</>;
};

export default TauriNotificationProvider;


