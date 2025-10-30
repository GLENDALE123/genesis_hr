'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/shared/components/ui/sheet';
import { useDeviceType } from '@/shared/hooks/use-device';
import { LogisticsTransferModal, LogisticsTransferData } from '@/features/production/components/LogisticsTransferModal';
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
  Upload,
  Save,
  X,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { PackagingReportListView } from '@/features/production/components/PackagingReportListView';
import { PackagingReportForm } from '@/features/production/components/PackagingReportForm';
import { ProcessConditionsModal } from '@/features/production/components/ProcessConditionsModal';
import { MemoModal } from '@/features/production/components/MemoModal';
import { ShortageRequestModal } from '@/features/production/components/ShortageRequestModal';
import { usePackagingReports } from '@/features/production/hooks/usePackagingReports';
import { usePackagingReportFilters } from '@/features/production/hooks/usePackagingReportFilters';
import { 
  PermissionSettingsButton,
  usePagePermissions,
  useAuthStore
} from '@/features/auth';
import { PackagingReport, PackagingFormData, ShortageRequest } from '@/features/production/types';
import { toast } from 'sonner';
import { getFirebaseErrorMessage } from '@/shared/utils/firebaseErrorHandler';
import {
  createShortageRequest,
  updateShortageRequest,
  getShortageRequestByReportId,
  getAllShortageRequests
} from '@/features/production/services/shortageService';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

const PackagingDailyReportContainerComponent: React.FC = () => {
  const { user, userProfile } = useAuthStore();
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobileOrTablet = isSmartphone || isTablet;
  
  // 컴포넌트 마운트 로그
  useEffect(() => {
    return () => {
    };
  }, []);
  
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

  // 부족분 신청 모달 상태
  const [shortageModalState, setShortageModalState] = useState<{
    isOpen: boolean;
    report: PackagingReport | null;
    existingRequest: ShortageRequest | null;
  }>({ isOpen: false, report: null, existingRequest: null });
  
  const [isSavingShortage, setIsSavingShortage] = useState(false);
  
  // 부족분 신청 목록 (reportId를 키로 하는 Map)
  const [shortageRequestsMap, setShortageRequestsMap] = useState<Map<string, ShortageRequest>>(new Map());

  // 물류이동 선택 상태
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  
  // 물류이동 모달 상태
  const [isLogisticsModalOpen, setIsLogisticsModalOpen] = useState(false);

  // 데이터 가져오기
  const {
    reports,
    loading,
    error,
    refetch,
    getReportsByDateRange,
    createReport,
    deleteReport,
    updateReport
  } = usePackagingReports();

  // 날짜 범위 변경 시 서버 쿼리 다시 보내기
  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    getReportsByDateRange(startDate, endDate);
  }, [getReportsByDateRange]);

  // 필터링 및 검색 로직
  const {
    filteredReports,
    summaryData,
    byLineGroup1,
    byLineGroup2,
    filters,
    searchTerm,
    isSummaryVisible,
    activeQuickFilter,
    handleFilterChange,
    handleQuickDateFilter,
    handleSearchChange,
    clearFilters,
    toggleSummary
  } = usePackagingReportFilters(reports, handleDateRangeChange);

  // 데이터 로그 (디버깅용)
  useEffect(() => {
  }, [reports, filteredReports, filters]);

  // 부족분 신청 목록 조회 (초기 로드 시 한 번)
  useEffect(() => {
    const fetchShortageRequests = async () => {
      try {
        const requests = await getAllShortageRequests();
        const requestsMap = new Map<string, ShortageRequest>();
        requests.forEach(request => {
          requestsMap.set(request.sourceReportId, request);
        });
        setShortageRequestsMap(requestsMap);
      } catch (error) {
      }
    };

    fetchShortageRequests();
  }, []);

  const handleCreateReport = useCallback(() => {
    if (!canCreate) {
      toast.error('생산일보를 생성할 권한이 없습니다.');
      return;
    }
    setSelectedReport(null);
    setIsEditMode(false);
    setIsFormOpen(true);
  }, [canCreate]);

  const handleEditReport = useCallback((report: PackagingReport) => {
    if (!canUpdate) {
      toast.error('생산일보를 수정할 권한이 없습니다.');
      return;
    }
    setSelectedReport(report);
    setIsEditMode(true);
    setIsFormOpen(true);
  }, [canUpdate]);

  const handleDeleteReport = useCallback((reportId: string) => {
    if (!canDelete) {
      toast.error('생산일보를 삭제할 권한이 없습니다.');
      return;
    }
    setDeleteConfirmState({ isOpen: true, reportId });
  }, [canDelete]);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmState.reportId) return;

    // 삭제할 보고서 정보 찾기
    const reportToDelete = reports.find(r => r.id === deleteConfirmState.reportId);
    
    try {
      await deleteReport(deleteConfirmState.reportId, reportToDelete || undefined);
      
      // 제품 정보 포함한 성공 메시지
      if (reportToDelete) {
        const productInfo = `${reportToDelete.productName}${reportToDelete.partName ? ' ' + reportToDelete.partName : ''}`;
        toast.success(`${productInfo} 생산일보가 삭제되었습니다.`);
      } else {
        toast.success('생산일보가 삭제되었습니다.');
      }
      
      setDeleteConfirmState({ isOpen: false, reportId: null });
    } catch (error) {
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
      setDeleteConfirmState({ isOpen: false, reportId: null });
    }
  }, [deleteConfirmState.reportId, reports, deleteReport]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmState({ isOpen: false, reportId: null });
  }, []);

  const handleFormSubmit = useCallback(async (formData: PackagingFormData) => {
    try {
      if (isEditMode && selectedReport) {
        // PackagingFormData를 Partial<PackagingReport>로 변환
        const updateData: Partial<PackagingReport> = {
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
      
      // Firebase 에러 분석
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
      
      // 에러를 throw하지 않아 모달은 열린 상태로 유지
    }
  }, [isEditMode, selectedReport, updateReport, createReport]);

  const handleFormCancel = useCallback(() => {
    setIsFormOpen(false);
    setSelectedReport(null);
    setIsEditMode(false);
  }, []);

  // 공정조건 모달 열기 (메모이제이션 최적화)
  const handleOpenProcessConditions = useCallback((report: PackagingReport) => {
    setProcessConditionsModalState({ isOpen: true, report });
  }, []);

  // 공정조건 저장 (메모이제이션 최적화)
  const handleSaveProcessConditions = useCallback(async (
    reportId: string, 
    conditions: PackagingReport['processConditions']
  ) => {
    try {
      await updateReport(reportId, { processConditions: conditions });
      setProcessConditionsModalState({ isOpen: false, report: null });
      toast.success('공정조건이 저장되었습니다.');
    } catch (error) {
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
    }
  }, [updateReport]);

  // 메모 모달 열기 (메모이제이션 최적화)
  const handleOpenMemo = useCallback((report: PackagingReport) => {
    setMemoModalState({ isOpen: true, report });
  }, []);

  // 부족분 신청 모달 열기 (메모이제이션 최적화)
  const handleOpenShortageRequest = useCallback(async (report: PackagingReport) => {
    try {
      // 기존 부족분 신청이 있는지 확인
      const existingRequest = await getShortageRequestByReportId(report.id);
      setShortageModalState({ 
        isOpen: true, 
        report, 
        existingRequest 
      });
    } catch (error) {
      console.error('부족분 신청 조회 실패:', error);
      // 조회 실패해도 모달은 열기
      setShortageModalState({ 
        isOpen: true, 
        report, 
        existingRequest: null 
      });
    }
  }, []);

  // 부족분 신청 저장 (메모이제이션 최적화)
  const handleSaveShortageRequest = useCallback(async (
    data: { shortageReason: string; requestedShortageQuantity: number }
  ) => {
    if (!shortageModalState.report || !user || !userProfile) {
      toast.error('사용자 정보가 없습니다.');
      return;
    }

    setIsSavingShortage(true);
    
    try {
      const author = { uid: user.uid, displayName: userProfile.displayName };
      
      if (shortageModalState.existingRequest) {
        // 기존 부족분 신청 수정
        await updateShortageRequest(
          shortageModalState.existingRequest.id,
          data,
          author
        );
        toast.success('부족분 신청이 수정되었습니다.');
      } else {
        // 새로운 부족분 신청 생성
        await createShortageRequest(
          shortageModalState.report,
          data,
          author
        );
        toast.success('부족분 신청이 완료되었습니다.');
      }
      
      // 부족분 신청 목록 다시 조회하여 아이콘 업데이트
      const requests = await getAllShortageRequests();
      const requestsMap = new Map<string, ShortageRequest>();
      requests.forEach(request => {
        requestsMap.set(request.sourceReportId, request);
      });
      setShortageRequestsMap(requestsMap);
      
      // 모달 닫기
      setShortageModalState({ isOpen: false, report: null, existingRequest: null });
    } catch (error) {
      console.error('부족분 신청 저장 실패:', error);
      const errorInfo = getFirebaseErrorMessage(error);
      toast.error(errorInfo.message);
    } finally {
      setIsSavingShortage(false);
    }
  }, [shortageModalState, user, userProfile]);

  // 체크박스 토글 핸들러
  const handleToggleReportSelection = useCallback((reportId: string) => {
    setSelectedReportIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  }, []);

  // 선택 해제 핸들러
  const handleClearSelection = useCallback(() => {
    setSelectedReportIds(new Set());
  }, []);

  // 전체 선택/해제 핸들러
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      // 현재 필터링된 모든 리포트 선택
      const allIds = new Set(filteredReports.map(report => report.id));
      setSelectedReportIds(allIds);
    } else {
      // 전체 해제
      setSelectedReportIds(new Set());
    }
  }, [filteredReports]);

  // 전체 선택 상태 계산
  const isAllSelected = filteredReports.length > 0 && 
    filteredReports.every(report => selectedReportIds.has(report.id));
  
  const isIndeterminate = filteredReports.some(report => selectedReportIds.has(report.id)) && 
    !isAllSelected;

  // 물류이동 리포트 생성 핸들러
  const handleCreateLogisticsReport = useCallback(() => {
    // 선택된 리포트들을 배열로 변환
    const selectedReports = reports.filter(report => selectedReportIds.has(report.id));
    
    if (selectedReports.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }
    
    setIsLogisticsModalOpen(true);
  }, [selectedReportIds, reports]);

  // 물류이동 리포트 확정 핸들러
  const handleConfirmLogisticsTransfer = useCallback((transferData: LogisticsTransferData[]) => {
    if (!user || !userProfile) {
      toast.error('사용자 정보가 없습니다.');
      return;
    }

    const asyncHandler = async () => {
      try {
        const selectedReports = reports.filter(report => selectedReportIds.has(report.id));
        
        // Firestore에 저장
        const { createLogisticsRequest } = await import('@/features/production/services/logisticsService');
        const requestId = await createLogisticsRequest(
          selectedReports,
          transferData,
          { uid: user.uid, displayName: userProfile.displayName }
        );
        
        toast.success(`물류이동 요청이 생성되었습니다. (${requestId})`);
        
        setIsLogisticsModalOpen(false);
        setSelectedReportIds(new Set()); // 선택 초기화
      } catch (error) {
        console.error('물류이동 요청 생성 실패:', error);
        toast.error('물류이동 요청 생성에 실패했습니다.');
      }
    };

    asyncHandler();
  }, [user, userProfile, reports, selectedReportIds]);

  // 에러 발생 시 토스트 표시
  useEffect(() => {
    if (error) {
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }, [error]);

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

  // 로딩 상태 - 초기 로딩 시에만 스켈레톤 표시
  if (loading && reports.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // 에러 상태
  if (error && reports.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          데이터를 불러오는 중 오류가 발생했습니다: {error.message || '알 수 없는 오류'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="min-h-full flex flex-col space-y-6 pb-6">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
          {/* 좌측: 권한 설정 버튼 */}
          <div className="flex items-center gap-2">
            {/* 데스크톱: 텍스트와 아이콘 */}
            <div className="hidden md:block">
              <PermissionSettingsButton 
                pageId="production-daily-report" 
                pageName="생산일보" 
              />
            </div>
            
            {/* 모바일: 아이콘만 */}
            <div className="md:hidden">
              <PermissionSettingsButton 
                pageId="production-daily-report" 
                pageName="생산일보"
                iconOnly={true}
              />
            </div>
          </div>
          
          {/* 우측: 액션 버튼들 */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!canCreate}
              title={canCreate ? '엑셀 업로드' : '권한이 없습니다'}
              className="hidden md:flex"
            >
              <Upload className="h-4 w-4 mr-2" />
              엑셀 업로드
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              title="엑셀 다운로드"
              className="hidden md:flex"
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
            
            {/* 모바일: 엑셀 아이콘만 표시 */}
            <div className="flex items-center gap-2 md:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!canCreate}
                title={canCreate ? '엑셀 업로드' : '권한이 없습니다'}
                className="p-2"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                title="엑셀 다운로드"
                className="p-2"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 선택된 항목 배너 */}
        {selectedReportIds.size > 0 && (
          <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-between animate-fade-in-down">
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              {selectedReportIds.size}개 항목 선택됨
            </span>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleClearSelection} 
                variant="outline"
                size="sm"
                className="bg-slate-200 dark:bg-slate-600"
              >
                선택 해제
              </Button>
              <Button 
                onClick={handleCreateLogisticsReport}
                size="sm"
              >
                선택 항목으로 리포트 생성
              </Button>
            </div>
          </div>
        )}

        {/* 메인 콘텐츠 - 필터링된 목록 표시 */}
        <div>
          <PackagingReportListView
            reports={filteredReports}
            loading={loading}
            error={error}
            filters={filters}
            searchTerm={searchTerm}
            isSummaryVisible={isSummaryVisible}
            activeQuickFilter={activeQuickFilter}
            summaryData={summaryData}
            byLineGroup1={byLineGroup1}
            byLineGroup2={byLineGroup2}
            selectedReportIds={selectedReportIds}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
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
            onOpenShortageRequest={handleOpenShortageRequest}
            onToggleReportSelection={handleToggleReportSelection}
            onSelectAll={handleSelectAll}
            shortageRequestsMap={shortageRequestsMap}
            canManage={canUpdate || canDelete}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>
      </div>

      {/* 등록/수정 모달 - 데스크톱: Dialog */}
      {!isMobileOrTablet && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent 
            className="max-w-7xl max-h-[90vh]"
            stickyHeader={
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? '생산일보 수정' : '생산일보 등록'}
                </DialogTitle>
              </DialogHeader>
            }
            stickyFooter={
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFormCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button
                  type="submit"
                  form="packaging-report-form"
                  className="min-w-[120px]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? '수정 저장' : '저장하기'}
                </Button>
              </div>
            }
            onInteractOutside={(e) => {
              // 외부 클릭 시 모달 닫기 방지 (실수로 닫히는 것 방지)
              e.preventDefault();
            }}
          >
            <PackagingReportForm
              report={selectedReport}
              isEditMode={isEditMode}
              onSubmit={handleFormSubmit}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 등록/수정 시트 - 모바일/태블릿: Sheet */}
      {isMobileOrTablet && (
        <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
          <SheetContent 
            side="right"
            className="w-full max-w-none h-screen overflow-y-auto p-0"
            fullscreen
            animationVariant={isTablet ? 'tablet' : 'default'}
            hideClose
          >
            <SheetHeader className="sticky top-0 z-10 bg-background border-b p-4 text-left">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFormCancel}
                  className="-ml-2"
                  aria-label="뒤로가기"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <SheetTitle className="ml-1">
                  {isEditMode ? '생산일보 수정' : '생산일보 등록'}
                </SheetTitle>
              </div>
            </SheetHeader>
            <div className="p-4 pb-24">
              <PackagingReportForm
                report={selectedReport}
                isEditMode={isEditMode}
                onSubmit={handleFormSubmit}
              />
            </div>
            <SheetFooter className="sticky bottom-0 bg-background border-t p-4 flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleFormCancel}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button
                type="submit"
                form="packaging-report-form"
                className="min-w-[120px]"
              >
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? '수정 저장' : '저장하기'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

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
        memo={(memoModalState.report && memoModalState.report.memo) || null}
        reportInfo={memoModalState.report ? {
          productName: memoModalState.report.productName,
          partName: memoModalState.report.partName,
          workDate: memoModalState.report.workDate
        } : undefined}
      />

      {/* 부족분 신청 모달 */}
      {shortageModalState.report && (
        <ShortageRequestModal
          isOpen={shortageModalState.isOpen}
          onClose={() => setShortageModalState({ isOpen: false, report: null, existingRequest: null })}
          report={shortageModalState.report}
          existingRequest={shortageModalState.existingRequest}
          onSave={handleSaveShortageRequest}
          isSaving={isSavingShortage}
        />
      )}

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

      {/* 물류이동 리포트 생성 모달 */}
      <LogisticsTransferModal
        isOpen={isLogisticsModalOpen}
        onClose={() => setIsLogisticsModalOpen(false)}
        selectedReports={reports.filter(report => selectedReportIds.has(report.id))}
        onConfirm={handleConfirmLogisticsTransfer}
      />
    </>
  );
};

// React.memo로 최적화하여 불필요한 리렌더링 방지
export const PackagingDailyReportContainer = React.memo(PackagingDailyReportContainerComponent);
