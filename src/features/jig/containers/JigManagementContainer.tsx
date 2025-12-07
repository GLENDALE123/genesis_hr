import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { JigRequestTable, JigRequestCard, JigRequestKanban, JigRequestDetail, JigRequestForm, JigRequestFilterSection } from '../components';
import { JigStatus, JigRequest, CreateJigRequestData } from '../types';
import { useJigRequests } from '../hooks/useJigRequests';
import { useJigRequestFilters } from '../hooks/useJigRequestFilters';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { getUserDisplayName } from '@/shared/utils/user/userUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { CommentsService } from '@/shared/services/comments/commentsService';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { ViewMode } from '../types';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Table, Grid3X3, Kanban } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';

export const JigManagementContainer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { requests, isLoading, error, updateRequestStatus, createRequest, updateRequest, updateRequestQuantity, deleteRequest } = useJigRequests();
  const userRole = useUserRole() || 'Member';
  const { user, userProfile } = useAuthStore();
  const currentUserProfile = useMemo(() => {
    if (!user) return undefined;
    
    // userProfile이 아직 로드되지 않았어도 기본 정보는 제공
    const displayName = getUserDisplayName(user, userProfile, '로딩 중...');
    
    return {
      uid: user.uid,
      displayName,
      email: user.email || '',
      role: userRole,
      isLoading: !userProfile // userProfile 로딩 상태 표시
    };
  }, [user, userProfile, userRole]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedRequest, setSelectedRequest] = useState<JigRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<JigRequest | null>(null);

  // requests 배열이 업데이트될 때마다 selectedRequest도 업데이트
  useEffect(() => {
    if (selectedRequest) {
      const updatedRequest = requests.find(req => req.id === selectedRequest.id);
      if (updatedRequest) {
        setSelectedRequest(updatedRequest);
      }
    }
  }, [requests, selectedRequest]);

  // URL 파라미터로 모달 열기 (딥링크 처리)
  useEffect(() => {
    const requestId = searchParams.get('requestId');
    
    // URL에 requestId가 없으면 아무것도 하지 않음
    if (!requestId) {
      return;
    }
    
    // 이미 같은 요청이 선택되어 있으면 아무것도 하지 않음
    if (selectedRequest?.id === requestId && isDetailModalOpen) {
      return;
    }
    
    // selectedRequest가 null이면 모달을 열지 않음 (사용자가 닫은 경우)
    if (!selectedRequest && requestId) {
      // URL에 requestId가 있지만 selectedRequest가 null이면 URL만 정리
      // 이는 사용자가 모달을 닫은 후 URL이 아직 업데이트되지 않은 경우를 처리
      return;
    }
    
    // 요청 목록이 로드되지 않았으면 대기
    if (!requests || requests.length === 0) {
      return;
    }
    
    // URL의 requestId에 해당하는 요청 찾아서 모달 열기
    const target = requests.find(req => req.id === requestId);
    if (target) {
      setSelectedRequest(target);
      setIsDetailModalOpen(true);
    }
  }, [searchParams, requests, selectedRequest, isDetailModalOpen]);

  const {
    searchTerm,
    setSearchTerm,
    selectedStatuses,
    setSelectedStatuses,
    selectedRequesters,
    setSelectedRequesters,
    selectedDestinations,
    setSelectedDestinations,
    selectedMonths,
    setSelectedMonths,
    requesters,
    destinations,
    months,
    filteredRequests,
    resetFilters,
    filterInfo,
  } = useJigRequestFilters(requests);

  const canManage = userRole === 'Admin' || userRole === 'Manager';
  const canAddNew = userRole === 'Admin' || userRole === 'Manager';

  // 전체 통계 계산
  const totalStats = useMemo(() => {
    const totalCount = filteredRequests.length;
    // 발주수량 합계
    const totalOrderQuantity = filteredRequests.reduce((sum, req) => sum + (req.quantity || 0), 0);
    // 완료수량 합계
    const totalReceivedQuantity = filteredRequests.reduce((sum, req) => sum + (req.receivedQuantity || 0), 0);
    // 발주금액 = 발주수량 * 단가 + 코어비
    const totalOrderAmount = filteredRequests.reduce((sum, req) => {
      const unitPrice = req.unitPrice || 0;
      const coreCost = req.coreCost || 0;
      return sum + (req.quantity * unitPrice) + coreCost;
    }, 0);
    // 입고금액 = 완료수량 * 단가
    const totalReceivedAmount = filteredRequests.reduce((sum, req) => {
      const unitPrice = req.unitPrice || 0;
      return sum + (req.receivedQuantity * unitPrice);
    }, 0);

    return {
      totalCount,
      totalOrderQuantity,
      totalReceivedQuantity,
      totalOrderAmount,
      totalReceivedAmount
    };
  }, [filteredRequests]);

  const handleAddComment = useCallback(async (requestId: string, commentText: string, mentionedUserIds?: string[]) => {
      if (!user || !getUserDisplayName(user, userProfile)) {
      console.error('사용자 정보가 없습니다.');
      return;
    }

    try {
      await CommentsService.addComment('jig-requests', requestId, {
        text: commentText,
            user: getUserDisplayName(user, userProfile),
        uid: user.uid,
        mentionedUserIds: mentionedUserIds || []
      });
      
    } catch (error) {
      console.error('댓글 추가 실패:', error);
    }
  }, [user, userProfile]);

  const handleDeleteComment = useCallback(async (requestId: string, commentId: string) => {
    try {
      await CommentsService.deleteComment('jig-requests', requestId, commentId);
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
    }
  }, []);

  const handleEditComment = useCallback(async (requestId: string, commentId: string, newText: string) => {
    try {
      await CommentsService.updateComment('jig-requests', requestId, commentId, newText);
    } catch (error) {
      console.error('댓글 수정 실패:', error);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleSelectRequest = useCallback((request: JigRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
    // URL 업데이트 (딥링크 지원)
    const params = new URLSearchParams(searchParams.toString());
    params.set('requestId', request.id);
    navigate(`${pathname}?${params.toString()}`, { replace: true });
  }, [searchParams, pathname, navigate]);

  const handleCloseDetailModal = useCallback(() => {
    // URL을 먼저 업데이트
    if (searchParams.get('requestId')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('requestId');
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      navigate(newUrl, { replace: true });
    }
    
    // 상태 업데이트 - 모달 닫기
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
  }, [searchParams, pathname, navigate]);

  const handleDeleteRequest = useCallback(async (requestId: string) => {
    try {
      await deleteRequest(requestId);
      // 삭제 후 모달 닫기
      setIsDetailModalOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('요청 삭제 실패:', error);
    }
  }, [deleteRequest]);

  const handleNewRequest = useCallback(() => {
    setIsFormModalOpen(true);
  }, []);

  const handleCloseFormModal = useCallback(() => {
    setIsFormModalOpen(false);
  }, []);

  const handleEditRequest = useCallback((request: JigRequest) => {
    setEditingRequest(request);
    setIsEditModalOpen(true);
    setIsDetailModalOpen(false); // 상세 모달 닫기
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingRequest(null);
  }, []);

  const handleSaveNewRequest = async (data: CreateJigRequestData, imageFiles: File[]) => {
    if (!user) {
      console.error('사용자 정보가 없습니다.');
      return;
    }
    
    try {
      // imageUrls가 이미 data에 포함되어 있으므로 그대로 사용
        await createRequest(data, imageFiles, user.uid, getUserDisplayName(user, userProfile, 'Unknown User'));
      setIsFormModalOpen(false);
    } catch (error) {
      console.error('새 요청 등록 실패:', error);
    }
  };

  const handleSaveEditRequest = async (data: CreateJigRequestData, imageFiles: File[]) => {
    if (!user || !editingRequest) {
      console.error('사용자 정보 또는 편집 중인 요청이 없습니다.');
      return;
    }
    
    try {
      // updateRequest 호출 - data에 이미 imageUrls가 포함되어 있음
      await updateRequest(
        editingRequest.id,
        data,
        user.uid,
        getUserDisplayName(user, userProfile, 'Unknown User')
      );
      
      setIsEditModalOpen(false);
      setEditingRequest(null);
    } catch (error) {
      console.error('요청 수정 실패:', error);
      throw error; // 에러를 다시 throw하여 폼에서 처리할 수 있도록 함
    }
  };

  const handleUpdateStatus = async (id: string, status: JigStatus, reason?: string) => {
    try {
        await updateRequestStatus(id, status, (user && user.uid) || '', getUserDisplayName(user, userProfile, 'Unknown User'), reason);
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
    }
  };

  const handleReceiveItems = async (id: string, quantityChange: number) => {
    try {
      await updateRequestQuantity(id, quantityChange, (user && user.uid) || '', getUserDisplayName(user, userProfile, 'Unknown User'));
    } catch (error) {
      console.error('입고 처리 실패:', error);
    }
  };

  const renderView = useCallback(() => {
    switch (viewMode) {
      case 'table':
        return (
          <JigRequestTable
            requests={filteredRequests}
            onSelectRequest={handleSelectRequest}
            currentUserUid={user?.uid}
          />
        );
      case 'card':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((request) => (
              <JigRequestCard
                key={request.id}
                request={request}
                onSelect={handleSelectRequest}
              />
            ))}
          </div>
        );
      case 'kanban':
        return (
          <JigRequestKanban
            requests={filteredRequests}
            onSelectRequest={handleSelectRequest}
          />
        );
      default:
        return null;
    }
  }, [viewMode, filteredRequests, handleSelectRequest, user?.uid]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 필터 및 검색 */}
      <JigRequestFilterSection
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
        selectedMonths={selectedMonths}
        onMonthChange={setSelectedMonths}
        months={months}
        onResetFilters={resetFilters}
        filterInfo={{
          ...filterInfo,
          activeFilters: filterInfo.activeFilters.filter(Boolean) as string[]
        }}
        onCreateRequest={canAddNew ? handleNewRequest : undefined}
      />

      {/* 통계 및 뷰 모드 */}
      <div className="flex justify-between items-center mb-2">
        <Badge variant="outline" className="text-xs px-2 py-1">
          총 {totalStats.totalCount} 건 | 발주: {totalStats.totalOrderQuantity.toLocaleString()}/입고: {totalStats.totalReceivedQuantity.toLocaleString()}
        </Badge>
        <Tabs value={viewMode} onValueChange={(value) => handleViewModeChange(value as ViewMode)}>
          <TabsList className="inline-flex h-8">
            <TabsTrigger value="table" className="flex items-center gap-1 px-2 py-1 text-xs">
              <Table className="h-3 w-3" />
              <span>테이블</span>
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-1 px-2 py-1 text-xs">
              <Grid3X3 className="h-3 w-3" />
              <span>카드</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-1 px-2 py-1 text-xs">
              <Kanban className="h-3 w-3" />
              <span>칸반</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 pb-6 flex flex-col min-h-0">
        {isLoading && requests.length === 0 ? (
          <Skeleton className="flex-1 w-full" />
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-destructive mb-4">오류가 발생했습니다: {error}</p>
              <Button onClick={handleRefresh}>새로고침</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            {renderView()}
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      <JigRequestDetail
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        request={selectedRequest}
        currentUserProfile={currentUserProfile}
        onStatusUpdate={handleUpdateStatus}
        onEdit={handleEditRequest}
        onDelete={handleDeleteRequest}
        onReceiveItems={handleReceiveItems}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onEditComment={handleEditComment}
      />

      {/* 신규 요청 폼 모달 */}
      <JigRequestForm
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSave={handleSaveNewRequest}
        isLoading={isLoading}
        autocompleteData={{
          requesters: [...new Set(requests.map(r => r.requester))],
          destinations: [...new Set(requests.map(r => r.destination))],
          itemNames: [...new Set(requests.map(r => r.itemName))],
          partNames: [...new Set(requests.map(r => r.partName))],
          itemNumbers: [...new Set(requests.map(r => r.itemNumber))],
        }}
      />

      {/* 수정 폼 모달 */}
      <JigRequestForm
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditRequest}
        isLoading={isLoading}
        editingRequest={editingRequest}
        autocompleteData={{
          requesters: [...new Set(requests.map(r => r.requester))],
          destinations: [...new Set(requests.map(r => r.destination))],
          itemNames: [...new Set(requests.map(r => r.itemName))],
          partNames: [...new Set(requests.map(r => r.partName))],
          itemNumbers: [...new Set(requests.map(r => r.itemNumber))],
        }}
      />
    </div>
  );
};