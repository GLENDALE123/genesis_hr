/**
 * 샘플 요청 데이터 관리 훅
 * usePackagingReports 패턴 참고
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SampleRequest, SampleFormData, SampleStatus } from '../types';
import { SampleService } from '../services';
import { waitForFirebaseInit, auth } from '@/shared/services/firebase/config';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useSampleRequestsStore } from '../store';
import { toast } from 'sonner';
import { getUserDisplayName } from '@/shared/utils/userUtils';

/**
 * 샘플 요청 데이터를 관리하는 커스텀 훅
 */
export const useSampleRequests = () => {
  const { user, userProfile } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  
  // 실시간 구독 관리용
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Zustand 스토어 사용
  const {
    requests,
    isLoading: loading,
    isFetching,
    error,
    getCachedRequests,
    setRequests: setCachedRequests,
    setLoading,
    setFetching,
    setError,
    clearCache
  } = useSampleRequestsStore();

  // 클라이언트 사이드에서만 실행
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 초기 마운트 시 실시간 구독 시작
  useEffect(() => {
    if (!mounted) return;

    let isCancelled = false;

    const initSubscription = async () => {
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
        const unsubscribe = SampleService.subscribeToSampleRequests((newRequests) => {
          if (!isCancelled) {
            setCachedRequests(newRequests);
            setLoading(false);
            setFetching(false);
          }
        });

        unsubscribeRef.current = unsubscribe;
      } catch (err) {
        console.error('❌ 실시간 구독 실패:', err);
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error('구독 실패'));
          setLoading(false);
          setFetching(false);
        }
      }
    };

    initSubscription();

    // 클린업: 구독 해제
    return () => {
      isCancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [mounted, getCachedRequests, setCachedRequests, setError, setFetching, setLoading]);

  /**
   * 새 샘플 요청 생성
   */
  const createRequest = useCallback(async (
    formData: SampleFormData,
    imageFiles: File[] = []
  ) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      throw new Error('User not authenticated');
    }

    try {
      // FirebaseAuth를 먼저 사용하여 사용자 정보 가져오기
      let displayName = '사용자';
      if (auth?.currentUser) {
        displayName = auth.currentUser.displayName || 
                     auth.currentUser.email?.split('@')[0] || 
                     getUserDisplayName(user, userProfile) || 
                     '사용자';
      } else {
        displayName = getUserDisplayName(user, userProfile);
      }
      
      const requestId = await SampleService.createSampleRequest(
        formData,
        { uid: user.uid, displayName, email: user.email },
        imageFiles
      );
      
      toast.success('샘플 요청이 생성되었습니다.');
      return requestId;
    } catch (error) {
      console.error('❌ 샘플 요청 생성 실패:', error);
      toast.error('샘플 요청 생성에 실패했습니다.');
      throw error;
    }
  }, [user, userProfile]);

  /**
   * 샘플 요청 수정
   */
  const updateRequest = useCallback(async (
    id: string,
    formData: SampleFormData
  ) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      throw new Error('User not authenticated');
    }

    try {
      // FirebaseAuth를 먼저 사용하여 사용자 정보 가져오기
      let displayName = '사용자';
      if (auth?.currentUser) {
        displayName = auth.currentUser.displayName || 
                     auth.currentUser.email?.split('@')[0] || 
                     getUserDisplayName(user, userProfile) || 
                     '사용자';
      } else {
        displayName = getUserDisplayName(user, userProfile);
      }
      
      await SampleService.updateSampleRequest(id, formData, { uid: user.uid, displayName, email: user.email });
      toast.success('샘플 요청이 수정되었습니다.');
    } catch (error) {
      console.error('❌ 샘플 요청 수정 실패:', error);
      toast.error('샘플 요청 수정에 실패했습니다.');
      throw error;
    }
  }, [user, userProfile]);

  /**
   * 샘플 요청 상태 변경
   */
  const updateStatus = useCallback(async (
    id: string,
    status: SampleStatus,
    reason?: string,
    workData?: SampleRequest['workData']
  ) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      throw new Error('User not authenticated');
    }

    try {
      // FirebaseAuth를 먼저 사용하여 사용자 정보 가져오기
      let displayName = '사용자';
      if (auth?.currentUser) {
        displayName = auth.currentUser.displayName || 
                     auth.currentUser.email?.split('@')[0] || 
                     getUserDisplayName(user, userProfile) || 
                     '사용자';
      } else {
        displayName = getUserDisplayName(user, userProfile);
      }
      
      await SampleService.updateSampleStatus(id, status, { uid: user.uid, displayName, email: user.email }, reason, workData);
      toast.success(`상태가 "${status}"로 변경되었습니다.`);
    } catch (error) {
      console.error('❌ 상태 변경 실패:', error);
      toast.error('상태 변경에 실패했습니다.');
      throw error;
    }
  }, [user, userProfile]);

  /**
   * 작업 데이터 수정
   */
  const updateWorkData = useCallback(async (
    id: string,
    workData: SampleRequest['workData']
  ) => {
    try {
      await SampleService.updateWorkData(id, workData);
      toast.success('작업 데이터가 저장되었습니다.');
    } catch (error) {
      console.error('❌ 작업 데이터 수정 실패:', error);
      toast.error('작업 데이터 저장에 실패했습니다.');
      throw error;
    }
  }, []);

  /**
   * 샘플 요청 삭제
   */
  const deleteRequest = useCallback(async (id: string) => {
    try {
      await SampleService.deleteSampleRequest(id);
      toast.success('샘플 요청이 삭제되었습니다.');
    } catch (error) {
      console.error('❌ 샘플 요청 삭제 실패:', error);
      toast.error('샘플 요청 삭제에 실패했습니다.');
      throw error;
    }
  }, []);

  /**
   * 참고 이미지 추가 업로드
   */
  const uploadImage = useCallback(async (id: string, file: File) => {
    try {
      const imageUrl = await SampleService.uploadSampleImage(id, file);
      toast.success('참고 이미지가 업로드되었습니다.');
      return imageUrl;
    } catch (error) {
      console.error('❌ 참고 이미지 업로드 실패:', error);
      toast.error('참고 이미지 업로드에 실패했습니다.');
      throw error;
    }
  }, []);

  /**
   * 작업 이미지 업로드
   */
  const uploadWorkImage = useCallback(async (id: string, file: File) => {
    try {
      const imageUrl = await SampleService.uploadWorkImage(id, file);
      toast.success('작업 이미지가 업로드되었습니다.');
      return imageUrl;
    } catch (error) {
      console.error('❌ 작업 이미지 업로드 실패:', error);
      toast.error('작업 이미지 업로드에 실패했습니다.');
      throw error;
    }
  }, []);

  /**
   * 특정 샘플 요청 조회
   */
  const getRequestById = useCallback((id: string): SampleRequest | undefined => {
    return requests.find(request => request.id === id);
  }, [requests]);

  return {
    requests,
    isLoading: loading,
    isFetching,
    error,
    createRequest,
    updateRequest,
    updateStatus,
    updateWorkData,
    deleteRequest,
    uploadImage,
    uploadWorkImage,
    getRequestById,
    clearCache
  };
};


