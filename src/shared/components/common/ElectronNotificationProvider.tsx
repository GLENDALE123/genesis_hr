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

    console.log('🖥️ Electron 알림 프로바이더 활성화');

    if (!db) {
      console.error('❌ Firestore가 초기화되지 않았습니다.');
      return;
    }

    // Firestore 실시간 리스너 설정
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          console.log('🔔 [Electron] 새 알림 수신:', notification);

          // Electron 네이티브 알림 표시
          try {
            const result = await window.electron!.showNotification({
              title: notification.title || '새 알림',
              body: notification.body || '',
              icon: notification.icon,
            });

            console.log('✅ [Electron] 알림 표시 완료:', result);
          } catch (error) {
            console.error('❌ [Electron] 알림 표시 실패:', error);
          }
        }
      });
    });

    console.log('✅ [Electron] Firestore 알림 리스너 등록 완료');

    return () => {
      unsubscribe();
      console.log('👋 [Electron] 알림 리스너 해제');
    };
  }, [user?.uid]);

  return <>{children}</>;
};

export default ElectronNotificationProvider;

