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
import { useAuthStore, usePagePermissions, PermissionSettingsButton } from '@/features/auth';
import { toast } from 'sonner';
import { getFirebaseErrorMessage } from '@/shared/utils/firebaseErrorHandler';
import {
  getAllShortageRequests,
  updateShortageStatus,
  deleteShortageRequest
} from '@/features/production/services/shortageService';

const ShortageManagementContainerComponent: React.FC = () => {
  const { user, userProfile } = useAuthStore();
  
  // 페이지별 권한 확인
  const { 
    canRead, 
    canUpdate, 
    canDelete 
  } = usePagePermissions('production-shortage-management');

  const [requests, setRequests] = useState<ShortageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ShortageRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'requested' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  
  // 삭제 확인 대화상자 상태
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    request: ShortageRequest | null;
  }>({ isOpen: false, request: null });

  // 관리 권한 확인 (Manager, Admin)
  const canManage = (userProfile && userProfile.role === 'Manager') || (userProfile && userProfile.role === 'Admin');

  // 부족분 신청 목록 조회
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const data = await getAllShortageRequests();
        setRequests(data);
      } catch (error) {
        console.error('❌ [부족분관리] 데이터 조회 실패:', error);
        const errorInfo = getFirebaseErrorMessage(error);
        toast.error(errorInfo.message);
      } finally {
        setLoading(false);
      }
    };

    if (canRead) {
      fetchRequests();
    }
  }, [canRead]);

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
    if (!canUpdate || !user || !userProfile) {
      toast.error('상태를 변경할 권한이 없습니다.');
      return;
    }
    
    try {
      await updateShortageStatus(
        requestId, 
        newStatus,
        { uid: user.uid, displayName: userProfile.displayName }
      );
      
      // 목록 다시 조회
      const data = await getAllShortageRequests();
      setRequests(data);
      
      toast.success(newStatus === 'completed' 
        ? '부족분 요청이 완료 처리되었습니다.' 
        : '부족분 요청이 요청 상태로 복원되었습니다.'
      );
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
    }
  }, [canUpdate, user, userProfile]);

  // 삭제 확인 핸들러
  const handleDeleteClick = useCallback((request: ShortageRequest) => {
    if (!canDelete) {
      toast.error('부족분 요청을 삭제할 권한이 없습니다.');
      return;
    }
    setDeleteConfirmState({ isOpen: true, request });
  }, [canDelete]);

  // 삭제 실행 핸들러
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmState.request) return;

    try {
      await deleteShortageRequest(deleteConfirmState.request.id);
      
      // 목록 다시 조회
      const data = await getAllShortageRequests();
      setRequests(data);
      
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
  }, [deleteConfirmState.request, selectedRequest]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmState({ isOpen: false, request: null });
  }, []);

  // 읽기 권한 확인
  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">접근 권한 없음</h3>
          <p className="text-sm text-muted-foreground mt-2">
            부족분 관리 페이지에 접근할 권한이 없습니다.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            관리자에게 권한을 요청하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col space-y-6">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
          {/* 좌측: 권한 설정 버튼 (Admin만 표시) */}
          <div>
            <PermissionSettingsButton 
              pageId="production-shortage-management" 
              pageName="부족분 관리" 
            />
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 min-h-0">
          <ShortageManagementListView
            requests={filteredRequests}
            loading={loading}
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            selectedRequest={selectedRequest}
            canManage={canManage && canUpdate}
            canDelete={canDelete}
            onStatusFilterChange={setStatusFilter}
            onSearchChange={setSearchTerm}
            onSelectRequest={setSelectedRequest}
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
              정말로 '{(deleteConfirmState.request && deleteConfirmState.request.productName) || ''}' 부족분 요청을 삭제하시겠습니까? 
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

