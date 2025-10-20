'use client';

import React, { useState, useMemo } from 'react';
import { JigRequestTable, JigRequestCard, JigRequestKanban, JigRequestDetail, JigRequestForm } from '../components';
import { JigStatus, JigRequest, CreateJigRequestData } from '../types';
import { useJigRequests } from '../hooks/useJigRequests';
import { useJigRequestFilters } from '../hooks/useJigRequestFilters';
import { useUserRole } from '@/features/auth/hooks/useUserRole';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent } from '@/shared/components/ui/card';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { ViewMode } from '../types';
import { Plus, Filter, Search, Table, Grid3X3, Kanban } from 'lucide-react';

export const JigManagementContainer: React.FC = () => {
  const { requests, isLoading, error, updateRequestStatus, createRequest } = useJigRequests();
  const userRole = useUserRole() || 'Member';
  const { user } = useAuthStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedRequest, setSelectedRequest] = useState<JigRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

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
  } = useJigRequestFilters(requests);

  const canManage = userRole === 'Admin' || userRole === 'Manager';
  const canAddNew = userRole === 'Admin' || userRole === 'Manager';

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleSelectRequest = (request: JigRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRequest(null);
  };

  const handleNewRequest = () => {
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
  };

  const handleSaveNewRequest = async (data: CreateJigRequestData, imageFiles: File[]) => {
    if (!user) {
      console.error('사용자 정보가 없습니다.');
      return;
    }
    
    try {
      // imageUrls가 이미 data에 포함되어 있으므로 그대로 사용
      await createRequest(data, imageFiles, user.uid, user.displayName || 'Unknown User');
      setIsFormModalOpen(false);
      console.log('새 요청 등록 완료');
    } catch (error) {
      console.error('새 요청 등록 실패:', error);
    }
  };

  const handleUpdateStatus = async (id: string, status: JigStatus, reason?: string) => {
    try {
      await updateRequestStatus(id, status, user?.uid || '', user?.displayName || 'Unknown User', reason);
      console.log('상태 업데이트 완료:', { id, status, reason });
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
    }
  };


  const renderView = () => {
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
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">지그 요청/관리</h1>
          <p className="text-muted-foreground">지그 요청을 관리하고 상태를 업데이트하세요</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAddNew && (
            <Button onClick={handleNewRequest} className="flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              신규 요청
            </Button>
          )}
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="px-6 pb-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="요청 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
            {/* 상태 필터 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">상태</label>
              <Select
                value={selectedStatuses.size === 1 ? Array.from(selectedStatuses)[0] : selectedStatuses.size > 1 ? 'multiple' : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedStatuses(new Set());
                  } else if (value === 'multiple') {
                    // 다중 선택 상태 유지
                  } else {
                    setSelectedStatuses(new Set([value as JigStatus]));
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Object.values(JigStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 요청자 필터 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">요청자</label>
              <Select
                value={selectedRequesters.size === 1 ? Array.from(selectedRequesters)[0] : selectedRequesters.size > 1 ? 'multiple' : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedRequesters(new Set());
                  } else if (value === 'multiple') {
                    // 다중 선택 상태 유지
                  } else {
                    setSelectedRequesters(new Set([value]));
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {requesters.map((requester) => (
                    <SelectItem key={requester} value={requester}>
                      {requester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 수신처 필터 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">수신처</label>
              <Select
                value={selectedDestinations.size === 1 ? Array.from(selectedDestinations)[0] : selectedDestinations.size > 1 ? 'multiple' : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedDestinations(new Set());
                  } else if (value === 'multiple') {
                    // 다중 선택 상태 유지
                  } else {
                    setSelectedDestinations(new Set([value]));
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {destinations.map((destination) => (
                    <SelectItem key={destination} value={destination}>
                      {destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 월별 필터 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">월별</label>
              <Select
                value={selectedMonths.size === 1 ? Array.from(selectedMonths)[0] : selectedMonths.size > 1 ? 'multiple' : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedMonths(new Set());
                  } else if (value === 'multiple') {
                    // 다중 선택 상태 유지
                  } else {
                    setSelectedMonths(new Set([value]));
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 전체 필터 초기화 */}
            {(selectedStatuses.size + selectedRequesters.size + selectedDestinations.size + selectedMonths.size) > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                모든 필터 초기화
              </Button>
            )}
              </div>
            </div>

            {/* 뷰 모드 선택 탭 */}
            <Tabs value={viewMode} onValueChange={(value) => handleViewModeChange(value as ViewMode)}>
              <TabsList className="inline-flex">
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  <span>테이블</span>
                </TabsTrigger>
                <TabsTrigger value="card" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  <span>카드</span>
                </TabsTrigger>
                <TabsTrigger value="kanban" className="flex items-center gap-2">
                  <Kanban className="h-4 w-4" />
                  <span>칸반</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 px-6 pb-6 flex flex-col min-h-0">
        {isLoading ? (
          <LoadingSpinner 
            size="lg" 
            variant="default" 
            label="로딩 중..." 
            loadingVariant="card"
            className="h-64"
          />
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-destructive mb-4">오류가 발생했습니다: {error}</p>
              <Button onClick={() => window.location.reload()}>새로고침</Button>
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
        currentUserProfile={user ? { uid: user.uid, displayName: user.displayName || '', email: user.email || '', role: userRole } : undefined}
        onStatusUpdate={handleUpdateStatus}
        onEdit={(request) => {
          console.log('수정 요청:', request);
        }}
        onDelete={(id) => {
          console.log('삭제 요청:', id);
        }}
        onReceiveItems={(id, quantity) => {
          console.log('입고/반출 처리:', { id, quantity });
        }}
        onAddComment={(requestId, commentText) => {
          console.log('댓글 추가:', { requestId, commentText });
        }}
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
    </div>
  );
};



