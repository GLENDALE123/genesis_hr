/**
 * 공통 댓글 관리 훅
 * 
 * @description
 * 모든 피처에서 재사용 가능한 댓글 CRUD 훅
 * CommentsService를 래핑하여 에러 처리 및 토스트 알림 제공
 */

import { toast } from 'sonner';
import { CommentsService, NewCommentData } from '@/shared/services/comments/commentsService';

/**
 * 댓글 관리 훅
 * 
 * @param collectionName - Firestore 컬렉션 이름
 * 
 * @example
 * // 생산관리부에서 사용
 * const comments = useComments('production-requests');
 * await comments.add(requestId, { text, user, uid });
 * 
 * // 품질관리에서 사용
 * const comments = useComments('quality-inspections');
 * await comments.add(inspectionId, { text, user, uid });
 */
export const useComments = (collectionName: string) => {
  /**
   * 댓글 추가
   */
  const addComment = async (documentId: string, commentData: NewCommentData) => {
    try {
      await CommentsService.addComment(collectionName, documentId, commentData);
      toast.success('댓글이 추가되었습니다.');
    } catch (err) {
      console.error('댓글 추가 실패:', err);
      toast.error('댓글 추가에 실패했습니다.');
      throw err;
    }
  };

  /**
   * 댓글 수정
   */
  const updateComment = async (
    documentId: string,
    commentId: string,
    newText: string
  ) => {
    try {
      await CommentsService.updateComment(collectionName, documentId, commentId, newText);
      toast.success('댓글이 수정되었습니다.');
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      toast.error('댓글 수정에 실패했습니다.');
      throw error;
    }
  };

  /**
   * 댓글 삭제
   */
  const deleteComment = async (documentId: string, commentId: string) => {
    try {
      await CommentsService.deleteComment(collectionName, documentId, commentId);
      toast.success('댓글이 삭제되었습니다.');
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      toast.error('댓글 삭제에 실패했습니다.');
      throw error;
    }
  };

  /**
   * 댓글 읽음 표시
   */
  const markAsRead = async (
    documentId: string,
    commentId: string,
    userId: string
  ) => {
    try {
      await CommentsService.markAsRead(collectionName, documentId, commentId, userId);
    } catch (error) {
      console.error('댓글 읽음 표시 실패:', error);
      // 읽음 표시는 조용히 실패 (토스트 표시 안 함)
    }
  };

  /**
   * 모든 댓글 읽음 표시
   */
  const markAllAsRead = async (documentId: string, userId: string) => {
    try {
      await CommentsService.markAllAsRead(collectionName, documentId, userId);
    } catch (error) {
      console.error('모든 댓글 읽음 표시 실패:', error);
      // 읽음 표시는 조용히 실패
    }
  };

  return {
    addComment,
    updateComment,
    deleteComment,
    markAsRead,
    markAllAsRead,
  };
};




