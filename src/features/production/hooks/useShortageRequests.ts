import { useState, useEffect, useRef } from 'react';
import { subscribeToShortageRequests } from '../services/shortageService';
import { ShortageRequest } from '../types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useShortageRequestsStore } from '../store/shortageRequestsStore';
import { waitForFirebaseInit } from '@/shared/services/firebase/config';
import { toast } from 'sonner';

export const useShortageRequests = () => {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Zustand 스토어 사용
  const {
    requests,
    isLoading,
    isFetching,
    error,
    getCachedRequests,
    setRequests,
    setLoading,
    setFetching,
    setError,
    updateRequest,
    deleteRequest,
  } = useShortageRequestsStore();

  // 클라이언트 사이드에서만 실행
  useEffect(() => {
    setMounted(true);
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // 초기 마운트 시 실시간 구독 시작
  useEffect(() => {
    if (!mounted || !user) return;

    let isCancelled = false;

    const initSubscription = async (): Promise<(() => void) | undefined> => {
      // 로딩 시작
      setLoading(true);
      setError(null);

      // 캐시된 데이터 먼저 표시
      const cachedData = getCachedRequests();
      if (cachedData) {
        setLoading(false);
        setFetching(true);
      }

      // Firebase 초기화 대기
      const isFirebaseReady = await waitForFirebaseInit();
      
      if (isCancelled) return;

      if (!isFirebaseReady) {
        console.error('❌ Firebase 초기화 실패');
        setError(new Error('Firebase 초기화에 실패했습니다.'));
        setLoading(false);
        setFetching(false);
        return;
      }
      try {
        // 실시간 구독 시작
        const unsubscribe = subscribeToShortageRequests(
          (newRequests) => {
            if (!isMountedRef.current || isCancelled) return;
            setRequests(newRequests);
            setLoading(false);
            setFetching(false);
          },
          (error) => {
            if (!isMountedRef.current || isCancelled) return;
            console.error('❌ 부족분 요청 구독 에러:', error);
            toast.error('부족분 요청 로딩에 실패했습니다.');
            setError(error instanceof Error ? error : new Error('구독 실패'));
            setLoading(false);
            setFetching(false);
          }
        );

        unsubscribeRef.current = unsubscribe;
        return unsubscribe;
      } catch (err) {
        console.error('❌ 실시간 구독 실패:', err);
        if (!isMountedRef.current || isCancelled) return undefined;
        setError(err instanceof Error ? err : new Error('구독 실패'));
        setLoading(false);
        setFetching(false);
        return undefined;
      }
    };

    const unsubscribePromise = initSubscription();

    // 클린업: 구독 해제
    return () => {
      isCancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Promise 기반 정리도 시도
      unsubscribePromise
        .then(unsubscribe => {
          if (unsubscribe && typeof unsubscribe === 'function' && unsubscribe !== unsubscribeRef.current) {
            try {
              unsubscribe();
            } catch (error) {
              console.error('[useShortageRequests] 구독 해제 실행 중 오류:', error);
            }
          }
        })
        .catch(error => {
          console.error('[useShortageRequests] 구독 해제 중 오류:', error);
        });
    };
  }, [mounted, user, getCachedRequests, setRequests, setError, setFetching, setLoading]);

  return {
    requests,
    isLoading,
    isFetching,
    error,
    updateCachedRequest: updateRequest,
    deleteCachedRequest: deleteRequest,
    fetchRequests: async () => {
      // 실시간 구독이 자동으로 처리하므로 빈 함수
    }
  };
};
