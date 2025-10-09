'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';

interface ElectronNotificationProviderProps {
  children: React.ReactNode;
}

/**
 * Electron 환경에서 Firebase 알림을 수신하고 네이티브 알림으로 표시
 */
// 최근 표시한 알림 ID 저장 (FCMProvider와 공유)
if (typeof window !== 'undefined') {
  (window as any).__recentNotificationIds = (window as any).__recentNotificationIds || new Set<string>();
}

const getRecentNotificationIds = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__recentNotificationIds as Set<string>;
  }
  return new Set<string>();
};

export const ElectronNotificationProvider: React.FC<ElectronNotificationProviderProps> = ({ children }) => {
  const { user } = useAuthStore();

  useEffect(() => {
    // Electron 환경 체크
    if (typeof window === 'undefined' || !window.__ELECTRON__ || !window.electron) {
      console.log('🌐 Electron 환경이 아닙니다. ElectronNotificationProvider 비활성화');
      return;
    }

    if (!user?.uid) {
      console.log('⚠️ 사용자 로그인 필요');
      return;
    }

    console.log('🖥️ Electron Firestore 리스너 활성화 (주 알림 시스템)');
    console.log('📌 백그라운드/포그라운드 모두 동작합니다!');

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
        console.log('📋 [Firestore] 초기 알림 로드 완료 (표시 안 함)');
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          const notificationId = change.doc.id;
          const recentIds = getRecentNotificationIds();
          
          // 중복 확인 (FCM이 이미 표시했으면 스킵)
          if (recentIds.has(notificationId)) {
            console.log('⏭️ [Firestore] 이미 표시된 알림 (FCM), 스킵:', notificationId);
            return;
          }

          console.log('🔔 [Firestore 폴백] 새 알림 수신:', notification);

          // 중복 방지 목록에 추가
          recentIds.add(notificationId);
          setTimeout(() => {
            recentIds.delete(notificationId);
          }, 5000);

          // Electron 커스텀 알림창 표시
          try {
            const result = await window.electron!.showNotification({
              title: notification.title || '새 알림',
              body: notification.body || notification.message || '',
              icon: notification.metadata?.senderAvatar || notification.senderAvatar,
              senderName: notification.metadata?.senderName || '시스템',
              senderAvatar: notification.metadata?.senderAvatar,
              timestamp: notification.createdAt?.toDate ? notification.createdAt.toDate().toISOString() : notification.createdAt,
              useCustom: true,
            });

            console.log('✅ [Firestore → Electron] 커스텀 알림 표시 완료');
          } catch (error) {
            console.error('❌ [Firestore → Electron] 알림 표시 실패:', error);
          }
        }
      });
    });

    console.log('✅ [Electron] Firestore 폴백 리스너 등록 완료');

    return () => {
      unsubscribe();
      console.log('👋 [Electron] Firestore 리스너 해제');
    };
  }, [user?.uid]);

  return <>{children}</>;
};

export default ElectronNotificationProvider;

