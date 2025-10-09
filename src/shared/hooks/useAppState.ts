'use client';

import { useEffect } from 'react';
import { NotificationManager } from '@/shared/components/common/CustomNotification';

/**
 * 앱의 포그라운드/백그라운드 상태를 감지하는 훅
 */
export const useAppState = () => {
  useEffect(() => {
    let isForeground = true;

    const handleVisibilityChange = () => {
      isForeground = !document.hidden;
      NotificationManager.setAppState(isForeground);
    };

    const handleFocus = () => {
      isForeground = true;
      NotificationManager.setAppState(true);
    };

    const handleBlur = () => {
      isForeground = false;
      NotificationManager.setAppState(false);
    };

    // 초기 상태 설정
    isForeground = !document.hidden;
    NotificationManager.setAppState(isForeground);

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Tauri 환경에서 추가 이벤트 처리
    if (typeof window !== 'undefined' && window.__TAURI__) {
      // Tauri의 윈도우 이벤트 처리
      const { appWindow } = window.__TAURI__.window;
      
      appWindow.onFocusChanged(({ focused }) => {
        isForeground = focused;
        NotificationManager.setAppState(focused);
      });
    }

    // 클린업
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
};

export default useAppState;


