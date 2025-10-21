'use client';

/**
 * 지그 요청 목록 조회 및 필터링 훅
 */

import { useEffect } from 'react';
import { useJigRequestStore } from '../store/jigRequestStore';

export const useJigRequests = () => {
  const {
    requests,
    isLoading,
    error,
    fetchRequests,
    subscribeToRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    addCommentToRequest,
    updateRequestStatus,
  } = useJigRequestStore();

  // 컴포넌트 마운트 시 실시간 구독 시작
  useEffect(() => {
    const unsubscribe = subscribeToRequests();
    
    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, [subscribeToRequests]);

  return {
    requests,
    isLoading,
    error,
    refetch: fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    addCommentToRequest,
    updateRequestStatus,
  };
};