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
    createRequest,
    updateRequest,
    deleteRequest,
    addCommentToRequest,
    updateRequestStatus,
  } = useJigRequestStore();

  // 컴포넌트 마운트 시 데이터 조회
  useEffect(() => {
    fetchRequests();
  }, []);

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