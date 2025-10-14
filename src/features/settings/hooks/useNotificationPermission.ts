/**
 * 알림 권한 관리 훅
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { detectPlatform } from '@/shared/utils/platform';
import { requestNotificationPermission, checkNotificationPermission } from '@/shared/services/firebase/messaging';
import { useFCM } from '@/shared/hooks/useFCM';

interface UseNotificationPermissionReturn {
  permission: NotificationPermission;
  platform: 'web' | 'desktop' | 'mobile';
  isSupported: boolean;
  canRequest: boolean;
  
  // 권한 요청
  requestPermission: () => Promise<boolean>;
  
  // 권한 확인
  checkPermission: () => NotificationPermission;
}

export const useNotificationPermission = (): UseNotificationPermissionReturn => {
  const fcm = useFCM();
  const [platform] = useState(() => detectPlatform());

  // FCMProvider에서 권한 상태를 가져옴 (실시간 동기화)
  const permission = fcm?.permission || 'default';

  // 플랫폼별 알림 지원 여부
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // 권한 요청 가능 여부
  // - 웹: Notification API 지원 + denied 아님
  // - Electron: 항상 가능 (네이티브 알림)
  // - Mobile: 앱에서 처리
  const canRequest = isSupported && permission !== 'denied';

  // 권한 확인
  const checkPermission = useCallback((): NotificationPermission => {
    if (!isSupported) return 'denied';
    
    // Electron은 항상 granted로 간주 (네이티브 알림 사용)
    if (platform === 'desktop') return 'granted';
    
    // 모바일은 앱에서 처리
    if (platform === 'mobile') return 'granted';
    
    // 웹 브라우저
    return checkNotificationPermission();
  }, [isSupported, platform]);

  // FCMProvider와 동기화를 위해 권한 새로고침
  useEffect(() => {
    if (fcm?.refreshPermission) {
      fcm.refreshPermission();
    }
  }, [fcm]);

  // 권한 요청 (FCMProvider의 requestPermission 사용)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('❌ 이 환경에서는 알림을 지원하지 않습니다.');
      return false;
    }

    // Electron은 항상 허용 (네이티브 알림)
    if (platform === 'desktop') {
      return true;
    }

    // 모바일은 앱에서 처리
    if (platform === 'mobile') {
      return true;
    }

    // 웹 브라우저에서 권한 요청 (FCMProvider 사용)
    if (fcm?.requestPermission) {
      return await fcm.requestPermission();
    }

    // 폴백: 직접 권한 요청
    try {
      const granted = await requestNotificationPermission();
      return granted;
    } catch (error) {
      console.error('❌ 알림 권한 요청 실패:', error);
      return false;
    }
  }, [isSupported, platform, fcm]);

  // 권한 새로고침 (FCMProvider와 동기화)
  const refreshPermission = useCallback(() => {
    if (fcm?.refreshPermission) {
      fcm.refreshPermission();
    }
  }, [fcm]);

  return {
    permission,
    platform,
    isSupported,
    canRequest,
    requestPermission,
    checkPermission,
  };
};


