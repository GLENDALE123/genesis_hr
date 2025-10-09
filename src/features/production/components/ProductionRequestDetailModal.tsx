'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CommentsService } from '@/shared/services/comments/commentsService';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { CommentsSection } from '@/shared/components/common';
import {
  ProductionRequestStatus,
  ProductionRequestType,
  type ProductionRequest,
} from '../services/productionRequestService';

interface ProductionRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ProductionRequest | null;
  currentUserName?: string;
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

export const ProductionRequestDetailModal: React.FC<ProductionRequestDetailModalProps> = ({
  isOpen,
  onClose,
  request,
  currentUserName = '',
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
          // 읽지 않은 댓글들 찾기
          const unreadComments = (request.comments || []).filter(
            comment => comment.readBy && !comment.readBy.includes(currentUserUid)
          );

          // 각 읽지 않은 댓글을 읽음 처리
          for (const comment of unreadComments) {
            await CommentsService.markAsRead(
              'production-requests',
              request.id,
              comment.id,
              currentUserUid
            );
          }
        } catch (error) {
          console.error('댓글 읽음 처리 실패:', error);
        }
      };

      markCommentsAsRead();
    }
  }, [isOpen, request?.id, currentUserUid]);

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
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {request.productName} ({request.partName})
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {request.requestType}
                </p>
              </div>
              <span className={`px-4 py-2 text-lg font-bold rounded-full ${getStatusColorClass(request.status)}`}>
                {request.status}
              </span>
            </div>
          </DialogHeader>

          {/* 상세 정보 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                  {request.imageUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`첨부 이미지 ${index + 1}`}
                      className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 처리 이력 */}
            <div className="space-y-2">
              <Label>처리 이력</Label>
              <ul className="space-y-2 text-xs">
                {request.history.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <span className="font-semibold">{new Date(h.date).toLocaleString('ko-KR')}</span>
                    <span className={`px-2 py-0.5 rounded-full ${getStatusColorClass(h.status)}`}>
                      {h.status}
                    </span>
                    <span>by {h.user}</span>
                    {h.reason && <span className="text-muted-foreground">- {h.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>

            {/* 댓글 섹션 */}
            <CommentsSection
              comments={request.comments || []}
              onAddComment={handleAddComment}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              canComment={canManage}
              currentUserUid={currentUserUid}
              isAdmin={isAdmin}
            />
          </div>

          {/* 하단 액션 버튼 */}
          <div className="flex-shrink-0 flex flex-wrap gap-2 px-6 py-4 border-t bg-muted/30">
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
              <Button
                onClick={() => onStatusUpdate && onStatusUpdate(request.id, ProductionRequestStatus.Completed, '완료 처리됨')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                완료 처리
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                삭제
              </Button>
            )}
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
            '{request.productName}' 요청을 정말 삭제하시겠습니까?
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

