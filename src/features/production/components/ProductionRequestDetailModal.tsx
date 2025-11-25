import React, { useState, useEffect, lazy, Suspense } from 'react';
import { CommentsService } from '@/shared/services/comments/commentsService';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { ProcessingHistory } from '@/shared/components/common/ProcessingHistory';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';

// 무거운 컴포넌트들을 동적 임포트로 분할
const CommentsSection = lazy(() => import('@/shared/components/common/CommentsSection'));

import {
  ProductionRequestStatus,
  type ProductionRequest,
} from '../services/productionRequestService';

interface ProductionRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ProductionRequest | null;
  currentUserUid?: string;
  isAdmin?: boolean;
  isManager?: boolean;
  onStatusUpdate?: (id: string, status: ProductionRequestStatus, reason?: string) => void;
  onDelete?: (id: string) => void;
  onAddComment?: (id: string, text: string, mentionedUserIds?: string[]) => void;
  onEditComment?: (id: string, commentId: string, newText: string) => void;
  onDeleteComment?: (id: string, commentId: string) => void;
}

const DetailItem: React.FC<{ label: string; value: string | number | React.ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-base text-foreground">{value}</dd>
  </div>
);

const getStatusColorClass = (status: ProductionRequestStatus): string => {
  const statusMap = {
    [ProductionRequestStatus.Requested]: 'bg-[hsl(var(--status-requested))] text-[hsl(var(--status-requested-foreground))]',
    [ProductionRequestStatus.InProgress]: 'bg-[hsl(var(--status-inprogress))] text-[hsl(var(--status-inprogress-foreground))]',
    [ProductionRequestStatus.Hold]: 'bg-[hsl(var(--status-hold))] text-[hsl(var(--status-hold-foreground))]',
    [ProductionRequestStatus.Completed]: 'bg-[hsl(var(--status-completed))] text-[hsl(var(--status-completed-foreground))]',
    [ProductionRequestStatus.Rejected]: 'bg-[hsl(var(--status-rejected))] text-[hsl(var(--status-rejected-foreground))]',
  };
  return statusMap[status] || '';
};

// Status color map for ProcessingHistory component
const PRODUCTION_STATUS_COLORS = {
  [ProductionRequestStatus.Requested]: 'bg-blue-100 text-blue-800',
  [ProductionRequestStatus.InProgress]: 'bg-yellow-100 text-yellow-800',
  [ProductionRequestStatus.Hold]: 'bg-purple-100 text-purple-800',
  [ProductionRequestStatus.Completed]: 'bg-green-100 text-green-800',
  [ProductionRequestStatus.Rejected]: 'bg-red-100 text-red-800',
};

const ProductionRequestDetailModalComponent: React.FC<ProductionRequestDetailModalProps> = ({
  isOpen,
  onClose,
  request,
  currentUserUid = '',
  isAdmin = false,
  isManager = false,
  onStatusUpdate,
  onDelete,
  onAddComment,
  onEditComment,
  onDeleteComment,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionModalState, setActionModalState] = useState<{
    open: boolean;
    status: ProductionRequestStatus.Hold | ProductionRequestStatus.Rejected | null;
    reason: string;
  }>({ open: false, status: null, reason: '' });
  const canManage = isAdmin || isManager;

  // 모달이 열릴 때 읽지 않은 댓글 읽음 처리
  useEffect(() => {
    if (isOpen && request && currentUserUid && request.comments && request.comments.length > 0) {
      const markCommentsAsRead = async () => {
        try {
          // 읽지 않은 댓글들 찾기 (hasUnreadComments와 동일한 로직)
          const unreadComments = (request.comments || []).filter(comment => {
            // readBy 배열이 없으면 빈 배열로 간주
            const readBy = comment.readBy || [];
            
            // 본인이 작성한 댓글은 읽은 것으로 간주
            if (comment.uid === currentUserUid) return false;
            
            // readBy 배열에 currentUserUid가 없으면 읽지 않은 댓글
            return !readBy.includes(currentUserUid);
          });

          // 각 읽지 않은 댓글을 읽음 처리
          for (const comment of unreadComments) {
            await CommentsService.markAsRead(
              'production-requests',
              request.id,
              comment.id,
              currentUserUid
            );
          }

          if (unreadComments.length > 0) {
            // 읽지 않은 댓글이 있을 때 처리 로직 (필요 시 추가)
          }
        } catch (error) {
          console.error('댓글 읽음 처리 실패:', error);
        }
      };

      markCommentsAsRead();
    }
  }, [isOpen, request, currentUserUid]);

  if (!request) return null;

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(request.id);
      setIsDeleteModalOpen(false);
      onClose();
    }
  };

  const handleActionSubmit = () => {
    if (actionModalState.status && onStatusUpdate) {
      onStatusUpdate(request.id, actionModalState.status, actionModalState.reason);
      setActionModalState({ open: false, status: null, reason: '' });
    }
  };

  const handleAddComment = (text: string, mentionedUserIds?: string[]) => {
    if (onAddComment) {
      onAddComment(request.id, text, mentionedUserIds);
    }
  };

  const handleEditComment = (commentId: string, newText: string) => {
    if (onEditComment) {
      onEditComment(request.id, commentId, newText);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (onDeleteComment) {
      onDeleteComment(request.id, commentId);
    }
  };

  const getActionModalTitle = () => {
    if (!actionModalState.status) return '';
    const titles = {
      [ProductionRequestStatus.Hold]: '보류 사유',
      [ProductionRequestStatus.Rejected]: '반려 사유',
    };
    return titles[actionModalState.status] || '';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] p-0"
          stickyHeader={
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl font-bold">
                  {request.productName} ({request.partName})
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {request.requestType}
                </p>
              </div>
              <span className={`px-3 py-1 text-sm font-bold rounded-full whitespace-nowrap ${getStatusColorClass(request.status)}`}>
                {request.status}
              </span>
            </div>
          }
          stickyFooter={
            <div className="flex flex-wrap gap-2">
              {canManage && request.status === ProductionRequestStatus.Requested && (
                <>
                  <Button
                    onClick={() => onStatusUpdate && onStatusUpdate(request.id, ProductionRequestStatus.InProgress, '접수됨')}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    접수
                  </Button>
                  <Button
                    onClick={() => setActionModalState({ open: true, status: ProductionRequestStatus.Hold, reason: '' })}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    보류
                  </Button>
                  <Button
                    onClick={() => setActionModalState({ open: true, status: ProductionRequestStatus.Rejected, reason: '' })}
                    variant="destructive"
                  >
                    반려
                  </Button>
                </>
              )}
              {canManage && request.status === ProductionRequestStatus.InProgress && (
                <>
                  <Button
                    onClick={() => setActionModalState({ open: true, status: ProductionRequestStatus.Hold, reason: '' })}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    보류
                  </Button>
                  <Button
                    onClick={() => onStatusUpdate && onStatusUpdate(request.id, ProductionRequestStatus.Completed, '완료 처리됨')}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    완료 처리
                  </Button>
                </>
              )}
              {canManage && request.status === ProductionRequestStatus.Hold && (
                <Button
                  onClick={() => onStatusUpdate && onStatusUpdate(request.id, ProductionRequestStatus.InProgress, '보류에서 진행중으로 변경됨')}
                  className="bg-green-500 hover:bg-green-600"
                >
                  진행중으로 변경
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="destructive"
                  className="ml-auto"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  삭제
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-6">
            {/* 기본 정보 */}
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
              <DetailItem label="요청 ID" value={<span className="font-mono text-sm">{request.id}</span>} />
              <DetailItem label="발주번호" value={request.orderNumber} />
              <DetailItem label="요청일" value={new Date(request.createdAt).toLocaleString('ko-KR')} />
              <DetailItem label="요청자" value={request.author.displayName} />
              <DetailItem label="발주처" value={request.supplier} />
              <DetailItem label="요청 수량" value={request.quantity.toLocaleString()} />
            </dl>

            {/* 요청 내용 */}
            <div className="space-y-1.5">
              <Label>요청 내용</Label>
              <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                {request.content}
              </div>
            </div>

            {/* 첨부 이미지 */}
            {request.imageUrls && request.imageUrls.length > 0 && (
              <div className="space-y-1.5">
                <Label>첨부 이미지</Label>
                <ImageGalleryGrid
                  images={request.imageUrls}
                  gridClassName="grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
                  imageClassName="h-32"
                  useThumbnails={true}
                  enableLazyLoading={true}
                />
              </div>
            )}

            {/* 처리 이력 */}
            <ProcessingHistory 
              history={request.history} 
              statusColorMap={PRODUCTION_STATUS_COLORS}
              className="space-y-2"
            />

            {/* 댓글 섹션 - 동적 로딩 */}
            <Suspense fallback={<div className="p-4 text-center text-muted-foreground">댓글 로딩 중...</div>}>
              <CommentsSection
                comments={request.comments || []}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                canComment={canManage}
                currentUserUid={currentUserUid}
                isAdmin={isAdmin}
              />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 모달 */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>요청 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &apos;{request.productName}&apos; 요청을 정말 삭제하시겠습니까?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 보류/반려 사유 입력 모달 */}
      <Dialog open={actionModalState.open} onOpenChange={() => setActionModalState({ open: false, status: null, reason: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionModalTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={actionModalState.reason}
              onChange={(e) => setActionModalState(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="사유를 입력하세요..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setActionModalState({ open: false, status: null, reason: '' })}
              >
                취소
              </Button>
              <Button onClick={handleActionSubmit} disabled={!actionModalState.reason.trim()}>
                확인
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// React.memo로 최적화하여 불필요한 리렌더링 방지
export const ProductionRequestDetailModal = React.memo(ProductionRequestDetailModalComponent);

