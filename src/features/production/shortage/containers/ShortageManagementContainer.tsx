import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
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
import { ShortageManagementListView } from '../components/ShortageManagementListView';
import { ShortageRequest } from '../types';
import { useAuthStore } from '@/features/auth';
import { toast } from 'sonner';
import { getFirebaseErrorMessage } from '@/shared/utils/firebase/firebaseErrorHandler';
import { getUserDisplayName, isAdmin } from '@/shared/utils/user/userUtils';
import {
  updateShortageStatus,
  deleteShortageRequest
} from '../services/shortageService';
import { useShortageRequests } from '../hooks/useShortageRequests';
import { Skeleton } from '@/shared/components/ui/skeleton';

const ShortageManagementContainerComponent: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
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
    }
  }, [searchParams, requests, selectedRequest]);


  // 상태 업데이트 핸들러
  const handleStatusUpdate = useCallback(async (requestId: string, newStatus: 'requested' | 'completed') => {
    if (!user || !userProfile) {
      toast.error('사용자 정보가 없습니다.');
      return;
    }
    
    // 낙관적 업데이트: 즉시 UI 업데이트
    updateCachedRequest(requestId, { status: newStatus });
    
    // 선택된 요청도 업데이트
    if (selectedRequest?.id === requestId) {
      setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
    }
    
    // 백그라운드에서 서버 업데이트
    try {
      await updateShortageStatus(
        requestId, 
        newStatus,
        { uid: user.uid, displayName: getUserDisplayName(user, userProfile, '관리자') }
      );
      
      toast.success(newStatus === 'completed' 
        ? '부족분 요청이 완료 처리되었습니다.' 
        : '부족분 요청이 요청 상태로 복원되었습니다.'
      );
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
      
      // 실패 시 롤백 (실시간 구독이 원래 상태로 복원)
      const originalRequest = requests.find(r => r.id === requestId);
      if (originalRequest) {
        updateCachedRequest(requestId, { status: originalRequest.status });
        if (selectedRequest?.id === requestId) {
          setSelectedRequest(originalRequest);
        }
      }
    }
  }, [user, userProfile, updateCachedRequest, selectedRequest, requests]);

  // 삭제 확인 핸들러
  const handleDeleteClick = useCallback((request: ShortageRequest) => {
    setDeleteConfirmState({ isOpen: true, request });
  }, []);

  // 삭제 실행 핸들러
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmState.request) return;

    // Admin 권한 체크
    if (!isAdmin(userProfile)) {
      toast.error('삭제 권한이 없습니다. 관리자만 삭제할 수 있습니다.');
      setDeleteConfirmState({ isOpen: false, request: null });
      return;
    }

    const requestToDelete = deleteConfirmState.request;
    
    // 낙관적 업데이트: 즉시 목록에서 제거
    deleteCachedRequest(requestToDelete.id);
    
    // 상세 정보가 열려있던 항목이면 닫기
    if (selectedRequest?.id === requestToDelete.id) {
      setSelectedRequest(null);
    }
    
    setDeleteConfirmState({ isOpen: false, request: null });
    toast.success('부족분 요청이 삭제되었습니다.');
    
    // 백그라운드에서 서버 삭제
    try {
      await deleteShortageRequest(requestToDelete.id);
    } catch (error) {
      console.error('삭제 실패:', error);
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
      
      // 실패 시 롤백 (실시간 구독이 원래 상태로 복원)
      // 실시간 구독이 자동으로 복원하므로 별도 처리 불필요
    }
  }, [deleteConfirmState.request, selectedRequest, deleteCachedRequest, userProfile]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmState({ isOpen: false, request: null });
  }, []);

  return (
    <>
      <div className="h-full flex flex-col space-y-6">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 min-h-0">
          {loading && requests.length === 0 ? (
            <Skeleton className="h-96 w-full" />
          ) : error && requests.length === 0 ? (
            <div className="space-y-4">
              <p className="text-destructive">데이터를 불러오는 중 오류가 발생했습니다: {error.message || '알 수 없는 오류'}</p>
            </div>
          ) : (
            <ShortageManagementListView
              requests={filteredRequests}
              loading={loading}
              statusFilter={statusFilter}
              searchTerm={searchTerm}
              selectedRequest={selectedRequest}
              canManage={true}
              canDelete={isAdmin(userProfile)}
              onStatusFilterChange={setStatusFilter}
              onSearchChange={setSearchTerm}
              onSelectRequest={(request) => {
                setSelectedRequest(request);
                // URL 업데이트 (딥링크 지원)
                const params = new URLSearchParams(searchParams.toString());
                params.set('requestId', request.id);
                navigate(`${pathname}?${params.toString()}`, { replace: true });
              }}
              onCloseDetail={() => {
                // URL을 먼저 업데이트
                if (searchParams.get('requestId')) {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('requestId');
                  const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
                  navigate(newUrl, { replace: true });
                }
                // 상태 업데이트 - 모달 닫기
                setSelectedRequest(null);
              }}
              onStatusUpdate={handleStatusUpdate}
              onDelete={handleDeleteClick}
            />
          )}
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

