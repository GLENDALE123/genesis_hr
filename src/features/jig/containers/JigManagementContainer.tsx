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
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
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

  const handleMultiSelectChange = <T extends string>(
    value: T,
    selectedSet: Set<T>,
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<T>>>
  ) => {
    const newSet = new Set(selectedSet);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setSelectedSet(newSet);
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
      <div className="px-6 pb-4 space-y-4">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  상태
                  {selectedStatuses.size > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedStatuses.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>상태 필터</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.values(JigStatus).map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={selectedStatuses.has(status)}
                    onCheckedChange={() => handleMultiSelectChange(status, selectedStatuses, setSelectedStatuses)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <Button variant="ghost" onClick={() => setSelectedStatuses(new Set())} className="w-full justify-start">
                  상태 초기화
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 요청자 필터 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  요청자
                  {selectedRequesters.size > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedRequesters.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>요청자 필터</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {requesters.map((requester) => (
                  <DropdownMenuCheckboxItem
                    key={requester}
                    checked={selectedRequesters.has(requester)}
                    onCheckedChange={() => handleMultiSelectChange(requester, selectedRequesters, setSelectedRequesters)}
                  >
                    {requester}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <Button variant="ghost" onClick={() => setSelectedRequesters(new Set())} className="w-full justify-start">
                  요청자 초기화
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 수신처 필터 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  수신처
                  {selectedDestinations.size > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedDestinations.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>수신처 필터</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {destinations.map((destination) => (
                  <DropdownMenuCheckboxItem
                    key={destination}
                    checked={selectedDestinations.has(destination)}
                    onCheckedChange={() => handleMultiSelectChange(destination, selectedDestinations, setSelectedDestinations)}
                  >
                    {destination}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <Button variant="ghost" onClick={() => setSelectedDestinations(new Set())} className="w-full justify-start">
                  수신처 초기화
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 월별 필터 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  월별
                  {selectedMonths.size > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedMonths.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>월별 필터</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {months.map((month) => (
                  <DropdownMenuCheckboxItem
                    key={month}
                    checked={selectedMonths.has(month)}
                    onCheckedChange={() => handleMultiSelectChange(month, selectedMonths, setSelectedMonths)}
                  >
                    {month}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <Button variant="ghost" onClick={() => setSelectedMonths(new Set())} className="w-full justify-start">
                  월별 초기화
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 전체 필터 초기화 */}
            {(selectedStatuses.size + selectedRequesters.size + selectedDestinations.size + selectedMonths.size) > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                모든 필터 초기화
              </Button>
            )}
          </div>
        </div>

        {/* 뷰 모드 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">보기:</span>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('table')}
              className="rounded-r-none"
            >
              <Table className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('card')}
              className="rounded-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('kanban')}
              className="rounded-l-none"
            >
              <Kanban className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-destructive mb-4">오류가 발생했습니다: {error}</p>
              <Button onClick={() => window.location.reload()}>새로고침</Button>
            </div>
          </div>
        ) : (
          renderView()
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



