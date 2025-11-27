/**
 * 샘플 요청목록 페이지
 */

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import {
  SampleRequestTable,
  SampleRequestCard,
  SampleRequestDetail,
  SampleFilterPanel,
} from '@/features/sample';
import { SampleRequestForm } from '@/features/sample/components/SampleRequestForm';
import {
  useSampleRequests,
  useSampleFilters,
} from '@/features/sample/hooks';
import { SampleRequest, SampleFormData, SampleStatus } from '@/features/sample/types';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { LayoutGrid, List, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';

function SampleRequestsContent() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    requests,
    isLoading,
    error,
    createRequest,
    updateRequest,
    updateStatus,
    deleteRequest,
    updateWorkData,
  } = useSampleRequests();

  const {
    filteredRequests,
    searchTerm,
    setSearchTerm,
    selectedStatuses,
    selectedCoatingMethods,
    hasActiveFilters,
    resetFilters,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    toggleStatusFilter,
    toggleCoatingMethodFilter,
    setStatusFilter,
    setCoatingMethodFilter,
    handleQuickDateFilter,
    today,
    yesterday,
    isSearching,
  } = useSampleFilters(requests);

  // UI 상태
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<SampleRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SampleRequest | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);

  // URL 쿼리 파라미터에서 초기 필터 복원
  useEffect(() => {
    if (isInitialized) return;
    
    const status = searchParams.get('status');
    const coating = searchParams.get('coating');
    
    if (status || coating) {
      // URL 파라미터가 있으면 먼저 모든 필터 초기화
      resetFilters();
      
      // 이후 URL 파라미터 직접 설정 (토글 아님)
      if (status) {
        setStatusFilter(status as SampleStatus);
      }
      if (coating) {
        setCoatingMethodFilter(coating);
      }
      
      setIsInitialized(true);
    } else {
      setIsInitialized(true);
    }
  }, [searchParams, setStatusFilter, setCoatingMethodFilter, resetFilters, isInitialized]);

  // 요청 선택 핸들러 (URL 업데이트 포함)
  const handleSelectRequest = useCallback((request: SampleRequest) => {
    setSelectedRequest(request);
    // URL 업데이트 (딥링크 지원)
    const params = new URLSearchParams(searchParams.toString());
    params.set('requestId', request.id);
    navigate(`${pathname}?${params.toString()}`, { replace: true });
  }, [searchParams, pathname, navigate]);

  // URL 파라미터로 모달 열기 (딥링크 처리)
  useEffect(() => {
    const requestId = searchParams.get('requestId');
    
    // URL에 requestId가 없으면 아무것도 하지 않음
    if (!requestId) {
      return;
    }
    
    // 이미 같은 요청이 선택되어 있으면 아무것도 하지 않음
    if (selectedRequest?.id === requestId) {
      return;
    }
    
    // 모달을 닫는 중이면 아무것도 하지 않음
    if (isClosingModal) {
      return;
    }
    
    // selectedRequest가 null이고 모달을 닫지 않는 중이면 모달을 열지 않음 (사용자가 닫은 경우)
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
      setIsClosingModal(false); // 모달 열리면 닫기 플래그 초기화
    }
  }, [searchParams, requests, selectedRequest, isClosingModal]);

  // 새 요청 등록
  const handleCreateRequest = async (data: SampleFormData, images: File[]) => {
    await createRequest(data, images);
    setShowForm(false);
  };

  // 요청 수정
  const handleUpdateRequest = async (data: SampleFormData) => {
    if (!editingRequest) return;
    await updateRequest(editingRequest.id, data);
    setEditingRequest(null);
    setShowForm(false);
  };

  // 수정 모달 열기
  const handleEdit = (request: SampleRequest) => {
    setEditingRequest(request);
    setShowForm(true);
    setSelectedRequest(null);
  };

  // 상세 모달 닫기 핸들러 (URL 쿼리 파라미터 제거)
  const handleCloseDetailModal = useCallback(() => {
    // 모달 닫기 플래그 설정
    setIsClosingModal(true);
    
    // 상태 업데이트 - 모달 닫기 (먼저)
    setSelectedRequest(null);
    
    // URL 업데이트 (나중에)
    if (searchParams.get('requestId')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('requestId');
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      navigate(newUrl, { replace: true });
    }
    
    // 짧은 딜레이 후 플래그 해제 (URL 업데이트 완료 대기)
    setTimeout(() => {
      setIsClosingModal(false);
    }, 100);
  }, [searchParams, pathname, navigate]);

  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col">
        {/* 필터 패널 */}
        <SampleFilterPanel
          searchTerm={searchTerm}
          selectedStatuses={selectedStatuses}
          selectedCoatingMethods={selectedCoatingMethods}
          onSearchTermChange={setSearchTerm}
          onToggleStatus={toggleStatusFilter}
          onToggleCoating={toggleCoatingMethodFilter}
          onReset={resetFilters}
          isSearching={isSearching}
          onCreateRequest={() => setShowForm(true)}
        />

        {/* 뷰 모드 전환 */}
        <div className="flex justify-end items-center mb-4 mt-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 요청 목록 */}
        <div className="flex-1 overflow-auto">
          {isLoading && requests.length === 0 ? (
            <Skeleton className="h-96 w-full" />
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                데이터를 불러오는 중 오류가 발생했습니다: {error.message}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {filteredRequests.length > 0 ? (
                viewMode === 'card' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRequests.map((request) => (
                      <SampleRequestCard
                        key={request.id}
                        request={request}
                        onSelect={() => handleSelectRequest(request)}
                      />
                    ))}
                  </div>
                ) : (
                  <SampleRequestTable
                    requests={filteredRequests}
                    onSelectRequest={handleSelectRequest}
                    currentUserUid={user?.uid}
                  />
                )
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  {requests.length === 0
                    ? '등록된 샘플 요청이 없습니다.'
                    : '조건에 맞는 요청이 없습니다.'}
                </div>
              )}
            </>
          )}
        </div>

        {/* 등록/수정 폼 모달 */}
        {showForm && (
          <SampleRequestForm
            open={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingRequest(null);
            }}
            onSubmit={editingRequest ? handleUpdateRequest : handleCreateRequest}
            existingRequest={editingRequest}
          />
        )}

        {/* 상세 보기 모달 */}
        {selectedRequest && (
          <SampleRequestDetail
            open={!!selectedRequest}
            request={selectedRequest}
            onClose={handleCloseDetailModal}
            onUpdateStatus={updateStatus}
            onDelete={deleteRequest}
            onEdit={handleEdit}
            onUpdateWorkData={updateWorkData}
            onUploadWorkImage={async (id: string, file: File) => {
              // 작업 이미지 업로드 로직 (필요시 구현)
              return 'uploaded-image-url'; // 임시 URL 반환
            }}
            currentUserUid={user?.uid}
            isAdmin={true}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function SampleCenterRequestsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    }>
      <SampleRequestsContent />
    </Suspense>
  );
}

