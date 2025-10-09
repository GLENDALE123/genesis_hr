'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { useAuth } from '@/features/auth/hooks';
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

export const ProductionManagementCenter: React.FC = () => {
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | ProductionRequestType>('all');
  const { requests, isLoading, createRequest, updateRequestStatus, deleteRequest, addComment, editComment, deleteComment } = useProductionRequests();
  const { userProfile } = useAuth();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProductionRequest | null>(null);

  const filteredRequests = useMemo(() => {
    if (requestTypeFilter === 'all') return requests;
    return requests.filter(req => req.requestType === requestTypeFilter);
  }, [requests, requestTypeFilter]);

  // 실시간 업데이트: requests가 변경되면 selectedRequest도 동기화
  useEffect(() => {
    if (selectedRequest) {
      const updatedRequest = requests.find(req => req.id === selectedRequest.id);
      if (updatedRequest) {
        setSelectedRequest(updatedRequest);
      }
    }
  }, [requests]);

  const handleNewRequest = () => {
    setIsFormModalOpen(true);
  };

  const handleSelectRequest = (request: ProductionRequest) => {
    setSelectedRequest(request);
  };

  const handleSaveRequest = async (
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
  };

  const handleStatusUpdate = async (id: string, status: ProductionRequestStatus, reason?: string) => {
    if (!userProfile) return;
    await updateRequestStatus(id, status, getUserDisplayName(userProfile), reason);
  };

  const handleDelete = async (id: string) => deleteRequest(id);

  const handleAddComment = async (id: string, text: string, mentionedUserIds?: string[]) => {
    if (!userProfile) return;
    await addComment(id, {
      text,
      user: getUserDisplayName(userProfile),
      uid: userProfile.uid,
      mentionedUserIds,
    });
  };

  const handleEditComment = async (id: string, commentId: string, newText: string) => {
    await editComment(id, commentId, newText);
  };

  const handleDeleteComment = async (id: string, commentId: string) => {
    await deleteComment(id, commentId);
  };

  return (
    <div className="h-full flex flex-col bg-background rounded-lg shadow-sm p-4">
      {/* 헤더 */}
      <header className="flex-shrink-0 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg font-bold text-foreground">
          생산관리부 요청사항 ({filteredRequests.length}건)
        </h3>
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
          <LoadingSpinner size="lg" label="데이터 로딩 중..." />
        ) : filteredRequests.length > 0 ? (
          <div className="relative rounded-md border">
            <Table>
              <TableHeader className={TABLE_HEAD_STYLES.sticky}>
                <TableRow>
                  {['요청일시', '요청유형', '상태', '요청자', '발주번호', '발주처', '제품명', '수량', '요청내용'].map(header => (
                    <TableHead key={header} className={TABLE_HEAD_STYLES.base}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(req => {
                  const unread = checkUnreadComments(req.comments, userProfile?.uid);
                  const commentCount = req.comments?.length || 0;
                  
                  return (
                    <TableRow 
                      key={req.id} 
                      onClick={() => handleSelectRequest(req)} 
                      className="cursor-pointer hover:bg-muted/50"
                    >
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
                      <TableCell className={TABLE_CELL_STYLES.truncate} title={req.content}>
                        <div className="flex items-center gap-2">
                          {/* 댓글 개수 표시 */}
                          {commentCount > 0 && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">
                                {commentCount}
                              </span>
                            </div>
                          )}
                          {/* 새로운 댓글 표시 */}
                          {unread && (
                            <span 
                              title="새로운 댓글" 
                              className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"
                            />
                          )}
                          <span className="truncate">{req.content}</span>
                        </div>
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
        currentUserUid={userProfile?.uid || ''}
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

