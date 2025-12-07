// 생산 요청 관리 커스텀 훅
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ProductionRequestService } from '../services/productionRequestService';
import {
  ProductionRequest,
  ProductionRequestStatus,
} from '../types';
import { CommentsService } from '@/shared/services/comments/commentsService';

// 간단한 모듈 레벨 캐시로 라우트 전환 시 초기 로딩 플리커를 줄임
let cachedRequests: ProductionRequest[] = [];
let hasCachedRequests = false;

export const useProductionRequests = () => {
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // 캐시가 있으면 즉시 표시하고 로딩 플래그를 건너뛴다
    if (hasCachedRequests) {
      setRequests(cachedRequests);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // Firebase 실시간 구독
    const unsubscribe = ProductionRequestService.subscribeToRequests(
      (data) => {
        if (!isMountedRef.current) return;
        setRequests(data);
        // 캐시 업데이트
        cachedRequests = data;
        hasCachedRequests = true;
        setIsLoading(false);
      },
      (err) => {
        if (!isMountedRef.current) return;
        setError(err);
        setIsLoading(false);
        toast.error('생산 요청 데이터를 불러오는 데 실패했습니다.');
      }
    );

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, []);

  const createRequest = async (
    requestData: Omit<ProductionRequest, 'id' | 'createdAt' | 'history'>
  ) => {
    try {
      const id = await ProductionRequestService.createRequest(requestData);
      toast.success('생산 요청이 등록되었습니다.');
      return id;
    } catch (err) {
      toast.error('생산 요청 등록에 실패했습니다.');
      throw err;
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    status: ProductionRequestStatus,
    userName: string,
    reason?: string
  ) => {
    try {
      await ProductionRequestService.updateRequestStatus(
        requestId,
        status,
        userName,
        reason
      );
      toast.success('상태가 업데이트되었습니다.');
    } catch (err) {
      toast.error('상태 업데이트에 실패했습니다.');
      throw err;
    }
  };

  const updateRequest = async (
    requestId: string,
    updates: Partial<Omit<ProductionRequest, 'id' | 'createdAt'>>
  ) => {
    try {
      await ProductionRequestService.updateRequest(requestId, updates);
      toast.success('요청이 수정되었습니다.');
    } catch (err) {
      toast.error('요청 수정에 실패했습니다.');
      throw err;
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      await ProductionRequestService.deleteRequest(requestId);
      toast.success('요청이 삭제되었습니다.');
    } catch (err) {
      toast.error('요청 삭제에 실패했습니다.');
      throw err;
    }
  };

  const addComment = async (
    requestId: string,
    comment: {
      text: string;
      user: string;
      uid: string;
      mentionedUserIds?: string[];
    }
  ) => {
    try {
      // ✅ 공통 CommentsService 직접 사용
      await CommentsService.addComment('production-requests', requestId, comment);
      toast.success('댓글이 추가되었습니다.');
    } catch (err) {
      toast.error('댓글 추가에 실패했습니다.');
      throw err;
    }
  };

  const editComment = async (
    requestId: string,
    commentId: string,
    newText: string
  ) => {
    try {
      // ✅ 공통 CommentsService 직접 사용
      await CommentsService.updateComment('production-requests', requestId, commentId, newText);
      toast.success('댓글이 수정되었습니다.');
    } catch (err) {
      toast.error('댓글 수정에 실패했습니다.');
      throw err;
    }
  };

  const deleteComment = async (
    requestId: string,
    commentId: string
  ) => {
    try {
      // ✅ 공통 CommentsService 직접 사용
      await CommentsService.deleteComment('production-requests', requestId, commentId);
      toast.success('댓글이 삭제되었습니다.');
    } catch (err) {
      toast.error('댓글 삭제에 실패했습니다.');
      throw err;
    }
  };

  return {
    requests,
    isLoading,
    error,
    createRequest,
    updateRequestStatus,
    updateRequest,
    deleteRequest,
    addComment,
    editComment,
    deleteComment,
  };
};

