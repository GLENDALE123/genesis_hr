'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useProductionRequests } from '../hooks/useProductionRequests';
import {
  ProductionRequestType,
  ProductionRequestStatus,
  type ProductionRequest,
} from '../services/productionRequestService';
import { ProductionRequestFormModal } from './ProductionRequestFormModal';
import { ProductionRequestDetailModal } from './ProductionRequestDetailModal';
import { uploadImages } from '../../../shared/utils/imageUpload';
import { 
  getUserDisplayName, 
  formatOrderNumber, 
  getStatusColorClass,
  hasUnreadComments as checkUnreadComments 
} from '../utils/productionUtils';
import { isAdmin, isManager } from '@/shared/utils/userUtils';
import { TABLE_CELL_STYLES, TABLE_HEAD_STYLES } from '../constants/tableStyles';

const ProductionManagementCenterComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | ProductionRequestType>('all');
  const { requests, isLoading, createRequest, updateRequestStatus, deleteRequest, addComment, editComment, deleteComment } = useProductionRequests();
  const { userProfile } = useAuthStore();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProductionRequest | null>(null);

  // 컴포넌트 마운트 로그
  useEffect(() => {
    console.log('🏭 [생산관리부] ProductionManagementCenter 마운트');
    return () => {
      console.log('🏭 [생산관리부] ProductionManagementCenter 언마운트');
    };
  }, []);

  const filteredRequests = useMemo(() => {
    if (requestTypeFilter === 'all') return requests;
    return requests.filter(req => req.requestType === requestTypeFilter);
  }, [requests, requestTypeFilter]);

  // URL 파라미터로 모달 열기 (딥링크 처리)
  useEffect(() => {
    const requestId = searchParams.get('requestId');
    if (requestId && !isLoading && requests.length > 0) {
      const request = requests.find(req => req.id === requestId);
      if (request) {
        console.log('🔗 [ProductionManagement] 딥링크로 모달 열기:', requestId);
        setSelectedRequest(request);
        
        // URL 파라미터 제거 (모달 닫을 때를 위해)
        router.replace('/production/management', { scroll: false });
      } else {
        console.warn('⚠️ [ProductionManagement] 요청을 찾을 수 없음:', requestId);
      }
    }
  }, [searchParams, requests, isLoading, router]);

  // 실시간 업데이트: requests가 변경되면 selectedRequest도 동기화
  useEffect(() => {
    if (selectedRequest) {
      const updatedRequest = requests.find(req => req.id === selectedRequest.id);
      if (updatedRequest) {
        setSelectedRequest(updatedRequest);
      }
    }
  }, [requests]);

  const handleNewRequest = useCallback(() => {
    setIsFormModalOpen(true);
  }, []);

  const handleSelectRequest = useCallback((request: ProductionRequest) => {
    setSelectedRequest(request);
  }, []);

  const handleSaveRequest = useCallback(async (
    data: {
      requestType: ProductionRequestType;
      requester: string;
      orderNumber: string;
      supplier: string;
      productName: string;
      partName: string;
      quantity: string;
      content: string;
    },
    imageFiles: File[]
  ) => {
    if (!userProfile) return;

    // 이미지 압축 및 업로드 (진행률 표시)
    const imageUrls = await uploadImages(imageFiles, 'production-requests', (current, total) => {
      console.log(`이미지 업로드 중: ${current}/${total}`);
    });

    // 요청 생성
    await createRequest({
      ...data,
      quantity: parseInt(data.quantity),
      status: ProductionRequestStatus.Requested,
      author: {
        uid: userProfile.uid,
        displayName: getUserDisplayName(userProfile),
      },
      imageUrls,
    });
  }, [userProfile, createRequest]);

  const handleStatusUpdate = useCallback(async (id: string, status: ProductionRequestStatus, reason?: string) => {
    if (!userProfile) return;
    await updateRequestStatus(id, status, getUserDisplayName(userProfile), reason);
  }, [userProfile, updateRequestStatus]);

  const handleDelete = useCallback(async (id: string) => deleteRequest(id), [deleteRequest]);

  const handleAddComment = useCallback(async (id: string, text: string, mentionedUserIds?: string[]) => {
    if (!userProfile) return;
    await addComment(id, {
      text,
      user: getUserDisplayName(userProfile),
      uid: userProfile.uid,
      mentionedUserIds,
    });
  }, [userProfile, addComment]);

  const handleEditComment = useCallback(async (id: string, commentId: string, newText: string) => {
    await editComment(id, commentId, newText);
  }, [editComment]);

  const handleDeleteComment = useCallback(async (id: string, commentId: string) => {
    await deleteComment(id, commentId);
  }, [deleteComment]);

  return (
    <div className="h-full flex flex-col bg-background rounded-lg shadow-sm">
      {/* 헤더 */}
      <header className="flex-shrink-0 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-sm text-muted-foreground">
          총 {filteredRequests.length}건
        </div>
        <div className="flex items-center gap-2">
          {/* 요청 타입 필터 */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
            <button 
              onClick={() => setRequestTypeFilter('all')} 
              className={`px-2 py-1 rounded transition-colors ${
                requestTypeFilter === 'all' 
                  ? 'bg-background shadow' 
                  : 'hover:bg-background/50'
              }`}
            >
              전체
            </button>
            {Object.values(ProductionRequestType).map(type => (
              <button 
                key={type} 
                onClick={() => setRequestTypeFilter(type)} 
                className={`px-2 py-1 rounded transition-colors ${
                  requestTypeFilter === type 
                    ? 'bg-background shadow' 
                    : 'hover:bg-background/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {/* 신규 요청 버튼 */}
          <Button 
            onClick={handleNewRequest}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            신규 요청
          </Button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className={`flex-1 overflow-auto ${isLoading ? 'flex' : ''}`}>
        {isLoading ? (
          <LoadingSpinner 
            size="lg" 
            label="생산 데이터 로딩 중..." 
            variant="card"
            className="flex-1"
          />
        ) : filteredRequests.length > 0 ? (
          <div className="relative rounded-md border">
            <Table>
              <TableHeader className={TABLE_HEAD_STYLES.sticky}>
                <TableRow>
                  <TableHead className={TABLE_HEAD_STYLES.base}></TableHead>
                  {['요청일시', '요청유형', '상태', '요청자', '발주번호', '발주처', '제품명', '수량', '요청내용'].map(header => (
                    <TableHead key={header} className={TABLE_HEAD_STYLES.base}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(req => {
                  const unread = checkUnreadComments(req.comments, (userProfile && userProfile.uid) || '');
                  const commentCount = (req.comments && req.comments.length) || 0;
                  
                  return (
                    <TableRow 
                      key={req.id} 
                      onClick={() => handleSelectRequest(req)} 
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {/* 댓글 컬럼 */}
                      <TableCell className={TABLE_CELL_STYLES.base}>
                        <div className="flex items-center gap-2">
                          {unread ? (
                            <span 
                              title="새로운 댓글" 
                              className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"
                            />
                          ) : (
                            <span className="w-2.5 h-2.5" />
                          )}
                          {commentCount > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">
                                {commentCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={TABLE_CELL_STYLES.text}>
                        {new Date(req.createdAt).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell className={TABLE_CELL_STYLES.base}>
                        <Badge variant="secondary">{req.requestType}</Badge>
                      </TableCell>
                      <TableCell className={TABLE_CELL_STYLES.base}>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColorClass(req.status)}`}>
                          {req.status}
                        </span>
                      </TableCell>
                      <TableCell className={TABLE_CELL_STYLES.base}>{req.author.displayName}</TableCell>
                      <TableCell className={TABLE_CELL_STYLES.mono}>
                        {formatOrderNumber(req.orderNumber, req.requestType)}
                      </TableCell>
                      <TableCell className={TABLE_CELL_STYLES.base}>{req.supplier}</TableCell>
                      <TableCell className={TABLE_CELL_STYLES.bold}>
                        {req.productName} ({req.partName})
                      </TableCell>
                      <TableCell className={TABLE_CELL_STYLES.right}>
                        {req.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs whitespace-nowrap overflow-hidden text-ellipsis" title={req.content}>
                        {req.content}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" strokeWidth={1} />
            <p className="text-muted-foreground">
              아직 등록된 요청사항이 없습니다.
            </p>
          </div>
        )}
      </main>

      {/* 신규 요청 모달 */}
      <ProductionRequestFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveRequest}
        currentUserName={getUserDisplayName(userProfile)}
      />

      {/* 상세보기 모달 */}
      <ProductionRequestDetailModal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        currentUserName={getUserDisplayName(userProfile)}
        currentUserUid={(userProfile && userProfile.uid) || ''}
        isAdmin={isAdmin(userProfile)}
        isManager={isManager(userProfile)}
        onStatusUpdate={handleStatusUpdate}
        onDelete={handleDelete}
        onAddComment={handleAddComment}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
      />
    </div>
  );
};

// React.memo로 최적화하여 불필요한 리렌더링 방지
export const ProductionManagementCenter = React.memo(ProductionManagementCenterComponent);

