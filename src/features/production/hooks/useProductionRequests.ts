// 생산 요청 관리 커스텀 훅
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  ProductionRequestService,
  ProductionRequest,
  ProductionRequestStatus,
} from '../services/productionRequestService';
import { CommentsService } from '@/shared/services/comments/commentsService';

export const useProductionRequests = () => {
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);

    // Firebase 실시간 구독
    const unsubscribe = ProductionRequestService.subscribeToRequests(
      (data) => {
        setRequests(data);
        setIsLoading(false);
      },
      (err) => {
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

