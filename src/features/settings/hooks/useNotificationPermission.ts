/**
 * 알림 권한 관리 훅
 */


import { useState, useEffect, useCallback } from 'react';
import { detectPlatform } from '@/shared/utils/platform/platform';
import { requestNotificationPermission, checkNotificationPermission } from '@/shared/services/firebase/messaging';
import { useFCM } from '@/shared/hooks/useFCM';
import { useAuthStore } from '@/features/auth/store/authStore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';

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
  const { user } = useAuthStore();
  const [platform] = useState(() => detectPlatform());
  const [mobilePermission, setMobilePermission] = useState<boolean | null>(null);

  // FCMProvider에서 권한 상태를 가져옴 (실시간 동기화)
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // 모바일 알림 권한 상태 실시간 동기화 (Firestore에서 확인)
  useEffect(() => {
    if (!user?.uid || platform !== 'mobile' || !db) return;

    const permissionRef = doc(db, `users/${user.uid}/settings/notificationPermission`);
    const unsubscribe = onSnapshot(
      permissionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMobilePermission(data?.authorized ?? null);
        } else {
          setMobilePermission(null);
        }
      },
      (error) => {
        console.error('모바일 알림 권한 상태 구독 실패:', error);
        setMobilePermission(null);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, platform]);

  // 권한 요청 가능 여부
  // - 웹: Notification API 지원 (denied 상태도 포함 - 브라우저 설정으로 재허용 가능)
  // - Electron: 항상 가능 (네이티브 알림)
  // - Mobile: 앱에서 처리
  const canRequest = isSupported || platform === 'mobile';

  // 권한 확인
  const checkPermission = useCallback((): NotificationPermission => {
    if (!isSupported && platform !== 'mobile') return 'denied';
    
    // Electron은 항상 granted로 간주 (네이티브 알림 사용)
    if (platform === 'desktop') return 'granted';
    
    // 모바일: Firestore에서 저장된 권한 상태 확인
    if (platform === 'mobile') {
      // ReactNativeWebView가 있으면 모바일 앱이므로 네이티브 권한 사용
      // Firestore에서 권한 상태를 확인하되, 로딩 중이면 일단 granted로 표시 (네이티브 권한은 이미 허용됨)
      if (mobilePermission === true) return 'granted';
      if (mobilePermission === false) return 'denied';
      // 아직 Firestore에서 로드 중이면, ReactNativeWebView 존재 여부로 판단
      // ReactNativeWebView가 있다는 것은 모바일 앱 환경이므로 일단 granted로 표시
      // (실제로는 Firestore 동기화 완료 후 정확한 값으로 업데이트됨)
      return 'granted'; // 모바일 앱이면 네이티브 권한은 이미 확인됨
    }
    
    // 웹 브라우저
    return checkNotificationPermission();
  }, [isSupported, platform, mobilePermission]);

  // 자동 권한 요청 제거: 사용자가 명시적으로 요청할 때만
  useEffect(() => {
    // no-op: 기존 자동 요청 로직 제거하여 무한 요청/오류 방지
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

    // 웹 브라우저에서 권한 요청 (FCMProvider 사용) - 보안 컨텍스트에서만
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

  // 현재 권한: FCM 훅의 상태를 우선 사용, 없으면 즉시 체크 결과 사용
  const currentPermission: NotificationPermission = (fcm && fcm.permission) || checkPermission();

  return {
    permission: currentPermission,
    platform,
    isSupported,
    canRequest,
    requestPermission,
    checkPermission,
  };
};



