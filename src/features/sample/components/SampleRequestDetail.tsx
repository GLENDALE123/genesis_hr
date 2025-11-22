/**
 * 샘플 요청 상세 보기 컴포넌트
 * HS-Jig SampleRequestDetail 참고, Shadcn Dialog + Carousel 사용
 */


import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Separator } from '@/shared/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';

// 무거운 컴포넌트들을 동적 임포트로 분할 (Vite에서는 React.lazy 사용)
const DynamicCommentsSection = lazy(() => import('@/shared/components/common/CommentsSection'));
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import { useComments } from '@/shared/hooks/useComments';
import { CommentsService } from '@/shared/services/comments/commentsService';
import { useImageUpload } from '@/shared/hooks';
import { Edit, Trash2, Save, Upload, ChevronDown, ChevronUp, Camera, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { SampleRequest, SampleStatus } from '../types';
import { SAMPLE_STATUS_COLORS, SAMPLE_REQUESTS_COLLECTION } from '../constants';
import { ProcessingHistory } from '@/shared/components/common/ProcessingHistory';
import { useAuthStore } from '@/features/auth/store/authStore';

interface SampleRequestDetailProps {
  open: boolean;
  request: SampleRequest | null;
  onClose: () => void;
  onUpdateStatus: (
    id: string,
    status: SampleStatus,
    reason?: string,
    workData?: SampleRequest['workData']
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (request: SampleRequest) => void;
  onUpdateWorkData: (id: string, workData: SampleRequest['workData']) => Promise<void>;
  onUploadWorkImage: (id: string, file: File) => Promise<string>;
  currentUserUid?: string;
  isAdmin?: boolean;
}

export const SampleRequestDetail: React.FC<SampleRequestDetailProps> = ({
  open,
  request,
  onClose,
  onUpdateStatus,
  onDelete,
  onEdit,
  onUpdateWorkData,
  onUploadWorkImage,
  currentUserUid = '',
  isAdmin = false,
}) => {
  // 이미지 업로드 훅 사용
  const imageUploadHook = useImageUpload();
  
  const [workData, setWorkData] = useState<NonNullable<SampleRequest['workData']>>(
    (request && request.workData) || {}
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [changingStatus, setChangingStatus] = useState<SampleStatus | null>(null);
  const [uploadingWorkImage, setUploadingWorkImage] = useState(false);
  const workImageInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // 실시간 업데이트된 request
  const [currentRequest, setCurrentRequest] = useState<SampleRequest | null>(request);
  const unsubscribeRef = React.useRef<(() => void) | null>(null);

  // 댓글 훅
  const comments = useComments(SAMPLE_REQUESTS_COLLECTION);

  // 모달이 열릴 때 실시간 구독 시작
  useEffect(() => {
    if (!open || !request?.id) return;

    const initRealtimeSubscription = async () => {
      const { SampleService } = await import('../services');
      
      // 해당 request의 실시간 구독 시작
      const unsubscribe = SampleService.subscribeToSampleRequests((requests) => {
        const updated = requests.find(r => r.id === request.id);
        if (updated) {
          setCurrentRequest(updated);
          // workData도 동기화
          setWorkData(updated.workData || {});
        }
      });

      unsubscribeRef.current = unsubscribe;
    };

    initRealtimeSubscription();

    // 클린업
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [open, request?.id]);

  // request prop이 변경되면 currentRequest도 업데이트
  useEffect(() => {
    setCurrentRequest(request);
    setWorkData(request?.workData || {});
  }, [request]);

  // 모달이 열릴 때 읽지 않은 댓글 자동 읽음 처리
  useEffect(() => {
    if (open && currentRequest && currentUserUid && currentRequest.comments && currentRequest.comments.length > 0) {
      const markCommentsAsRead = async () => {
        try {
          // 읽지 않은 댓글들 찾기 (hasUnreadComments와 동일한 로직)
          const unreadComments = (currentRequest.comments || []).filter(comment => {
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
              SAMPLE_REQUESTS_COLLECTION,
              currentRequest.id,
              comment.id,
              currentUserUid
            );
            
          }

          if (unreadComments.length > 0) {
          } else {
          }
        } catch (error) {
          console.error('❌ [샘플요청] 댓글 읽음 처리 실패:', error);
        }
      };

      markCommentsAsRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, (currentRequest && currentRequest.id), currentUserUid]);

  const canManage = isAdmin;

  // 작업 정보가 비어있는지 확인하는 함수
  const isWorkDataEmpty = () => {
    const workData = currentRequest?.workData;
    if (!workData) return true;
    
    return !workData.undercoat?.conditions && 
           !workData.undercoat?.remarks &&
           !workData.midcoat?.conditions && 
           !workData.midcoat?.remarks &&
           !workData.topcoat?.conditions && 
           !workData.topcoat?.remarks;
  };

  // 작업 이미지가 있는지 확인
  const hasWorkImages = currentRequest?.workImageUrls && currentRequest.workImageUrls.length > 0;

  // 작업 정보가 비어있으면 자동으로 수정 모드 시작
  const [isEditingWorkData, setIsEditingWorkData] = useState(() => isWorkDataEmpty() && !hasWorkImages);
  
  // 작업 데이터는 기본적으로 펼쳐진 상태
  const [isWorkDataOpen, setIsWorkDataOpen] = useState(true);

  if (!currentRequest) return null;

  // 작업 데이터 변경
  const handleWorkDataChange = (
    coat: 'undercoat' | 'midcoat' | 'topcoat',
    field: 'conditions' | 'remarks',
    value: string
  ) => {
    setWorkData((prev) => ({
      ...prev,
      [coat]: {
        ...(prev[coat] || {}),
        [field]: value,
      },
    }));
  };

  // 작업 데이터 저장
  const handleSaveWorkData = async () => {
    if (!currentRequest) return;
    await onUpdateWorkData(currentRequest.id, workData);
  };

  // 상태 변경
  const handleStatusChange = async (newStatus: SampleStatus) => {
    if (!currentRequest) return;
    if (newStatus === SampleStatus.OnHold || newStatus === SampleStatus.Rejected) {
      setChangingStatus(newStatus);
      return;
    }

    await onUpdateStatus(currentRequest.id, newStatus);
  };

  // 보류/반려 확인
  const handleConfirmStatusChange = async () => {
    if (!changingStatus || !currentRequest) return;
    
    await onUpdateStatus(currentRequest.id, changingStatus, statusChangeReason, workData);
    setChangingStatus(null);
    setStatusChangeReason('');
  };

  // 삭제 확인
  const handleConfirmDelete = async () => {
    if (!currentRequest) return;
    await onDelete(currentRequest.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  // 댓글 추가
  const handleAddComment = async (text: string) => {
    if (!currentRequest) return;
    const { user: authUser } = useAuthStore.getState();
    const displayName = authUser?.displayName || authUser?.email || currentUserUid;
    
    await comments.addComment(currentRequest.id, {
      text,
      user: displayName, // 실제 사용자 이름
      uid: currentUserUid,
    });
  };

  // 파일 선택 핸들러
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      try {
        await imageUploadHook.handleFileSelect(files);
      } catch (error) {
        console.error('파일 선택 처리 실패:', error);
      }
    }
    
    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (e.target) {
      e.target.value = '';
    }
  };

  // 작업 이미지 업로드 (기존 함수 유지 - 단일 파일 업로드용)
  const handleWorkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentRequest) return;
    
    setUploadingWorkImage(true);
    try {
      const file = e.target.files[0];
      await onUploadWorkImage(currentRequest.id, file);
    } catch (error) {
      console.error('작업 이미지 업로드 실패:', error);
    } finally {
      setUploadingWorkImage(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // 작업 데이터 수정 모드 토글
  const handleToggleEditMode = () => {
    if (isEditingWorkData) {
      // 수정 모드 종료 시 원본 데이터로 복원
      setWorkData((currentRequest && currentRequest.workData) || {});
    }
    setIsEditingWorkData(!isEditingWorkData);
  };

  // 작업 데이터 저장
  const handleSaveWorkDataClick = async () => {
    await handleSaveWorkData();
    setIsEditingWorkData(false);
  };

  const DetailItem: React.FC<{ label: string; value: string | number | React.ReactNode }> = ({ label, value }) => (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base text-foreground">{value}</dd>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-5xl max-h-[90vh] p-0"
        stickyHeader={
          <div className="flex justify-between items-start">
            <DialogTitle className="text-xl font-bold">
              {currentRequest.productName} ({currentRequest.clientName})
            </DialogTitle>
            <Badge className={`px-4 py-2 text-base font-bold rounded-full ${SAMPLE_STATUS_COLORS[currentRequest.status]}`}>
              {currentRequest.status}
            </Badge>
          </div>
        }
        stickyFooter={
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2">
              {canManage && (
                <>
                  <Button variant="outline" onClick={() => onEdit(currentRequest)}>
                    <Edit className="h-4 w-4 mr-1" />
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    삭제
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-2 ml-auto">
              {currentRequest.status === SampleStatus.Received && (
                <Button onClick={() => handleStatusChange(SampleStatus.InProgress)}>
                  진행중으로 변경
                </Button>
              )}
              {currentRequest.status === SampleStatus.InProgress && (
                <>
                  <Button onClick={() => handleStatusChange(SampleStatus.Completed)}>
                    완료
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange(SampleStatus.OnHold)}
                  >
                    보류
                  </Button>
                </>
              )}
              {currentRequest.status === SampleStatus.OnHold && (
                <Button onClick={() => handleStatusChange(SampleStatus.InProgress)}>
                  진행중으로 재개
                </Button>
              )}
              {(currentRequest.status === SampleStatus.Received ||
                currentRequest.status === SampleStatus.InProgress) && (
                <Button
                  variant="destructive"
                  onClick={() => handleStatusChange(SampleStatus.Rejected)}
                >
                  반려
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* 상세 정보 */}
        <div className="space-y-6">
          {/* Card 1: 요청사항 */}
          <Card>
            <CardHeader>
              <CardTitle>요청사항</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 기본 정보 */}
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                <DetailItem label="요청일" value={currentRequest.requestDate} />
                <DetailItem label="납기요청일" value={currentRequest.dueDate} />
                <DetailItem label="요청담당자" value={currentRequest.requesterName} />
                <DetailItem label="연락처" value={currentRequest.contact} />
              </dl>

              <Separator />

              {/* 요청 품목 */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">요청 품목</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>부속명</TableHead>
                      <TableHead>색상(사양)</TableHead>
                      <TableHead>코팅/증착 방식</TableHead>
                      <TableHead>후가공</TableHead>
                      <TableHead className="text-right">수량</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRequest?.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.partName}</TableCell>
                        <TableCell>{item.colorSpec}</TableCell>
                        <TableCell>{item.coatingMethod}</TableCell>
                        <TableCell>{item.postProcessing.join(', ') || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* 비고 */}
              <div className="space-y-1.5">
                <Label className="text-base font-semibold">비고</Label>
                <div className="p-3 bg-muted rounded-md whitespace-pre-wrap text-sm">
                  {currentRequest?.remarks || '-'}
                </div>
              </div>

              {/* 참고 이미지 */}
              {currentRequest?.imageUrls && currentRequest.imageUrls.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">참고 이미지 ({currentRequest.imageUrls.length})</Label>
                  <ImageGalleryGrid images={currentRequest.imageUrls} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: 작업 정보 (진행중/완료/보류 상태일 때만 표시) */}
          {(currentRequest && (currentRequest.status === SampleStatus.InProgress || 
            currentRequest.status === SampleStatus.Completed ||
            currentRequest.status === SampleStatus.OnHold)) && (
            <Card>
              <CardHeader>
                <CardTitle>작업 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 작업 데이터 */}
                <Collapsible open={isWorkDataOpen} onOpenChange={setIsWorkDataOpen}>
                  <div className="space-y-2">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer group">
                        <Label className="text-base font-semibold cursor-pointer">작업 데이터</Label>
                        {isWorkDataOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-4 pt-2">
                        {['undercoat', 'midcoat', 'topcoat'].map((coat) => {
                          const coatKey = coat as 'undercoat' | 'midcoat' | 'topcoat';
                          const coatData = workData[coatKey] || {};
                          
                          return (
                            <div key={coat}>
                              <h5 className="font-semibold mb-2">
                                {coat === 'undercoat' ? '하도' : coat === 'midcoat' ? '중도' : '상도'}
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs">작업조건</Label>
                                  <Textarea
                                    value={coatData.conditions || ''}
                                    onChange={(e) =>
                                      handleWorkDataChange(coatKey, 'conditions', e.target.value)
                                    }
                                    disabled={!isEditingWorkData}
                                    rows={3}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">특이사항</Label>
                                  <Textarea
                                    value={coatData.remarks || ''}
                                    onChange={(e) =>
                                      handleWorkDataChange(coatKey, 'remarks', e.target.value)
                                    }
                                    disabled={!isEditingWorkData}
                                    rows={3}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* 작업 이미지 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      작업 이미지 {currentRequest?.workImageUrls ? `(${currentRequest.workImageUrls.length})` : ''}
                    </Label>
                    {canManage && currentRequest?.status === SampleStatus.InProgress && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => workImageInputRef.current && workImageInputRef.current.click()} 
                          size="sm" 
                          variant="outline"
                          disabled={uploadingWorkImage}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          파일 선택
                        </Button>
                        <Button 
                          onClick={() => cameraInputRef.current && cameraInputRef.current.click()} 
                          size="sm" 
                          variant="outline"
                          disabled={uploadingWorkImage}
                          className="gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          사진 촬영
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* 숨겨진 파일 입력 */}
                  <input
                    ref={workImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWorkImageUpload}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleWorkImageUpload}
                    className="hidden"
                  />
                  
                  {/* 기존 작업 이미지 */}
                  {currentRequest?.workImageUrls && currentRequest.workImageUrls.length > 0 ? (
                    <ImageGalleryGrid images={currentRequest.workImageUrls} />
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                      작업 이미지가 없습니다.
                    </div>
                  )}
                  
                  {/* 새로 추가된 이미지 미리보기 */}
                  {imageUploadHook.uploadingImages.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">새로 추가된 이미지</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {imageUploadHook.uploadingImages.map((item, index) => (
                          <div key={index} className="relative">
                            {item.preview ? (
                              <img
                                src={item.preview}
                                alt={`새 이미지 ${index + 1}`}
                                className="w-full h-20 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-full h-20 rounded border bg-muted animate-pulse" aria-hidden="true" />
                            )}
                            <button
                              type="button"
                              onClick={() => imageUploadHook.removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 하단 액션 버튼 */}
                {canManage && (
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    {!isEditingWorkData ? (
                      // 작업 정보가 있으면 수정 버튼
                      <Button onClick={handleToggleEditMode} size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        수정
                      </Button>
                    ) : (
                      // 수정 모드
                      <>
                        {/* 작업 정보가 있을 때만 취소 버튼 표시 */}
                        {(!isWorkDataEmpty() || hasWorkImages) && (
                          <Button onClick={handleToggleEditMode} size="sm" variant="outline">
                            취소
                          </Button>
                        )}
                        <Button onClick={handleSaveWorkDataClick} size="sm">
                          <Save className="h-4 w-4 mr-1" />
                          저장
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 처리 이력 (Card 밖에 별도 배치) */}
          <ProcessingHistory 
            history={currentRequest?.history || []} 
            statusColorMap={SAMPLE_STATUS_COLORS}
            userField="by"
            className="space-y-2"
          />

          {/* 댓글 섹션 (Card 밖에 별도 배치) - 동적 로딩 */}
          <Suspense fallback={<div className="p-4 text-center text-muted-foreground">댓글 로딩 중...</div>}>
            <DynamicCommentsSection
              comments={currentRequest?.comments || []}
              onAddComment={handleAddComment}
              onDeleteComment={(commentId) => comments.deleteComment(currentRequest?.id || '', commentId)}
              onEditComment={(commentId, newText) =>
                comments.updateComment(currentRequest?.id || '', commentId, newText)
              }
              currentUserUid={currentUserUid}
              isAdmin={isAdmin}
            />
          </Suspense>
        </div>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>삭제 확인</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              정말 이 샘플 요청을 삭제하시겠습니까?
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                삭제
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 보류/반려 사유 입력 */}
        <Dialog open={!!changingStatus} onOpenChange={() => setChangingStatus(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{changingStatus} 사유</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="사유를 입력하세요"
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setChangingStatus(null)}>
                  취소
                </Button>
                <Button onClick={handleConfirmStatusChange}>확인</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};





