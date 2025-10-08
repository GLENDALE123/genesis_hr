/**
 * Firestore 실시간 알림 리스너 훅
 * Windows 7 환경에서 Tauri 네이티브 알림과 연동
 */

import { useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { TauriNotificationService } from '@/shared/services/notifications/tauri-notification';

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: Timestamp;
  link?: string;
  metadata?: Record<string, unknown>;
}

export const useRealtimeNotifications = (userId: string | null) => {
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const lastNotificationTimeRef = useRef<Date>(new Date());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // 클린업 함수 (즉시 정리)
    if (!userId) {
      console.log('사용자 ID가 없어 알림 리스너를 정리합니다.');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        console.log('✅ Firestore 실시간 알림 리스너가 중지되었습니다.');
      }
      return;
    }

    // 초기화 함수
    const initNotifications = async () => {
      if (!db) {
        console.error('Firestore가 초기화되지 않았습니다.');
        return;
      }

      // 앱 시작 시 알림 권한 초기화 (1회만)
      if (!isInitializedRef.current) {
        const granted = await TauriNotificationService.init();
        if (granted) {
          console.log('✅ Tauri 알림 권한이 활성화되었습니다.');
        }
        isInitializedRef.current = true;
      }

      // Firestore 실시간 리스너 설정
      // 복합 인덱스 필요: userId, read, createdAt
      const firestore = db; // 타입 narrowing을 위한 로컬 변수
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(50)  // 최근 50개만
      );

      unsubscribeRef.current = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const docData = change.doc.data();
              const data: NotificationData = {
                id: change.doc.id,
                userId: docData.userId,
                title: docData.title,
                body: docData.body,
                type: docData.type || 'info',
                read: docData.read || false,
                createdAt: docData.createdAt,
                link: docData.link,
                metadata: docData.metadata,
              };

              const createdAt = data.createdAt?.toDate();

              // 앱 시작 이후 생성된 알림만 표시 (중복 방지)
              if (createdAt && createdAt > lastNotificationTimeRef.current) {
                console.log('📬 새 알림 수신:', data.title);
                
                // Tauri 네이티브 알림 표시
                TauriNotificationService.show(
                  data.title,
                  data.body
                );
              }
            }
          });
        },
        (error) => {
          // 권한 에러는 조용히 처리 (로그아웃 상태)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('permission') || errorMessage.includes('insufficient')) {
            console.log('⚠️ Firestore 알림 권한 없음 (로그아웃 상태일 수 있음)');
            return;
          }
          
          // 인덱스 에러만 상세하게 표시
          if (errorMessage.includes('index') || errorMessage.includes('requires an index')) {
            console.error('❌ Firestore 인덱스가 필요합니다.');
            console.error('📝 Firebase Console에서 다음 인덱스를 생성하세요:');
            console.error('   컬렉션: notifications');
            console.error('   필드: userId (오름차순), read (오름차순), createdAt (내림차순)');
            console.error('   또는 다음 명령어를 실행하세요:');
            console.error('   firebase firestore:indexes');
          } else {
            console.error('❌ Firestore 알림 리스너 에러:', error);
          }
        }
      );

      console.log('✅ Firestore 실시간 알림 리스너가 시작되었습니다.');
    };

    // 초기화 실행
    initNotifications();

    // 클린업 함수
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        console.log('✅ Firestore 실시간 알림 리스너가 중지되었습니다.');
      }
    };
  }, [userId]);
};


