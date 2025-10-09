'use client';

import React from 'react';
import { ElectronNotificationProvider } from './ElectronNotificationProvider';
import { FCMProvider } from './FCMProvider';

interface NotificationProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * 환경별 알림 프로바이더 선택
 * - Electron: ElectronNotificationProvider
 * - Web: FCMProvider
 */
export const NotificationProviderWrapper: React.FC<NotificationProviderWrapperProps> = ({ children }) => {
  const [isElectron, setIsElectron] = React.useState(false);
  
  React.useEffect(() => {
    const checkElectron = typeof window !== 'undefined' && window.__ELECTRON__ !== undefined;
    setIsElectron(checkElectron);
    
    if (checkElectron) {
      console.log('🖥️ Electron 환경 감지 → Electron 네이티브 알림 사용');
    } else {
      console.log('🌐 웹 환경 감지 → FCM 푸시 알림 사용');
    }
  }, []);

  if (isElectron) {
    return <ElectronNotificationProvider>{children}</ElectronNotificationProvider>;
  }

  return <FCMProvider>{children}</FCMProvider>;
};

export default NotificationProviderWrapper;

