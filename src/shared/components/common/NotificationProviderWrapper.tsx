
import React from 'react';
import { ElectronNotificationProvider } from './ElectronNotificationProvider';
import { FCMProvider } from './FCMProvider';

interface NotificationProviderWrapperProps {
  children: React.ReactNode;
}

// Electron 환경에서는 FCM을 사용하지 않음
// 웹 환경에서만 FCMProvider 사용

/**
 * 환경별 알림 프로바이더 선택
 * - Electron: ElectronNotificationProvider (Firestore 리스너만)
 * - Web: FCMProvider (FCM 푸시 알림)
 */
export const NotificationProviderWrapper: React.FC<NotificationProviderWrapperProps> = ({ children }) => {
  // 초기값을 바로 체크하여 설정 (useEffect 대기 없이)
  const [isElectron] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.__ELECTRON__ !== undefined;
  });
  
  React.useEffect(() => {
    if (isElectron) {
    } else {
    }
  }, [isElectron]);

  // Electron: Firestore 리스너만 사용 (FCM 제거)
  if (isElectron) {
    return (
      <ElectronNotificationProvider>
        {children}
      </ElectronNotificationProvider>
    );
  }

  // 웹: FCM만 사용
  return <FCMProvider>{children}</FCMProvider>;
};

export default NotificationProviderWrapper;



