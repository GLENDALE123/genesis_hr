
import React, { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { settingsService } from '@/shared/services/settings/settingsService';

interface ElectronNotificationProviderProps {
  children: React.ReactNode;
}

/**
 * Electron 환경에서 Firebase 알림을 수신하고 네이티브 알림으로 표시
 */
// 최근 표시한 알림 ID 저장 (FCMProvider와 공유)
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__recentNotificationIds = (window as unknown as Record<string, unknown>).__recentNotificationIds || new Set<string>();
}

const getRecentNotificationIds = () => {
  if (typeof window !== 'undefined') {
    return (window as unknown as Record<string, unknown>).__recentNotificationIds as Set<string>;
  }
  return new Set<string>();
};

export const ElectronNotificationProvider: React.FC<ElectronNotificationProviderProps> = ({ children }) => {
  const { user } = useAuthStore();
  const isMountedRef = React.useRef(true);
  const timeoutRefsRef = React.useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 모든 타이머 정리
      timeoutRefsRef.current.forEach(timer => clearTimeout(timer));
      timeoutRefsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    // Electron 환경 체크
    if (typeof window === 'undefined' || !window.__ELECTRON__ || !window.electron) {
      return;
    }

    if (!user?.uid) {
      return;
    }

    if (!db) {
      console.error('❌ Firestore가 초기화되지 않았습니다.');
      return;
    }

    // Firestore 실시간 리스너 설정 (Electron 주 알림 시스템)
    // 렌더러 프로세스가 항상 실행 중이므로 백그라운드에서도 동작
    // users/{userId}/inbox 컬렉션 감지
    const inboxRef = collection(db, `users/${user.uid}/inbox`);
    const q = query(
      inboxRef,
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    let isFirstSnapshot = true;

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // 첫 스냅샷은 무시 (기존 데이터)
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          const notificationId = change.doc.id;
          const recentIds = getRecentNotificationIds();
          
          // 중복 확인 (FCM이 이미 표시했으면 스킵)
          if (recentIds.has(notificationId)) {
            return;
          }

          // 중복 방지 목록에 추가
          recentIds.add(notificationId);
          
          // 기존 타이머가 있으면 정리 (중복 방지)
          const existingTimer = Array.from(timeoutRefsRef.current).find(
            (t) => timeoutRefsRef.current.has(t)
          );
          if (existingTimer) {
            clearTimeout(existingTimer);
            timeoutRefsRef.current.delete(existingTimer);
          }
          
          const timer = setTimeout(() => {
            // cleanup 후 실행되는 경우를 대비한 체크
            if (timeoutRefsRef.current.has(timer) && isMountedRef.current) {
              recentIds.delete(notificationId);
            }
            timeoutRefsRef.current.delete(timer);
          }, 5000);
          timeoutRefsRef.current.add(timer);

          // 설정 기반 필터링
          try {
            const settings = await settingsService.getSettings(user.uid);
            if (!isMountedRef.current) return;
            
            const notificationType = notification.type || notification.metadata?.type || 'system';
            const timestamp = notification.createdAt?.toDate ? notification.createdAt.toDate() : new Date();
            
            // 알림이 허용되는지 확인
            const isAllowed = settingsService.isNotificationAllowed(
              settings,
              notificationType,
              timestamp
            );
            
            if (!isAllowed) {
              return; // 알림 표시 안 함
            }
          } catch (error) {
            if (!isMountedRef.current) return;
            console.error('❌ [Electron] 설정 확인 실패, 알림 표시:', error);
            // 설정 확인 실패 시에도 알림 표시 (안전장치)
          }

          if (!isMountedRef.current) return;

          // Electron 네이티브 알림창 표시 (인앱 알림 제거 - 중복 방지)
          try {
            // 물류이동 알림 데이터 구성
            // subtitle: 발주처가 있으면 "발주처 제품명", 없으면 "제품명"
            const supplier = notification.metadata?.supplier;
            const productName = notification.metadata?.productName;
            const subtitle = supplier && productName 
              ? `${supplier} ${productName}`
              : productName || notification.subtitle;

            const notificationPayload = {
              title: notification.title || '새 알림',
              subtitle: subtitle,
              body: notification.body || notification.message || '',
              icon: notification.metadata?.senderAvatar || notification.senderAvatar,
              senderName: notification.metadata?.senderName || '시스템',
              senderAvatar: notification.metadata?.senderAvatar,
              timestamp: notification.createdAt?.toDate ? notification.createdAt.toDate().toISOString() : notification.createdAt,
              useCustom: true,
              // 중앙 정보 표시용 (inbox에서 저장된 centerInfo 직접 사용)
              centerInfo: notification.metadata?.centerInfo, // 중앙에 표시할 정보
              // ✅ 알림 클릭 시 이동할 링크 추가
              link: notification.link || null,
            };

            await window.electron!.showNotification(notificationPayload);
          } catch (error) {
            console.error('❌ [Firestore → Electron] 네이티브 알림 표시 실패:', error);
          }
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  return <>{children}</>;
};

export default ElectronNotificationProvider;



