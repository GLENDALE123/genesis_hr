/**
 * 통합 알림 프로바이더
 * 환경에 따라 FCM(웹) 또는 Tauri(데스크톱) 알림을 자동 선택
 */

'use client';

import React, { useEffect, useState } from 'react';
import { FCMProvider } from './FCMProvider';
import { TauriNotificationProvider } from './TauriNotificationProvider';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Tauri 환경 감지
    const checkTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
    setIsTauri(checkTauri);
    
    if (checkTauri) {
      console.log('🖥️ Tauri 환경 감지 → Tauri 알림 사용');
    } else {
      console.log('🌐 웹 환경 감지 → FCM 알림 사용');
    }
  }, []);

  // Tauri 환경: Tauri 알림만 사용
  if (isTauri) {
    return <TauriNotificationProvider>{children}</TauriNotificationProvider>;
  }

  // 웹 환경: FCM 알림만 사용
  return <FCMProvider>{children}</FCMProvider>;
};

export default NotificationProvider;

