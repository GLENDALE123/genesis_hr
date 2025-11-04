import { useState, useEffect } from 'react';
import { subscribeToShortageRequests } from '../services/shortageService';
import { ShortageRequest } from '../types';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useShortageRequestsStore } from '../store/shortageRequestsStore';
import { waitForFirebaseInit } from '@/shared/services/firebase/config';
import { toast } from 'sonner';

export const useShortageRequests = () => {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  
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
            if (!isCancelled) {
              setRequests(newRequests);
              setLoading(false);
              setFetching(false);
            }
          },
          (error) => {
            if (!isCancelled) {
              console.error('❌ 부족분 요청 구독 에러:', error);
              toast.error('부족분 요청 로딩에 실패했습니다.');
              setError(error instanceof Error ? error : new Error('구독 실패'));
              setLoading(false);
              setFetching(false);
            }
          }
        );

        return unsubscribe;
      } catch (err) {
        console.error('❌ 실시간 구독 실패:', err);
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error('구독 실패'));
          setLoading(false);
          setFetching(false);
        }
        return undefined;
      }
    };

    const unsubscribePromise = initSubscription();

    // 클린업: 구독 해제 (Promise 처리 개선)
    return () => {
      isCancelled = true;
      // Promise가 완료되기를 기다리지 않고 즉시 처리 시도
      // 하지만 완료 후에도 정리되도록 보장
      let isUnsubscribed = false;
      const cleanupTimeout = setTimeout(() => {
        if (!isUnsubscribed) {
          console.warn('[useShortageRequests] 구독 해제 타임아웃 - 강제 정리');
        }
      }, 5000); // 5초 타임아웃
      
      unsubscribePromise
        .then(unsubscribe => {
          if (unsubscribe && typeof unsubscribe === 'function') {
            try {
              unsubscribe();
              isUnsubscribed = true;
            } catch (error) {
              console.error('[useShortageRequests] 구독 해제 실행 중 오류:', error);
            }
          }
          clearTimeout(cleanupTimeout);
        })
        .catch(error => {
          console.error('[useShortageRequests] 구독 해제 중 오류:', error);
          clearTimeout(cleanupTimeout);
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
