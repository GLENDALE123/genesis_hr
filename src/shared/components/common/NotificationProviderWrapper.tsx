'use client';

import React from 'react';
import { ElectronNotificationProvider } from './ElectronNotificationProvider';
import { FCMProvider } from './FCMProvider';

interface NotificationProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * 환경별 알림 프로바이더 선택
 * - Electron: FCMProvider + ElectronNotificationProvider (하이브리드)
 * - Web: FCMProvider
 */
export const NotificationProviderWrapper: React.FC<NotificationProviderWrapperProps> = ({ children }) => {
  const [isElectron, setIsElectron] = React.useState(false);
  
  React.useEffect(() => {
    const checkElectron = typeof window !== 'undefined' && window.__ELECTRON__ !== undefined;
    setIsElectron(checkElectron);
    
    if (checkElectron) {
      console.log('🖥️ Electron 환경 감지 → FCM + Firestore 하이브리드 알림 사용');
    } else {
      console.log('🌐 웹 환경 감지 → FCM 푸시 알림 사용');
    }
  }, []);

  // Electron: FCM + Firestore 리스너 모두 사용 (하이브리드)
  if (isElectron) {
    return (
      <FCMProvider>
        <ElectronNotificationProvider>
          {children}
        </ElectronNotificationProvider>
      </FCMProvider>
    );
  }

  // 웹: FCM만 사용
  return <FCMProvider>{children}</FCMProvider>;
};

export default NotificationProviderWrapper;

