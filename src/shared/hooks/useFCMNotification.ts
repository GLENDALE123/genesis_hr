'use client';

import { useEffect } from 'react';

/**
 * FCM 메시지 수신 처리 훅 (올바른 알림 흐름)
 * Rust에서 FCM 메시지를 받아 웹뷰로 emit하는 구조
 */
export const useFCMNotification = () => {
  useEffect(() => {
    // Tauri 환경에서만 FCM 메시지 리스너 등록
    if (typeof window !== 'undefined' && window.__TAURI__) {
      const setupFCMListener = async () => {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          
          const handleFCMNotification = async (event: any) => {
            console.log('🔔 [useFCMNotification] FCM 메시지 수신:', event.payload);
            
            const { title, body, sender_name, sender_avatar, type, data } = event.payload;
            
            // FCM 메시지를 알림으로 변환하여 표시
            const { NotificationManager } = await import('@/shared/components/common/CustomNotification');
            
            await NotificationManager.notify({
              title,
              body,
              senderName: sender_name,
              senderAvatar: sender_avatar,
              type: type || 'info'
            });
          };

          // FCM 메시지 이벤트 리스너 등록
          const unlisten = await listen('fcm_notification_received', handleFCMNotification);
          console.log('✅ [useFCMNotification] FCM 메시지 리스너 등록 완료');

          return unlisten;
        } catch (error) {
          console.error('❌ [useFCMNotification] FCM 메시지 리스너 등록 실패:', error);
          return undefined;
        }
      };

      let unlisten: (() => void) | undefined;
      
      setupFCMListener().then((unlistenFn) => {
        unlisten = unlistenFn;
      });

      return () => {
        if (unlisten) {
          unlisten();
          console.log('👋 [useFCMNotification] FCM 메시지 리스너 해제');
        }
      };
    }
  }, []);
};
