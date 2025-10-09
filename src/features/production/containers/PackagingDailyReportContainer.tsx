'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
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
import { 
  Plus, 
  Download, 
  Upload
} from 'lucide-react';
import { Spinner } from '@/shared/components/ui/spinner';
import { PackagingReportListView } from '@/features/production/components/PackagingReportListView';
import { PackagingReportForm } from '@/features/production/components/PackagingReportForm';
import { ProcessConditionsModal } from '@/features/production/components/ProcessConditionsModal';
import { MemoModal } from '@/features/production/components/MemoModal';
import { usePackagingReports } from '@/features/production/hooks/usePackagingReports';
import { usePackagingReportFilters } from '@/features/production/hooks/usePackagingReportFilters';
import { 
  canManageData, 
  canCreateData, 
  PermissionSettingsButton,
  usePagePermissions,
  useAuthStore
} from '@/features/auth';
import { PackagingReport, PackagingFormData } from '@/features/production/types';
import { toast } from 'sonner';
import { getFirebaseErrorMessage } from '@/shared/utils/firebaseErrorHandler';

export const PackagingDailyReportContainer: React.FC = () => {
  const { user, userProfile } = useAuthStore();
  
  // 페이지별 권한 확인
  const { 
    canRead, 
    canCreate, 
    canUpdate, 
    canDelete 
  } = usePagePermissions('production-daily-report');
  const [selectedReport, setSelectedReport] = useState<PackagingReport | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 삭제 확인 대화상자 상태
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    reportId: string | null;
  }>({ isOpen: false, reportId: null });
  
  // 공정조건 모달 상태
  const [processConditionsModalState, setProcessConditionsModalState] = useState<{
    isOpen: boolean;
    report: PackagingReport | null;
  }>({ isOpen: false, report: null });
  
  // 메모 모달 상태
  const [memoModalState, setMemoModalState] = useState<{
    isOpen: boolean;
    report: PackagingReport | null;
  }>({ isOpen: false, report: null });

  // 데이터 가져오기
  const {
    reports,
    loading,
    error,
    refetch,
    createReport,
    deleteReport,
    updateReport
  } = usePackagingReports();

  // 필터링 및 검색 로직
  const {
    filteredReports,
    summaryData,
    byLineGroup1,
    byLineGroup2,
    filters,
    searchTerm,
    isSummaryVisible,
    handleFilterChange,
    handleQuickDateFilter,
    handleSearchChange,
    clearFilters,
    toggleSummary
  } = usePackagingReportFilters(reports);

  const handleCreateReport = () => {
    if (!canCreate) {
      toast.error('생산일보를 생성할 권한이 없습니다.');
      return;
    }
    setSelectedReport(null);
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  const handleEditReport = (report: PackagingReport) => {
    if (!canUpdate) {
      toast.error('생산일보를 수정할 권한이 없습니다.');
      return;
    }
    setSelectedReport(report);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleDeleteReport = (reportId: string) => {
    if (!canDelete) {
      toast.error('생산일보를 삭제할 권한이 없습니다.');
      return;
    }
    setDeleteConfirmState({ isOpen: true, reportId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmState.reportId) return;

    // 삭제할 보고서 정보 찾기
    const reportToDelete = reports.find(r => r.id === deleteConfirmState.reportId);
    
    try {
      await deleteReport(deleteConfirmState.reportId);
      
      // 제품 정보 포함한 성공 메시지
      if (reportToDelete) {
        const productInfo = `${reportToDelete.productName}${reportToDelete.partName ? ' ' + reportToDelete.partName : ''}`;
        toast.success(`${productInfo} 생산일보가 삭제되었습니다.`);
      } else {
        toast.success('생산일보가 삭제되었습니다.');
      }
      
      setDeleteConfirmState({ isOpen: false, reportId: null });
    } catch (error) {
      console.error('삭제 실패:', error);
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
      setDeleteConfirmState({ isOpen: false, reportId: null });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmState({ isOpen: false, reportId: null });
  };

  const handleFormSubmit = async (formData: PackagingFormData) => {
    try {
      if (isEditMode && selectedReport) {
        // PackagingFormData를 Partial<PackagingReport>로 변환
        const updateData: any = {
          workDate: formData.workDate,
          productionLine: formData.productionLine,
          orderNumbers: formData.orderNumbers.filter(num => num.trim() !== ''),
          supplier: formData.supplier,
          productName: formData.productName,
          partName: formData.partName,
          specification: formData.specification,
          lineRatio: formData.lineRatio,
          startTime: formData.startTime,
          endTime: formData.endTime,
          memo: formData.memo,
          // PackagedBoxFormData를 PackagedBox로 변환 (quantity: string → number)
          packagedBoxes: formData.packagedBoxes.map(box => ({
            boxNumber: box.boxNumber,
            type: box.type,
            quantity: parseInt(box.quantity) || 0,
            ...(box.reason && { reason: box.reason })
          }))
        };

        // 숫자 필드는 값이 있을 때만 추가 (undefined 방지)
        if (formData.orderQuantity) updateData.orderQuantity = parseInt(formData.orderQuantity);
        if (formData.productionPerMinute) updateData.productionPerMinute = parseInt(formData.productionPerMinute);
        if (formData.uph) updateData.uph = parseInt(formData.uph);
        if (formData.inputQuantity) updateData.inputQuantity = parseInt(formData.inputQuantity);
        if (formData.goodQuantity) updateData.goodQuantity = parseInt(formData.goodQuantity);
        if (formData.defectQuantity) updateData.defectQuantity = parseInt(formData.defectQuantity);
        if (formData.personnelCount) updateData.personnelCount = parseInt(formData.personnelCount);
        if (formData.packagingUnit) updateData.packagingUnit = parseInt(formData.packagingUnit);
        if (formData.boxCount) updateData.boxCount = parseInt(formData.boxCount);
        if (formData.remainder) updateData.remainder = parseInt(formData.remainder);
        
        await updateReport(selectedReport.id, updateData);
      } else {
        // 새로운 보고서 생성
        await createReport(formData);
      }
      
      // 성공 토스트 (제품명과 부속명 포함)
      const productInfo = `${formData.productName}${formData.partName ? ' ' + formData.partName : ''}`;
      const successMessage = isEditMode 
        ? `${productInfo} 생산일보가 수정되었습니다.`
        : `${productInfo} 생산일보가 저장되었습니다.`;
      toast.success(successMessage);
      
      setIsFormOpen(false);
      setSelectedReport(null);
      setIsEditMode(false);
    } catch (error) {
      console.error('저장 실패:', error);
      
      // Firebase 에러 분석
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
      
      // 에러를 throw하지 않아 모달은 열린 상태로 유지
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedReport(null);
    setIsEditMode(false);
  };

  // 공정조건 모달 열기
  const handleOpenProcessConditions = (report: PackagingReport) => {
    setProcessConditionsModalState({ isOpen: true, report });
  };

  // 공정조건 저장
  const handleSaveProcessConditions = async (
    reportId: string, 
    conditions: PackagingReport['processConditions']
  ) => {
    try {
      await updateReport(reportId, { processConditions: conditions });
      setProcessConditionsModalState({ isOpen: false, report: null });
      toast.success('공정조건이 저장되었습니다.');
    } catch (error) {
      console.error('공정조건 저장 실패:', error);
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
    }
  };

  // 메모 모달 열기
  const handleOpenMemo = (report: PackagingReport) => {
    setMemoModalState({ isOpen: true, report });
  };

  // 에러 발생 시 토스트 표시
  useEffect(() => {
    if (error) {
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }, [error]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" label="데이터 로딩 중..." />
      </div>
    );
  }

  // 읽기 권한 확인
  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">접근 권한 없음</h3>
          <p className="text-sm text-muted-foreground mt-2">
            생산일보 페이지에 접근할 권한이 없습니다.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            관리자에게 권한을 요청하세요.
          </p>
        </div>
      </div>
    );
  }

  console.log('🔒 [생산일보] 권한 상태:', { canRead, canCreate, canUpdate, canDelete });

  return (
    <>
      <div className="h-full flex flex-col space-y-6">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
          {/* 좌측: 권한 설정 버튼 (Admin만 표시) */}
          <div>
            <PermissionSettingsButton 
              pageId="production-daily-report" 
              pageName="생산일보" 
            />
          </div>
          
          {/* 우측: 액션 버튼들 */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!canCreate}
              title={canCreate ? '엑셀 업로드' : '권한이 없습니다'}
            >
              <Upload className="h-4 w-4 mr-2" />
              엑셀 업로드
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              title="엑셀 다운로드"
            >
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
            <Button 
              onClick={handleCreateReport} 
              disabled={!canCreate}
              title={canCreate ? '생산일보 등록' : '생성 권한이 없습니다'}
            >
              <Plus className="h-4 w-4 mr-2" />
              생산일보 등록
            </Button>
          </div>
        </div>

        {/* 메인 콘텐츠 - 필터링된 목록 표시 */}
        <div className="flex-1 min-h-0">
          <PackagingReportListView
            reports={filteredReports}
            loading={loading}
            error={error}
            filters={filters}
            searchTerm={searchTerm}
            isSummaryVisible={isSummaryVisible}
            summaryData={summaryData}
            byLineGroup1={byLineGroup1}
            byLineGroup2={byLineGroup2}
            onEdit={handleEditReport}
            onDelete={handleDeleteReport}
            onFilterChange={handleFilterChange}
            onQuickDateFilter={handleQuickDateFilter}
            onSearchChange={handleSearchChange}
            onClearFilters={clearFilters}
            onSummaryToggle={toggleSummary}
            onRefetch={refetch}
            onOpenProcessConditions={handleOpenProcessConditions}
            onOpenMemo={handleOpenMemo}
            canManage={canUpdate || canDelete}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>
      </div>

      {/* 등록/수정 모달 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent 
          className="max-w-7xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            // 외부 클릭 시 모달 닫기 방지 (실수로 닫히는 것 방지)
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? '생산일보 수정' : '생산일보 등록'}
            </DialogTitle>
          </DialogHeader>
          <PackagingReportForm
            report={selectedReport}
            isEditMode={isEditMode}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* 공정조건 모달 */}
      <ProcessConditionsModal
        isOpen={processConditionsModalState.isOpen}
        onClose={() => setProcessConditionsModalState({ isOpen: false, report: null })}
        report={processConditionsModalState.report}
        onSave={handleSaveProcessConditions}
        canManage={canUpdate}
      />

      {/* 메모 모달 */}
      <MemoModal
        isOpen={memoModalState.isOpen}
        onClose={() => setMemoModalState({ isOpen: false, report: null })}
        memo={memoModalState.report?.memo || null}
        reportInfo={memoModalState.report ? {
          productName: memoModalState.report.productName,
          partName: memoModalState.report.partName,
          workDate: memoModalState.report.workDate
        } : undefined}
      />

      {/* 삭제 확인 대화상자 */}
      <AlertDialog open={deleteConfirmState.isOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>생산일보 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 생산일보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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


