'use client';

import React, { useEffect } from 'react';

/**
 * 시스템 트레이 관리자
 * 앱을 시스템 트레이에서 실행하여 백그라운드 알림 지원
 */
export const SystemTrayManager: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      return;
    }

    const setupSystemTray = async () => {
      try {
        // Tauri 시스템 트레이 API
        const { appWindow } = await import('@tauri-apps/api/window');
        
        // 윈도우 닫기 이벤트 처리
        const handleCloseRequested = async (event: any) => {
          event.preventDefault();
          
          // 시스템 트레이로 최소화
          await appWindow.hide();
          
          // 시스템 트레이 알림 표시
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('HS 인사관리 시스템', {
              body: '앱이 시스템 트레이에서 실행 중입니다. 알림을 계속 받을 수 있습니다.',
              icon: '/favicon.ico',
              tag: 'system-tray-notification'
            });
          }
        };

        // 이벤트 리스너 등록
        await appWindow.listen('tauri://close-requested', handleCloseRequested);

        // 시스템 트레이 아이콘 설정 (Tauri 설정에서 처리)
        console.log('시스템 트레이 설정 완료');

      } catch (error) {
        console.error('시스템 트레이 설정 실패:', error);
      }
    };

    setupSystemTray();

  }, []);

  return null;
};

/**
 * 시스템 트레이에서 앱 복원
 */
export const restoreFromSystemTray = async () => {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    return;
  }

  try {
    const { appWindow } = await import('@tauri-apps/api/window');
    
    // 윈도우 표시 및 포커스
    await appWindow.show();
    await appWindow.setFocus();
    await appWindow.unminimize();
    
  } catch (error) {
    console.error('시스템 트레이에서 복원 실패:', error);
  }
};

export default SystemTrayManager;


