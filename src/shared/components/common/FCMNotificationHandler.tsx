'use client';

import { useFCMNotification } from '@/shared/hooks/useFCMNotification';

/**
 * FCM 알림 처리를 위한 클라이언트 컴포넌트
 */
export function FCMNotificationHandler() {
  useFCMNotification();
  return null;
}
