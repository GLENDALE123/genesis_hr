/**
 * 샘플 요청목록 페이지
 */

'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import {
  SampleRequestTable,
  SampleRequestCard,
  SampleRequestDetail,
} from '@/features/sample';
import { SampleRequestForm } from '@/features/sample/components/SampleRequestForm';
import {
  useSampleRequests,
  useSampleFilters,
} from '@/features/sample/hooks';
import { SampleRequest, SampleFormData } from '@/features/sample/types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { LayoutGrid, List, Plus, Search, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';

export default function SampleRequestsPage() {
  const { user } = useAuthStore();
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
    hasActiveFilters,
    resetFilters,
  } = useSampleFilters(requests);

  // UI 상태
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<SampleRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SampleRequest | null>(null);

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

  // 로딩 상태
  if (isLoading && requests.length === 0) {
    return (
      <ProtectedRoute>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </ProtectedRoute>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <ProtectedRoute>
        <div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              데이터를 불러오는 중 오류가 발생했습니다: {error.message}
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col">
        {/* 필터 및 검색 */}
        <div className="border-b bg-muted/30 pb-4 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-muted-foreground">
              총 {filteredRequests.length}건의 샘플 요청
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              신규 요청
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
            {/* 검색 */}
            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ID, 고객사, 제품명 등으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* 필터 초기화 */}
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  필터 초기화
                </Button>
              )}

              {/* 뷰 모드 전환 */}
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
          </div>
        </div>

        {/* 요청 목록 */}
        <div className="flex-1 overflow-auto">
          {filteredRequests.length > 0 ? (
            viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRequests.map((request) => (
                  <SampleRequestCard
                    key={request.id}
                    request={request}
                    onSelect={() => setSelectedRequest(request)}
                  />
                ))}
              </div>
            ) : (
              <SampleRequestTable
                requests={filteredRequests}
                onSelectRequest={setSelectedRequest}
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
            onClose={() => setSelectedRequest(null)}
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

