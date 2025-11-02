'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { ShortageManagementListView } from '@/features/production/components/ShortageManagementListView';
import { ShortageRequest } from '@/features/production/types';
import { useAuthStore } from '@/features/auth';
import { toast } from 'sonner';
import { getFirebaseErrorMessage } from '@/shared/utils/firebaseErrorHandler';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import {
  updateShortageStatus,
  deleteShortageRequest
} from '@/features/production/services/shortageService';
import { useShortageRequests } from '@/features/production/hooks/useShortageRequests';
import { Skeleton } from '@/shared/components/ui/skeleton';

const ShortageManagementContainerComponent: React.FC = () => {
  const { user, userProfile } = useAuthStore();
  
  const {
    requests,
    isLoading: loading,
    error,
    updateCachedRequest,
    deleteCachedRequest,
    fetchRequests
  } = useShortageRequests();

  const [selectedRequest, setSelectedRequest] = useState<ShortageRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'requested' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  
  // 삭제 확인 대화상자 상태
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    request: ShortageRequest | null;
  }>({ isOpen: false, request: null });

  // 부족분 신청 목록 조회
  useEffect(() => {
    const fetchData = async () => {
      await fetchRequests();
    };

    fetchData();
  }, [fetchRequests]);

  // 필터링된 요청 목록
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesSearch = searchTerm === '' || 
        request.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.orderNumbers.some(orderNum => orderNum.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, searchTerm]);


  // 상태 업데이트 핸들러
  const handleStatusUpdate = useCallback(async (requestId: string, newStatus: 'requested' | 'completed') => {
    if (!user || !userProfile) {
      toast.error('사용자 정보가 없습니다.');
      return;
    }
    
    try {
      await updateShortageStatus(
        requestId, 
        newStatus,
        { uid: user.uid, displayName: getUserDisplayName(user, userProfile, '관리자') }
      );
      
      // 스토어 캐시도 업데이트 (실시간 구독이 자동으로 반영하지만 즉시 UI 업데이트)
      updateCachedRequest(requestId, { status: newStatus });
      
      toast.success(newStatus === 'completed' 
        ? '부족분 요청이 완료 처리되었습니다.' 
        : '부족분 요청이 요청 상태로 복원되었습니다.'
      );
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
    }
  }, [user, userProfile, updateCachedRequest]);

  // 삭제 확인 핸들러
  const handleDeleteClick = useCallback((request: ShortageRequest) => {
    setDeleteConfirmState({ isOpen: true, request });
  }, []);

  // 삭제 실행 핸들러
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmState.request) return;

    try {
      await deleteShortageRequest(deleteConfirmState.request.id);
      
      // 스토어 캐시도 업데이트
      deleteCachedRequest(deleteConfirmState.request.id);
      
      // 상세 정보가 열려있던 항목이면 닫기
      if ((selectedRequest && selectedRequest.id) === deleteConfirmState.request.id) {
        setSelectedRequest(null);
      }
      
      toast.success('부족분 요청이 삭제되었습니다.');
      setDeleteConfirmState({ isOpen: false, request: null });
    } catch (error) {
      console.error('삭제 실패:', error);
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
      setDeleteConfirmState({ isOpen: false, request: null });
    }
  }, [deleteConfirmState.request, selectedRequest, deleteCachedRequest]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmState({ isOpen: false, request: null });
  }, []);

  // 로딩 상태 - 초기 로딩 시에만 스켈레톤 표시
  if (loading && requests.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // 에러 상태
  if (error && requests.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">데이터를 불러오는 중 오류가 발생했습니다: {error.message || '알 수 없는 오류'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col space-y-6">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 min-h-0">
          <ShortageManagementListView
            requests={filteredRequests}
            loading={loading}
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            selectedRequest={selectedRequest}
            canManage={true}
            canDelete={true}
            onStatusFilterChange={setStatusFilter}
            onSearchChange={setSearchTerm}
            onSelectRequest={(request) => {
              setSelectedRequest(request);
            }}
            onCloseDetail={() => setSelectedRequest(null)}
            onStatusUpdate={handleStatusUpdate}
            onDelete={handleDeleteClick}
          />
        </div>
      </div>

      {/* 삭제 확인 대화상자 */}
      <AlertDialog open={deleteConfirmState.isOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>부족분 요청 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &apos;{(deleteConfirmState.request && deleteConfirmState.request.productName) || ''}&apos; 부족분 요청을 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// React.memo로 최적화하여 불필요한 리렌더링 방지
export const ShortageManagementContainer = React.memo(ShortageManagementContainerComponent);

