import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';

export interface InboxNotification {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string | number | { toDate?: () => Date };
  metadata?: {
    senderName?: string;
    senderAvatar?: string;
    supplier?: string;
    centerInfo?: string;
  };
  [key: string]: unknown;
}

interface UseNotificationsReturn {
  notifications: InboxNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Firestore 인박스 알림을 실시간으로 조회하는 커스텀 훅
 * 
 * @description
 * - 읽지 않은 알림만 조회 (read === false)
 * - 최대 10개까지 조회
 * - 실시간 업데이트 지원
 * - 중복 업데이트 방지 최적화
 */
export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 이전 알림 상태를 추적하여 불필요한 업데이트 방지
  const prevNotificationsRef = useRef<string>('');

  useEffect(() => {
    if (!user || !user.uid) {
      setIsLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { collection, query, where, orderBy, limit, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/shared/services/firebase/config');
        
        if (!db) {
          throw new Error('Firestore가 초기화되지 않았습니다.');
        }

        // 읽지 않은 알림만 조회
        const q = query(
          collection(db, `users/${user.uid}/inbox`),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as InboxNotification[];
            
            // 변경 감지: 간단한 해시 비교로 불필요한 업데이트 방지
            const currentHash = JSON.stringify(notifs.map(n => ({ id: n.id, read: n.read })));
            if (prevNotificationsRef.current === currentHash) {
              return; // 변경사항 없음
            }
            
            prevNotificationsRef.current = currentHash;
            
            // 상태 업데이트 최소화
            setNotifications(prev => {
              // 길이와 주요 필드만 비교
              if (prev.length === notifs.length && 
                  prev.every((p, i) => p.id === notifs[i]?.id && p.read === notifs[i]?.read)) {
                return prev; // 동일한 상태면 이전 배열 반환
              }
              return notifs;
            });
            
            setUnreadCount(notifs.length);
            setIsLoading(false);
          },
          (err) => {
            console.error('알림 조회 실패:', err);
            setError(err.message);
            setIsLoading(false);
          }
        );

        return () => {
          unsubscribe();
          prevNotificationsRef.current = '';
        };
      } catch (err) {
        console.error('알림 조회 실패:', err);
        setError(err instanceof Error ? err.message : '알림 조회 실패');
        setIsLoading(false);
      }
    };

    const cleanup = fetchNotifications();
    
    return () => {
      if (cleanup) {
        cleanup.then(unsubscribe => unsubscribe && unsubscribe());
      }
    };
  }, [user?.uid]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error
  };
};

