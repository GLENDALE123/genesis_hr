'use client';

import React, { useEffect } from 'react';
import { NotificationManager } from './CustomNotification';

/**
 * 백그라운드에서 자체 알림을 표시하는 컴포넌트
 * Tauri 환경에서만 동작
 */
export const BackgroundNotificationManager: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      return;
    }

    let notificationWindow: any = null;

    // 백그라운드 알림 윈도우 생성
    const createNotificationWindow = async () => {
      try {
        const { WebviewWindow } = await import('@tauri-apps/api/window');
        notificationWindow = new WebviewWindow('notification', {
          url: '/notification-popup',
          title: '알림',
          width: 400,
          height: 120,
          resizable: false,
          alwaysOnTop: true,
          visible: false,
          decorations: false,
          transparent: true,
          skipTaskbar: true,
          focus: false
        });

        await notificationWindow.show();
      } catch (error) {
        console.error('알림 윈도우 생성 실패:', error);
      }
    };

    // 메인 윈도우 포커스 상태 감지
    const handleMainWindowFocus = async () => {
      if (notificationWindow) {
        await notificationWindow.hide();
      }
    };

    const handleMainWindowBlur = async () => {
      if (notificationWindow) {
        await notificationWindow.show();
      }
    };

    // 초기화
    createNotificationWindow();

    // 이벤트 리스너 등록
    const setupEventListeners = async () => {
      try {
        const { getCurrent } = await import('@tauri-apps/api/window');
        const mainWindow = getCurrent();
        mainWindow.onFocusChanged((event: any) => {
          if (event.payload) {
            handleMainWindowFocus();
          } else {
            handleMainWindowBlur();
          }
        });
      } catch (error) {
        console.error('이벤트 리스너 설정 실패:', error);
      }
    };

    setupEventListeners();

    // 클린업
    return () => {
      if (notificationWindow) {
        notificationWindow.close();
      }
    };
  }, []);

  return null;
};

/**
 * 백그라운드 알림을 표시하는 함수
 */
export const showBackgroundNotification = async (notification: {
  title: string;
  body: string;
  senderName: string;
  senderAvatar?: string;
}) => {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    return;
  }

  try {
    // Rust 백엔드의 show_notification 커맨드 호출
    const { invoke } = await import('@tauri-apps/api/tauri');
    
    await invoke('show_notification', {
      title: notification.title,
      body: notification.body,
      senderName: notification.senderName,
      senderAvatar: notification.senderAvatar || null
    });

  } catch (error) {
    console.error('백그라운드 알림 표시 실패:', error);
  }
};

export default BackgroundNotificationManager;
