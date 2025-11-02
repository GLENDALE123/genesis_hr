'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { JigRequestTable, JigRequestCard, JigRequestKanban, JigRequestDetail, JigRequestForm, JigRequestFilterSection } from '../components';
import { JigStatus, JigRequest, CreateJigRequestData } from '../types';
import { useJigRequests } from '../hooks/useJigRequests';
import { useJigRequestFilters } from '../hooks/useJigRequestFilters';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { CommentsService } from '@/shared/services/comments/commentsService';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { ViewMode } from '../types';
import { Plus } from 'lucide-react';

export const JigManagementContainer: React.FC = () => {
  const { requests, isLoading, error, updateRequestStatus, createRequest, updateRequestQuantity, deleteRequest } = useJigRequests();
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
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
  }, []);

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
      // TODO: 수정 API 호출 구현 필요
      setIsEditModalOpen(false);
      setEditingRequest(null);
    } catch (error) {
      console.error('요청 수정 실패:', error);
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
      {/* 헤더 */}
      <div className="flex flex-row justify-between items-center gap-2 md:gap-4 pb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">지그 요청/관리</h1>
          <p className="hidden md:block text-muted-foreground text-sm">지그 요청을 관리하고 상태를 업데이트하세요</p>
        </div>
        <div className="flex-shrink-0">
          {canAddNew && (
            <Button onClick={handleNewRequest} className="h-8 px-2 md:h-9 md:px-4 text-xs md:text-sm">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span>신규 요청</span>
            </Button>
          )}
        </div>
      </div>

      {/* 필터 및 검색 */}
      <JigRequestFilterSection
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
        selectedRequesters={selectedRequesters}
        onRequesterChange={setSelectedRequesters}
        selectedDestinations={selectedDestinations}
        onDestinationChange={setSelectedDestinations}
        selectedMonths={selectedMonths}
        onMonthChange={setSelectedMonths}
        requesters={requesters}
        destinations={destinations}
        months={months}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onResetFilters={resetFilters}
        filterInfo={{
          ...filterInfo,
          activeFilters: filterInfo.activeFilters.filter(Boolean) as string[]
        }}
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 pb-6 flex flex-col min-h-0">
        {isLoading ? (
          <LoadingSpinner 
            label="로딩 중..." 
            loadingVariant="card"
            className="h-64"
            size="lg"
          />
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