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
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // 권한 요청 가능 여부
  // - 웹: Notification API 지원 (denied 상태도 포함 - 브라우저 설정으로 재허용 가능)
  // - Electron: 항상 가능 (네이티브 알림)
  // - Mobile: 앱에서 처리
  const canRequest = isSupported;

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
    if (fcm?.requestPermission) {
      // 권한 상태 확인을 위해 requestPermission 호출
      fcm.requestPermission();
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

  return {
    permission: 'default' as NotificationPermission,
    platform,
    isSupported,
    canRequest,
    requestPermission,
    checkPermission,
  };
};


