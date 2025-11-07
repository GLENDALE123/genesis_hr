'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/shared/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, ArrowLeft, X } from 'lucide-react';
import { useDeviceType } from '@/shared/hooks/use-device';
// import { Plus } from 'lucide-react';
import { 
  QualityIssueForm,
  QualityIssueStatsCards,
  QualityIssueTable,
  QualityIssueDetail,
  useQualityIssues,
  useQualityIssueForm,
  QualityIssue
} from '@/features/quality';
import { IssueItem } from '@/features/quality/types';
import { addIssueItem, deleteQualityIssue, updateProcessedQuantity } from '@/features/quality/services/qualityIssueService';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { ProtectedRoute } from '@/shared/components/auth';

function QualityIssuesPageContent() {
  const { issues, isLoading, error, searchTerm, setSearchTerm, setStatusFilter, statusFilter, stats } = useQualityIssues();
  const { isFormModalOpen, isSaving, handleSaveIssue, handleCancelForm, openFormModal, openEditModal, editingIssue } = useQualityIssueForm();
  const { user, userProfile } = useAuthStore();
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobileOrTablet = isSmartphone || isTablet;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // 상세 모달 상태 - 단순하게 관리
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const isDetailModalOpen = !!selectedIssue; // 선택된 이슈가 있으면 모달 열림
  
  // 삭제 확인 모달 상태
  const [issueToDelete, setIssueToDelete] = useState<QualityIssue | null>(null);

  // 출하대기 필터링된 이슈 목록 (해결완료 상태 제외)
  const shippingWaitIssues = issues.filter(issue => {
    // 출하대기가 아니면 제외
    if (issue.registrationKeyword !== '출하대기') return false;
    
    // 현재 상태 확인
    const lastIssue = issue.issues[issue.issues.length - 1];
    const currentStatus = lastIssue && typeof lastIssue === 'object' && lastIssue.status 
      ? lastIssue.status 
      : issue.status || '해결완료';
    
    // 해결완료 상태면 제외
    const isResolved = 
      currentStatus === '해결완료' || 
      currentStatus === 'resolved' || 
      currentStatus === 'closed';
    
    return !isResolved;
  });

  // 검색어로 필터링된 출하대기 이슈 목록
  const filteredShippingWaitIssues = React.useMemo(() => {
    if (!searchTerm.trim()) return shippingWaitIssues;

    const searchLower = searchTerm.toLowerCase();
    
    return shippingWaitIssues.filter(issue => {
      const authorText = typeof issue.author === 'string'
        ? issue.author 
        : issue.author?.displayName || issue.author?.email || '';
      
      // 날짜 검색을 위한 포맷팅 함수
      const formatDateForSearch = (dateString: string | Date) => {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // 공정/불량 키워드 검색을 위한 함수
      const keywordPairsText = issue.keywordPairs?.map(pair => 
        `${pair.process || ''} ${pair.defect || ''}`
      ).join(' ') || '';
      
      return (
        // 검색 필드들
        issue.orderNumber.toLowerCase().includes(searchLower) ||
        issue.productName.toLowerCase().includes(searchLower) ||
        issue.partName.toLowerCase().includes(searchLower) ||
        issue.supplier.toLowerCase().includes(searchLower) ||
        authorText.toLowerCase().includes(searchLower) ||
        issue.issues.some(i => {
          const content = typeof i === 'string' ? i : i.content;
          return content.toLowerCase().includes(searchLower);
        }) ||
        (issue.department || '').toLowerCase().includes(searchLower) ||
        (issue.registrationKeyword || '').toLowerCase().includes(searchLower) ||
        keywordPairsText.toLowerCase().includes(searchLower) ||
        // 작성일 검색 (YYYY-MM-DD 형식)
        formatDateForSearch(issue.createdAt).includes(searchLower) ||
        formatDateForSearch(issue.createdAt).replace(/-/g, '').includes(searchLower.replace(/-/g, ''))
      );
    });
  }, [shippingWaitIssues, searchTerm]);

  // 작성자 권한 체크 함수
  const canChangeStatus = (issue: QualityIssue | null): boolean => {
    if (!issue || !user) return false;
    
    // 작성자가 문자열인 경우
    if (typeof issue.author === 'string') {
      return issue.author === getUserDisplayName(user, userProfile, '') || issue.author === user.email;
    }
    
    // 작성자가 객체인 경우
    if (typeof issue.author === 'object' && issue.author) {
      return issue.author.uid === user.uid || 
             issue.author.email === user.email ||
             issue.author.displayName === getUserDisplayName(user, userProfile);
    }
    
    return false;
  };

  // 이슈 선택 핸들러
  const handleSelectIssue = useCallback((issue: QualityIssue) => {
    setSelectedIssue(issue);
    // URL 업데이트 (딥링크 지원)
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('issueId', issue.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // 상세 모달 닫기
  const handleCloseDetailModal = useCallback(() => {
    // URL을 먼저 업데이트
    if (searchParams?.get('issueId')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('issueId');
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
    
    // 상태 업데이트 - 모달 닫기
    setSelectedIssue(null);
  }, [searchParams, pathname, router]);

  // URL 쿼리(issueId)로 진입 시 상세 모달 자동 오픈 - 딥링크 지원
  useEffect(() => {
    const issueId = searchParams?.get('issueId');
    
    // URL에 issueId가 없으면 아무것도 하지 않음
    if (!issueId) {
      return;
    }
    
    // 이미 같은 이슈가 선택되어 있으면 아무것도 하지 않음
    if (selectedIssue?.id === issueId) {
      return;
    }
    
    // selectedIssue가 null이면 모달을 열지 않음 (사용자가 닫은 경우)
    if (!selectedIssue && issueId) {
      // URL에 issueId가 있지만 selectedIssue가 null이면 URL만 정리
      // 이는 사용자가 모달을 닫은 후 URL이 아직 업데이트되지 않은 경우를 처리
      return;
    }
    
    // 이슈 목록이 로드되지 않았으면 대기
    if (!issues || issues.length === 0) {
      return;
    }
    
    // URL의 issueId에 해당하는 이슈 찾아서 모달 열기
    const target = issues.find(i => i.id === issueId);
    if (target) {
      setSelectedIssue(target);
    }
  }, [searchParams, issues, selectedIssue]);



  // 이슈사항 추가 핸들러
  const handleAddIssueItem = async (issueId: string, newIssue: string, newStatus?: string) => {
    try {
      if (!newIssue.trim()) {
        console.error('이슈 내용을 입력해주세요.');
        return;
      }
      
      // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
      if (selectedIssue) {
        const newIssueObject = {
          content: newIssue.trim(),
          createdAt: new Date().toISOString(),
          status: newStatus || '해결완료'
        };
        
        setSelectedIssue({
          ...selectedIssue,
          issues: [...selectedIssue.issues, newIssueObject] as IssueItem[],
          status: (newStatus || selectedIssue.status) as QualityIssue['status']
        });
      }
      
      await addIssueItem(issueId, newIssue.trim(), newStatus, {
        uid: user!.uid,
        displayName: getUserDisplayName(user, userProfile, '알 수 없음'),
        photoURL: user!.photoURL || undefined
      });
      toast.success('이슈사항이 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('Error adding issue item:', error);
      toast.error('이슈사항 추가에 실패했습니다.');
      
      // 실패시 원래 상태로 롤백
      if (selectedIssue) {
        setSelectedIssue(prev => ({
          ...prev!,
          issues: prev!.issues.slice(0, -1), // 마지막 추가된 이슈 제거
          status: prev!.status // 원래 상태로 복원
        }));
      }
    }
  };

  // 출하대기 처리 수량 업데이트 핸들러
  const handleUpdateProcessedQuantity = async (issueId: string, additionalQuantity: number) => {
    try {
      await updateProcessedQuantity(issueId, additionalQuantity);
      
      // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
      if (selectedIssue && selectedIssue.id === issueId) {
        const currentProcessed = selectedIssue.processedQuantity || 0;
        const newProcessedQuantity = currentProcessed + additionalQuantity;
        const totalQuantity = selectedIssue.shippingWaitQuantity || 0;
        
        // 처리완료수량이 전체수량과 동일하거나 넘어가면 해결완료 상태로 변경
        const shouldMarkAsCompleted = newProcessedQuantity >= totalQuantity;
        
        setSelectedIssue({
          ...selectedIssue,
          processedQuantity: newProcessedQuantity,
          status: shouldMarkAsCompleted ? '해결완료' : selectedIssue.status
        });
      }
      
      const currentProcessed = selectedIssue?.processedQuantity || 0;
      const totalQuantity = selectedIssue?.shippingWaitQuantity || 0;
      const newProcessedQuantity = currentProcessed + additionalQuantity;
      
      if (newProcessedQuantity >= totalQuantity) {
        toast.success(`${additionalQuantity}개 처리 완료되었습니다. 모든 수량이 처리되어 해결완료 상태로 변경되었습니다.`);
      } else {
        toast.success(`${additionalQuantity}개 처리 완료되었습니다.`);
      }
    } catch (error) {
      console.error('Error updating processed quantity:', error);
      toast.error('처리 수량 업데이트에 실패했습니다.');
    }
  };

  // 삭제 처리 함수
  const handleDeleteIssue = async () => {
    if (!issueToDelete) return;
    
    // Admin 권한 체크
    if (!isAdmin) {
      toast.error('삭제 권한이 없습니다. 관리자만 삭제할 수 있습니다.');
      setIssueToDelete(null);
      return;
    }
    
    try {
      await deleteQualityIssue(issueToDelete.id);
      toast.success('품질이슈가 성공적으로 삭제되었습니다.');
      setIssueToDelete(null);
      setSelectedIssue(null); // 모달 닫기
    } catch (error) {
      console.error('Error deleting quality issue:', error);
      toast.error('품질이슈 삭제에 실패했습니다.');
    }
  };

  // 삭제 확인 모달 열기
  const handleDeleteClick = (issue: QualityIssue) => {
    setIssueToDelete(issue);
  };

  // Admin 권한 체크
  const isAdmin = userProfile?.role === 'Admin';

  // 상태별 필터링 핸들러
  const handleFilterByStatus = (status: string) => {
    setStatusFilter(status);
  };

  // 새 이슈 등록 핸들러
  const handleOpenFormModal = () => {
    openFormModal();
  };

  // 로딩 상태 - 초기 로딩 시에만 스켈레톤 표시
  if (isLoading && issues.length === 0) {
    return (
      <ProtectedRoute>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </ProtectedRoute>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <ProtectedRoute>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            데이터를 불러오는 중 오류가 발생했습니다: {error.message}
          </AlertDescription>
        </Alert>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col space-y-6">

      {/* 통계 카드 */}
      <div className="flex-shrink-0">
        <QualityIssueStatsCards stats={stats} onFilterByStatus={handleFilterByStatus} currentFilter={statusFilter} />
      </div>

      {/* 탭으로 전체/출하대기 구분 */}
      <div className="flex-1 min-h-0">
        <Tabs defaultValue="all" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">전체 품질이슈</TabsTrigger>
            <TabsTrigger value="shipping-wait">
              출하대기 ({shippingWaitIssues.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="flex-1 min-h-0 mt-4">
            <QualityIssueTable 
              issues={issues}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onSelectIssue={handleSelectIssue}
              onSearchChange={setSearchTerm}
              onOpenFormModal={handleOpenFormModal}
            />
          </TabsContent>
          
          <TabsContent value="shipping-wait" className="flex-1 min-h-0 mt-4">
            <QualityIssueTable 
              issues={filteredShippingWaitIssues}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onSelectIssue={handleSelectIssue}
              onSearchChange={setSearchTerm}
              onOpenFormModal={handleOpenFormModal}
              showShippingWaitColumns={true}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 품질이슈 등록/수정 모달 - 데스크톱: Dialog */}
      {!isMobileOrTablet && (
        <Dialog open={isFormModalOpen} onOpenChange={handleCancelForm}>
          <DialogContent 
            className="max-w-6xl"
            stickyHeader={
              <DialogHeader>
                <DialogTitle>{editingIssue ? '품질이슈 수정' : '신규 품질이슈 등록'}</DialogTitle>
              </DialogHeader>
            }
            stickyFooter={
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCancelForm} disabled={isSaving}>
                  취소
                </Button>
                <Button 
                  type="submit" 
                  form="quality-issue-form"
                  disabled={isSaving} 
                  className="min-w-[120px]"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            }
          >
            <QualityIssueForm
              onSave={handleSaveIssue}
              initialData={editingIssue || undefined}
              isEditMode={!!editingIssue}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 품질이슈 등록/수정 시트 - 모바일/태블릿: Sheet */}
      {isMobileOrTablet && (
        <Sheet open={isFormModalOpen} onOpenChange={handleCancelForm}>
          <SheetContent 
            side="right"
            fullscreen
            animationVariant={isTablet ? 'tablet' : 'default'}
            hideClose
            className="w-full max-w-none overflow-hidden p-0 flex flex-col"
          >
            <div className="h-full flex flex-col max-h-[100dvh]">
              <SheetHeader className="sticky top-0 z-10 bg-background border-b p-4 text-left flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelForm}
                    className="-ml-2"
                    aria-label="뒤로가기"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <SheetTitle className="ml-1">
                    {editingIssue ? '품질이슈 수정' : '신규 품질이슈 등록'}
                  </SheetTitle>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 min-h-0">
                <QualityIssueForm
                  onSave={handleSaveIssue}
                  initialData={editingIssue || undefined}
                  isEditMode={!!editingIssue}
                />
              </div>
              <SheetFooter className="sticky bottom-0 bg-background border-t p-4 flex-row justify-end gap-2 flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button type="button" variant="outline" onClick={handleCancelForm} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button 
                  type="submit" 
                  form="quality-issue-form"
                  disabled={isSaving} 
                  className="min-w-[120px]"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      )}

             {/* 품질이슈 상세 모달 */}
             <QualityIssueDetail
               key={`detail-modal-${selectedIssue?.id || 'empty'}-${isDetailModalOpen}`}
               issue={selectedIssue}
               isOpen={isDetailModalOpen}
               onClose={handleCloseDetailModal}
               canEdit={true}
               canDelete={isAdmin}
               canManage={true}
               canChangeStatus={canChangeStatus(selectedIssue)}
               onAddIssueItem={handleAddIssueItem}
               onDelete={handleDeleteClick}
               onUpdateProcessedQuantity={handleUpdateProcessedQuantity}
               onEdit={openEditModal}
             />

      {/* 삭제 확인 모달 */}
      <AlertDialog open={!!issueToDelete} onOpenChange={() => setIssueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>품질이슈 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{issueToDelete?.productName}&apos; 품질이슈를 정말 삭제하시겠습니까? 
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIssue}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}

export default function QualityIssuesPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </ProtectedRoute>
    }>
      <QualityIssuesPageContent />
    </Suspense>
  );
}
