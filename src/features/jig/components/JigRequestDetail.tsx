'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Input } from '@/shared/components/ui/input';
import { JigRequest, JigStatus, UserProfile } from '../types';
import { STATUS_COLORS } from '../constants';
import { ImageLightbox } from '@/shared/components/common/ImageLightbox';
import { CommentsSection } from '@/shared/components/common/CommentsSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { ProcessingHistory } from '@/shared/components/common/ProcessingHistory';
import { Progress } from '@/shared/components/ui/progress';
import { CommentsService } from '@/shared/services/comments/commentsService';
import { Edit, Trash2, Check, X, Package, ArrowLeft } from 'lucide-react';

interface JigRequestDetailProps {
  isOpen: boolean;
  onClose: () => void;
  request: JigRequest | null;
  currentUserProfile?: UserProfile | null;
  onStatusUpdate?: (id: string, status: JigStatus, reason?: string) => void;
  onEdit?: (request: JigRequest) => void;
  onDelete?: (id: string) => void;
  onReceiveItems?: (id: string, quantity: number) => void;
  onAddComment?: (requestId: string, commentText: string, mentionedUserIds?: string[]) => void;
  onDeleteComment?: (requestId: string, commentId: string) => void;
  onEditComment?: (requestId: string, commentId: string, newText: string) => void;
}

export const JigRequestDetail: React.FC<JigRequestDetailProps> = ({
  isOpen,
  onClose,
  request,
  currentUserProfile,
  onStatusUpdate,
  onEdit,
  onDelete,
  onReceiveItems,
  onAddComment,
  onDeleteComment,
  onEditComment,
}) => {
  const [lightboxData, setLightboxData] = useState<{ images: string[], initialIndex: number } | null>(null);
  const [actionModal, setActionModal] = useState<{ open: boolean; status: JigStatus | null }>({ open: false, status: null });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<'receive' | 'return' | null>(null);
  const [processingQuantity, setProcessingQuantity] = useState('');
  const [actionReason, setActionReason] = useState('');
  
  const detailRef = useRef<HTMLDivElement>(null);
  
  // 모달이 열릴 때 읽지 않은 댓글 자동 읽음 처리
  useEffect(() => {
    const markCommentsAsRead = async () => {
      if (isOpen && request && currentUserProfile?.uid) {
        const currentUserUid = currentUserProfile.uid;
        
        // 읽지 않은 댓글들 찾기
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
          try {
            // 실제 읽음 처리 API 호출
            await CommentsService.markAsRead('jig-requests', request.id, comment.id, currentUserUid);
          } catch (error) {
            console.error(`❌ [지그요청] 댓글 읽음 처리 실패:`, comment.id, error);
          }
        }
      }
    };

    markCommentsAsRead();
  }, [isOpen, request, currentUserProfile?.uid]);
  
  
  if (!request) return null;

  const userRole = (currentUserProfile && currentUserProfile.role) || 'Member';
  const canManage = userRole === 'Admin' || userRole === 'Manager';
  const canComment = userRole === 'Admin' || userRole === 'Manager';

  const openLightbox = (images: string[], index: number) => {
    setLightboxData({ images, initialIndex: index });
  };

  const coreCost = request.coreCost ?? 0;
  const unitPrice = request.unitPrice ?? 0;
  let totalAmount = 0;

  if (request.status === JigStatus.InProgress || request.status === JigStatus.Receiving) {
    totalAmount = request.receivedQuantity * unitPrice;
  } else if (request.status === JigStatus.Completed) {
    totalAmount = (request.quantity * unitPrice) + coreCost;
  }

  const handleActionSubmit = (reason: string) => {
    if (actionModal.status && onStatusUpdate) {
      onStatusUpdate(request.id, actionModal.status, reason);
    }
    setActionModal({ open: false, status: null });
    setActionReason('');
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(request.id);
    }
    setIsDeleteModalOpen(false);
  };

  const handleCancelProcessing = () => {
    setProcessingAction(null);
    setProcessingQuantity('');
  };

  const handleConfirmProcessing = () => {
    const quantity = parseInt(processingQuantity, 10);

    if (isNaN(quantity) || quantity <= 0) {
      return;
    }

    if (processingAction === 'return' && quantity > request.receivedQuantity) {
      return;
    }

    const quantityChange = processingAction === 'receive' ? quantity : -quantity;
    if (onReceiveItems) {
      onReceiveItems(request.id, quantityChange);
    }

    handleCancelProcessing();
  };

  const isProcessable = [JigStatus.InProgress, JigStatus.Receiving, JigStatus.Completed].includes(request.status);

  // 헤더 컴포넌트
  const headerContent = (
    <DialogHeader>
      <DialogTitle className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-foreground">
            {request.itemName} ({request.partName})
          </span>
          <span className="text-sm text-muted-foreground mt-1">{request.requestType}</span>
        </div>
        <Badge
          className={`px-3 py-1 text-lg font-bold ${
            request.status === JigStatus.InProgress || request.status === JigStatus.Receiving ? 'animate-pulse' : ''
          }`}
          style={{
            backgroundColor: STATUS_COLORS[request.status],
            color: '#ffffff',
          }}
        >
          {request.status}
        </Badge>
      </DialogTitle>
    </DialogHeader>
  );

  // 푸터 컴포넌트
  const footerContent = (
    <DialogFooter className="flex flex-wrap gap-2 justify-center">
      {userRole === 'Admin' && request.status === JigStatus.Request && (
        <>
          <Button 
            onClick={() => onStatusUpdate?.(request.id, JigStatus.InProgress, '승인됨')} 
            className="bg-green-500 hover:bg-green-600"
          >
            <Check className="h-4 w-4 mr-2" />
            승인
          </Button>
          <Button 
            onClick={() => setActionModal({open: true, status: JigStatus.Hold})} 
            className="bg-yellow-500 hover:bg-yellow-600"
          >
            보류
          </Button>
          <Button 
            onClick={() => setActionModal({open: true, status: JigStatus.Rejected})} 
            className="bg-red-500 hover:bg-red-600"
          >
            반려
          </Button>
        </>
      )}
      
      {canManage && isProcessable && (
        <div className="w-full md:w-auto">
          {processingAction === null ? (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setProcessingAction('receive')} 
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Package className="h-4 w-4 mr-2" />
                입고 처리
              </Button>
              {request.receivedQuantity > 0 && (
                <Button 
                  onClick={() => setProcessingAction('return')} 
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  반출 처리
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted animate-in slide-in-from-top-2 duration-300">
              <Input 
                type="number" 
                value={processingQuantity}
                onChange={e => setProcessingQuantity(e.target.value)}
                placeholder={processingAction === 'receive' ? "입고 수량" : "반출 수량"}
                min="1"
                max={processingAction === 'return' ? request.receivedQuantity : undefined}
                className="w-28"
                autoFocus
              />
              <Button onClick={handleConfirmProcessing} size="sm" className="bg-green-500 hover:bg-green-600">
                확인
              </Button>
              <Button onClick={handleCancelProcessing} variant="outline" size="sm">
                취소
              </Button>
            </div>
          )}
        </div>
      )}

      
      {canManage && (
        <Button onClick={() => onEdit?.(request)} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          수정
        </Button>
      )}
      {userRole === 'Admin' && (
        <Button 
          onClick={() => setIsDeleteModalOpen(true)} 
          variant="destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </Button>
      )}
    </DialogFooter>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-6xl max-h-[95vh]"
          stickyHeader={headerContent}
          stickyFooter={footerContent}
        >
          <div ref={detailRef} className="space-y-6">
            {/* 기본 정보 및 처리 이력 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><strong>요청 ID:</strong> <span className="font-mono">{request.id}</span></div>
                  <div><strong>요청 유형:</strong> {request.requestType}</div>
                  <div><strong>지그번호:</strong> {request.itemNumber || 'N/A'}</div>
                  {typeof request.jigHandleLength === 'number' && (
                    <div><strong>지그손잡이길이:</strong> {request.jigHandleLength} mm</div>
                  )}
                  <div><strong>수량:</strong> {request.quantity.toLocaleString()}</div>
                  <div><strong>단가:</strong> {request.unitPrice ? `${request.unitPrice.toLocaleString()} 원` : ''}</div>
                  <div><strong>코어제작비:</strong> {request.coreCost ? `${request.coreCost.toLocaleString()} 원` : ''}</div>
                  <div><strong>총액:</strong> <strong className="text-foreground">{totalAmount > 0 ? `${totalAmount.toLocaleString()} 원` : ''}</strong></div>
                  <div><strong>요청자:</strong> {request.requester}</div>
                  <div><strong>수신처:</strong> {request.destination}</div>
                  <div><strong>완료 요청일:</strong> {request.deliveryDate}</div>
                  <div><strong>요청 일시:</strong> {new Date(request.requestDate).toLocaleString('ko-KR')}</div>
                  <div className="col-span-1 sm:col-span-2">
                    <strong>입고 현황:</strong> {request.receivedQuantity.toLocaleString()} / {request.quantity.toLocaleString()}
                    <Progress 
                      value={(request.receivedQuantity / request.quantity) * 100} 
                      className="mt-1 h-2.5"
                    />
                  </div>
                </div>

                {/* 비고 */}
                {request.remarks && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-sm mb-2">비고</h4>
                      <p className="text-muted-foreground whitespace-pre-wrap text-sm">{request.remarks}</p>
                    </div>
                  </>
                )}

                {/* 첨부 이미지 */}
                {request.imageUrls && request.imageUrls.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-sm mb-3">첨부 이미지 ({request.imageUrls.length}개)</h4>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                        {request.imageUrls.map((url, index) => (
                          <img 
                            key={index} 
                            src={url} 
                            alt=""
                            aria-label={`첨부 이미지 ${index + 1}`}
                            width={120}
                            height={96}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-24 object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                            onClick={() => openLightbox(request.imageUrls || [], index)}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 처리 이력 */}
                {request.history && request.history.length > 0 && (
                  <>
                    <Separator />
                    <ProcessingHistory 
                      history={request.history} 
                      statusColorMap={STATUS_COLORS}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* 구분선 */}
            <Separator className="my-4" />
            
            {/* 댓글 섹션 - 동적 로딩 */}
            <CommentsSection 
              comments={(request.comments || []).map(comment => {
                // HS-jig와 HS-Next 간의 댓글 데이터 호환성 처리
                const userField = comment.user || comment.userName || '알 수 없음';
                
                // 날짜 필드 처리 (HS-jig: date, HS-Next: timestamp, Firestore: createdAt)
                let timestampField = comment.timestamp;
                if (!timestampField && comment.date) {
                  // HS-jig의 date 필드 사용
                  timestampField = comment.date;
                } else if (!timestampField && comment.createdAt) {
                  // Firestore의 createdAt 필드 사용
                  if (typeof comment.createdAt === 'string') {
                    timestampField = comment.createdAt;
                  } else if (comment.createdAt && typeof comment.createdAt === 'object' && 'seconds' in comment.createdAt) {
                    timestampField = new Date((comment.createdAt as { seconds: number }).seconds * 1000).toISOString();
                  }
                }
                
                if (!timestampField) {
                  timestampField = new Date().toISOString();
                }
                
                return {
                  ...comment,
                  user: userField,
                  timestamp: timestampField,
                };
              })} 
              onAddComment={(text, mentionedUserIds) => onAddComment?.(request.id, text, mentionedUserIds)} 
              onDeleteComment={(commentId) => onDeleteComment?.(request.id, commentId)}
              onEditComment={(commentId, newText) => onEditComment?.(request.id, commentId, newText)}
              canComment={canComment}
              currentUserUid={currentUserProfile?.uid || ''}
              isAdmin={userRole === 'Admin'}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 이미지 라이트박스 */}
      {lightboxData && (
        <ImageLightbox 
          images={lightboxData.images} 
          initialIndex={lightboxData.initialIndex} 
          open={!!lightboxData}
          onClose={() => setLightboxData(null)} 
        />
      )}

      {/* 액션 모달 */}
      {actionModal.open && (
        <Dialog open={actionModal.open} onOpenChange={() => setActionModal({open: false, status: null})}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionModal.status === JigStatus.Hold ? '보류 사유' : '반려 사유'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="사유를 입력하세요"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActionModal({open: false, status: null})}>
                  취소
                </Button>
                <Button onClick={() => handleActionSubmit(actionReason)}>
                  확인
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 삭제 확인 모달 */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>삭제 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              &apos;{request.itemName} ({request.partName})&apos; 요청을 정말로 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                삭제
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};


