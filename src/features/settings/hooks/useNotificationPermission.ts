/**
 * 알림 권한 관리 훅
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { detectPlatform } from '@/shared/utils/platform';
import { requestNotificationPermission, checkNotificationPermission } from '@/shared/services/firebase/messaging';

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
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [platform] = useState(() => detectPlatform());

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

  // 초기 권한 확인
  useEffect(() => {
    const currentPermission = checkPermission();
    setPermission(currentPermission);
  }, [checkPermission]);

  // 권한 요청
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('❌ 이 환경에서는 알림을 지원하지 않습니다.');
      return false;
    }

    // Electron은 항상 허용 (네이티브 알림)
    if (platform === 'desktop') {
      setPermission('granted');
      return true;
    }

    // 모바일은 앱에서 처리
    if (platform === 'mobile') {
      setPermission('granted');
      return true;
    }

    // 웹 브라우저에서 권한 요청
    try {
      const granted = await requestNotificationPermission();
      const newPermission = checkPermission();
      setPermission(newPermission);
      return granted;
    } catch (error) {
      console.error('❌ 알림 권한 요청 실패:', error);
      return false;
    }
  }, [isSupported, platform, checkPermission]);

  // 권한 변경 감지 (웹 브라우저만)
  useEffect(() => {
    if (platform !== 'web' || !isSupported) return;

    // 권한 변경 감지 (폴링)
    const interval = setInterval(() => {
      const currentPermission = checkPermission();
      if (currentPermission !== permission) {
        setPermission(currentPermission);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [platform, isSupported, permission, checkPermission]);

  return {
    permission,
    platform,
    isSupported,
    canRequest,
    requestPermission,
    checkPermission,
  };
};


