
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
import { LogisticsTransferModal, LogisticsTransferData } from '../components/LogisticsTransferModal';
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
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { PackagingReportListView } from '../components/PackagingReportListView';
import { PackagingReportForm } from '../components/PackagingReportForm';
import { ProcessConditionsModal } from '../../components/ProcessConditionsModal';
import { MemoModal } from '../../components/MemoModal';
import { ShortageRequestModal } from '../../components/ShortageRequestModal';
import { usePackagingReports } from '../hooks/usePackagingReports';
import { usePackagingReportFilters } from '../hooks/usePackagingReportFilters';
import { 
  useAuthStore
} from '@/features/auth';
import { useCanSyncDailyReports } from '@/features/auth/hooks';
import { PackagingReport, PackagingFormData } from '../types';
import type { ShortageRequest } from '../../types';
import { toast } from 'sonner';
import { getFirebaseErrorMessage } from '@/shared/utils/firebase/firebaseErrorHandler';
import { getUserDisplayName, isAdmin } from '@/shared/utils/user/userUtils';
import { syncDailyReportsToSheets, type SyncDailyReportsResult } from '@/shared/services/google/sheetsService';
import {
  createShortageRequest,
  updateShortageRequest,
  getShortageRequestByReportId,
  getAllShortageRequests
} from '../../services/shortageService';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { parseOrderQuantityInput, sumOrderQuantities } from '../../utils/orderQuantity';

const PackagingDailyReportContainerComponent: React.FC = () => {
  const { user, userProfile } = useAuthStore();
  const canSyncDailyReports = useCanSyncDailyReports();
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobileOrTablet = isSmartphone || isTablet;
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isFullSyncDialogOpen, setIsFullSyncDialogOpen] = useState(false);
  
  // 컴포넌트 마운트 로그
  useEffect(() => {
    return () => {
    };
  }, []);
  
  const [selectedReport, setSelectedReport] = useState<PackagingReport | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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
        // 기존 Map을 직접 업데이트하여 불필요한 재렌더링 방지
        setShortageRequestsMap(prev => {
          const newMap = new Map(prev); // 기존 Map 복사
          requests.forEach(request => {
            newMap.set(request.sourceReportId, request);
          });
          return newMap;
        });
      } catch (error) {
        // 에러 발생 시 무시 (선택적 데이터 로딩)
      }
    };

    fetchShortageRequests();
  }, []);

  const handleCreateReport = useCallback(() => {
    setSelectedReport(null);
    setIsEditMode(false);
    setIsFormOpen(true);
  }, []);

  const handleEditReport = useCallback((report: PackagingReport) => {
    setSelectedReport(report);
    setIsEditMode(true);
    setIsFormOpen(true);
  }, []);

  // 전체 동기화 핸들러
  const handleFullSync = useCallback(async () => {
    if (!canSyncDailyReports) {
      toast.error('동기화 권한이 없습니다.');
      return;
    }

    const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || '';
    const sheetName = import.meta.env.VITE_DAILY_REPORT_SHEET_NAME || '생산일보';

    if (!spreadsheetId) {
      toast.error('스프레드시트 ID가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
      return;
    }

    setIsSyncingSheets(true);
    try {
      const result = await syncDailyReportsToSheets({ 
        spreadsheetId, 
        sheetName,
        forceFullSync: true 
      });

      const summary = `신규 ${result.inserted}건 • 갱신 ${result.updated}건 • 스킵 ${result.skipped}건`;
      toast.success(`"${result.sheetName}" 시트로 전체 동기화되었습니다.`, {
        description: summary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      toast.error(`동기화 실패: ${message}`);
    } finally {
      setIsSyncingSheets(false);
      setIsFullSyncDialogOpen(false);
    }
  }, [canSyncDailyReports]);

  const handleFullSyncClick = useCallback(() => {
    setIsFullSyncDialogOpen(true);
  }, []);

  const handleConfirmFullSync = useCallback(() => {
    handleFullSync();
  }, [handleFullSync]);

  const handleDeleteReport = useCallback((reportId: string) => {
    setDeleteConfirmState({ isOpen: true, reportId });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmState.reportId) return;

    // Admin 권한 체크
    if (!isAdmin(userProfile)) {
      toast.error('삭제 권한이 없습니다. 관리자만 삭제할 수 있습니다.');
      setDeleteConfirmState({ isOpen: false, reportId: null });
      return;
    }

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
  }, [deleteConfirmState.reportId, reports, deleteReport, userProfile]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmState({ isOpen: false, reportId: null });
  }, []);

  const handleFormSubmit = useCallback(async (formData: PackagingFormData) => {
    // 중복 제출 방지
    if (isSaving) {
      return;
    }

    setIsSaving(true);
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

        const parsedOrderQuantities = parseOrderQuantityInput(formData.orderQuantity);
        updateData.orderQuantities = parsedOrderQuantities;

        if (parsedOrderQuantities.length > 0) {
          const totalOrderQuantity = sumOrderQuantities(parsedOrderQuantities);
          updateData.orderQuantity = totalOrderQuantity ?? undefined;
        } else if (formData.orderQuantity) {
          const fallback = parseInt(formData.orderQuantity.replace(/[^0-9]/g, ''), 10);
          updateData.orderQuantity = Number.isNaN(fallback) ? undefined : fallback;
        } else {
          updateData.orderQuantity = undefined;
        }

        // 숫자 필드는 값이 있을 때만 추가 (undefined 방지)
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
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
      
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
      const author = { uid: user.uid, displayName: getUserDisplayName(user, userProfile) };
      
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
      // 기존 Map을 직접 업데이트하여 불필요한 재렌더링 방지
      setShortageRequestsMap(prev => {
        const newMap = new Map(prev); // 기존 Map 복사
        requests.forEach(request => {
          newMap.set(request.sourceReportId, request);
        });
        return newMap;
      });
      
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
          { uid: user.uid, displayName: getUserDisplayName(user, userProfile) }
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

  return (
    <>
      <div className="h-full md:h-full min-h-full flex flex-col space-y-6 pb-6">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-end gap-4 flex-shrink-0">
          {/* 우측: 액션 버튼들 */}
          <div className="flex items-center gap-2">
            {canSyncDailyReports && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullSyncClick}
                disabled={isSyncingSheets}
              >
                {isSyncingSheets ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    전체 동기화
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={handleCreateReport}
            >
              <Plus className="h-4 w-4 mr-2" />
              생산일보 등록
            </Button>
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
        <div className="flex-1 min-h-0 flex flex-col">
          {loading && reports.length === 0 ? (
            <Skeleton className="h-96 w-full" />
          ) : error && reports.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                데이터를 불러오는 중 오류가 발생했습니다: {error.message || '알 수 없는 오류'}
              </AlertDescription>
            </Alert>
          ) : (
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
              canManage={true}
              canUpdate={true}
              canDelete={isAdmin(userProfile)}
            />
          )}
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
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button
                  type="submit"
                  form="packaging-report-form"
                  className="min-w-[120px]"
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? '저장 중...' : (isEditMode ? '수정 저장' : '저장하기')}
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
            className="w-full max-w-none overflow-hidden p-0 flex flex-col"
            fullscreen
            animationVariant={isTablet ? 'tablet' : 'default'}
            hideClose
          >
            <div className="h-full flex flex-col max-h-[100dvh]">
              <SheetHeader className="sticky top-0 z-10 bg-background border-b p-4 text-left flex-shrink-0">
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
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 min-h-0">
                <PackagingReportForm
                  report={selectedReport}
                  isEditMode={isEditMode}
                  onSubmit={handleFormSubmit}
                />
              </div>
              <SheetFooter className="sticky bottom-0 bg-background border-t p-4 flex-row justify-end gap-2 flex-shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFormCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button
                  type="submit"
                  form="packaging-report-form"
                  className="min-w-[120px]"
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? '저장 중...' : (isEditMode ? '수정 저장' : '저장하기')}
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* 공정조건 모달 */}
      <ProcessConditionsModal
        isOpen={processConditionsModalState.isOpen}
        onClose={() => setProcessConditionsModalState({ isOpen: false, report: null })}
        report={processConditionsModalState.report}
        onSave={handleSaveProcessConditions}
        canManage={true}
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

      {/* 전체 동기화 확인 다이얼로그 */}
      <AlertDialog open={isFullSyncDialogOpen} onOpenChange={setIsFullSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전체 동기화</AlertDialogTitle>
            <AlertDialogDescription>
              전체 동기화를 실행하면 구글 스프레드시트의 기존 데이터가 모두 삭제되고,
              Firestore의 모든 생산일보 데이터가 새로 동기화됩니다.
              <br /><br />
              <strong className="text-foreground">주의:</strong> 발주번호가 여러 개인 경우 자동으로 분할되어 각 발주번호별로 별도 행이 생성됩니다.
              <br /><br />
              정말로 전체 동기화를 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsFullSyncDialogOpen(false)}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFullSync} disabled={isSyncingSheets}>
              전체 동기화 실행
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


