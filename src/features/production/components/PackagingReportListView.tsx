'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { 
  Search, 
  Edit, 
  Trash2, 
  Package,
  RotateCcw,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { PackagingReport, ProductionReportFilter, ShortageRequest } from '@/features/production/types';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { PRODUCTION_LINE_OPTIONS } from '@/features/production/constants';

// 테이블 행 컴포넌트 (메모이제이션)
interface ReportRowProps {
  report: PackagingReport;
  isSelected: boolean;
  hasShortageRequest: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit: (report: PackagingReport) => void;
  onDelete: (reportId: string) => void;
  onToggleSelection: (reportId: string) => void;
  onOpenProcessConditions: (report: PackagingReport) => void;
  onOpenMemo: (report: PackagingReport) => void;
  onOpenShortageRequest: (report: PackagingReport) => void;
}

const ReportRow = React.memo<ReportRowProps>(({
  report,
  isSelected,
  hasShortageRequest,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onToggleSelection,
  onOpenProcessConditions,
  onOpenMemo,
  onOpenShortageRequest
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const calculateYieldRate = (good: number, input: number) => {
    if (!input || input === 0) return 0;
    return ((good / input) * 100).toFixed(1);
  };

  const status = report.endTime ? '생산완료' : (report.startTime ? '작업중' : '대기');
  const statusColorClass = report.endTime 
    ? 'bg-[hsl(var(--status-completed))] text-[hsl(var(--status-completed-foreground))]'
    : report.startTime 
    ? 'bg-[hsl(var(--status-inprogress))] text-[hsl(var(--status-inprogress-foreground))]'
    : 'bg-[hsl(var(--status-requested))] text-[hsl(var(--status-requested-foreground))]';

  return (
    <TableRow key={report.id} className="border-b">
      {/* 작업일자 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">
        {formatDate(report.workDate)}
      </TableCell>
      {/* 상태 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusColorClass}`}>
          {status}
        </span>
      </TableCell>
      {/* 생산라인 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">
        <Badge variant="secondary">{report.productionLine}</Badge>
      </TableCell>
      {/* 발주번호 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">
        {(report.orderNumbers && report.orderNumbers.join(', ')) || '-'}
      </TableCell>
      {/* 발주처 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">{report.supplier}</TableCell>
      {/* 제품명/부속명 */}
      <TableCell className="px-2 py-3 whitespace-nowrap font-semibold">
        {report.productName}{report.partName ? '/' + report.partName : ''}
      </TableCell>
      {/* 발주수량 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-right">{(report.orderQuantity && report.orderQuantity.toLocaleString()) || '-'}</TableCell>
      {/* 사양 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">{report.specification || '-'}</TableCell>
      {/* 투입 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-right">{(report.inputQuantity && report.inputQuantity.toLocaleString()) || 0}</TableCell>
      {/* 양품 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-green-600 font-medium text-right">
        {(report.goodQuantity && report.goodQuantity.toLocaleString()) || 0}
      </TableCell>
      {/* 불량 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-red-600 text-right">
        {(report.defectQuantity && report.defectQuantity.toLocaleString()) || 0}
      </TableCell>
      {/* 인원 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-right">{report.personnelCount || '-'}</TableCell>
      {/* 라인비율 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">{report.lineRatio || '-'}</TableCell>
      {/* 시간당생산량 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-right">
        {report.uph || report.productionPerMinute ? (report.uph || report.productionPerMinute)!.toLocaleString() : '-'}
      </TableCell>
      {/* 시작시간 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">{report.startTime || '-'}</TableCell>
      {/* 종료시간 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">{report.endTime || '-'}</TableCell>
      {/* 양품률 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-right">
        {calculateYieldRate(report.goodQuantity || 0, report.inputQuantity || 0)}%
      </TableCell>
      {/* 작성자 */}
      <TableCell className="px-2 py-3 whitespace-nowrap">{report.author.displayName}</TableCell>
      {/* 공정조건 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenProcessConditions(report)}
          className="w-full text-center p-1 h-auto hover:bg-accent transition-colors"
        >
          {report.processConditions && Object.values(report.processConditions).some(v => (v && v.conditions) || (v && v.remarks)) ? (
            <span className="font-bold text-green-500 text-base">O</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </Button>
      </TableCell>
      {/* 메모 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-center">
        {report.memo ? (
          <Button
            variant="link"
            size="sm"
            onClick={() => onOpenMemo(report)}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline p-0 h-auto"
          >
            메모
          </Button>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      {/* 부족분 신청 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenShortageRequest(report)}
          className={hasShortageRequest 
            ? "text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/20" 
            : "text-muted-foreground hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10"
          }
          title={hasShortageRequest ? "부족분 신청됨 (클릭하여 수정)" : "부족분 신청"}
        >
          {hasShortageRequest ? (
            <AlertTriangle className="h-4 w-4 fill-orange-600 dark:fill-orange-400" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
      {/* 작업 */}
      <TableCell className="h-8 px-3 py-1 whitespace-nowrap text-right">
        {(canUpdate || canDelete) ? (
          <div className="flex items-center justify-end gap-1">
            {canUpdate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(report)}
                title="생산일보 수정"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(report.id)}
                title="생산일보 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
      {/* 물류이동 체크박스 */}
      <TableCell className="px-2 py-3 whitespace-nowrap text-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(report.id)}
        />
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // isSelected, hasShortageRequest, report가 변경될 때만 리렌더링
  return prevProps.isSelected === nextProps.isSelected && 
         prevProps.hasShortageRequest === nextProps.hasShortageRequest &&
         prevProps.report === nextProps.report;
});

ReportRow.displayName = 'ReportRow';

interface PackagingReportListViewProps {
  reports: PackagingReport[];
  loading: boolean;
  error: Error | null;
  filters: ProductionReportFilter;
  searchTerm: string;
  isSummaryVisible: boolean;
  activeQuickFilter: 'today' | 'yesterday' | 'week' | 'month' | 'all' | null;
  summaryData: {
    total: { input: number; good: number; defect: number };
    byLine: Array<[string, { input: number; good: number; defect: number }]>;
    actualStartDate: string;
    actualEndDate: string;
  } | null;
  byLineGroup1: Array<[string, { input: number; good: number; defect: number }]>;
  byLineGroup2: Array<[string, { input: number; good: number; defect: number }]>;
  selectedReportIds: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  shortageRequestsMap: Map<string, ShortageRequest>;
  onEdit: (report: PackagingReport) => void;
  onDelete: (reportId: string) => void;
  onFilterChange: (key: keyof ProductionReportFilter, value: string) => void;
  onQuickDateFilter: (type: 'today' | 'yesterday' | 'week' | 'month' | 'all') => void;
  onSearchChange: (term: string) => void;
  onClearFilters: () => void;
  onSummaryToggle: () => void;
  onRefetch: () => void;
  onOpenProcessConditions: (report: PackagingReport) => void;
  onOpenMemo: (report: PackagingReport) => void;
  onOpenShortageRequest: (report: PackagingReport) => void;
  onToggleReportSelection: (reportId: string) => void;
  onSelectAll: (checked: boolean) => void;
  canManage: boolean;  // 수정/삭제 권한 (deprecated)
  canUpdate?: boolean;  // 수정 권한
  canDelete?: boolean;  // 삭제 권한
}

const PackagingReportListViewComponent: React.FC<PackagingReportListViewProps> = ({
  reports,
  loading,
  error,
  filters,
  searchTerm,
  isSummaryVisible,
  activeQuickFilter,
  summaryData,
  byLineGroup1,
  byLineGroup2,
  selectedReportIds,
  isAllSelected,
  isIndeterminate,
  shortageRequestsMap,
  onEdit,
  onDelete,
  onFilterChange,
  onQuickDateFilter,
  onSearchChange,
  onClearFilters,
  onSummaryToggle,
  onRefetch,
  onOpenProcessConditions,
  onOpenMemo,
  onOpenShortageRequest,
  onToggleReportSelection,
  onSelectAll,
  canManage,
  canUpdate,
  canDelete
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const calculateYieldRate = (good: number, input: number) => {
    if (!input || input === 0) return 0;
    return ((good / input) * 100).toFixed(1);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="flex items-center justify-center min-h-[24rem]">
        <CardContent className="text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <Package className="h-12 w-12 text-destructive" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-2">
                데이터를 불러올 수 없습니다
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                {error.message || '데이터를 불러오는 중 오류가 발생했습니다.'}
              </p>
              <p className="text-xs text-muted-foreground">
                문제가 계속되면 관리자에게 문의하세요.
              </p>
            </div>
            <Button onClick={onRefetch} variant="default">
              <RotateCcw className="h-4 w-4 mr-2" />
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 필터 및 검색 */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4">
          {/* 완전 반응형 필터 섹션 - 1700px 이하에서는 2행으로 배치 */}
          <div className="space-y-4">
            {/* 첫 번째 행: 조회기간 + 빠른 필터 */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              {/* 조회기간 */}
              <div className="w-full lg:w-auto space-y-1">
                <label className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  조회기간
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    placeholder="시작일"
                    value={filters.startDate || ''}
                    onChange={(e) => onFilterChange('startDate', e.target.value)}
                    className="w-full lg:w-auto lg:min-w-[8.75rem]"
                  />
                  <span className="text-muted-foreground">~</span>
                  <Input
                    type="date"
                    placeholder="종료일"
                    value={filters.endDate || ''}
                    onChange={(e) => onFilterChange('endDate', e.target.value)}
                    className="w-full lg:w-auto lg:min-w-[8.75rem]"
                  />
                </div>
              </div>

              {/* 빠른 필터 */}
              <div className="w-full lg:w-auto space-y-1">
                <label className="text-sm font-medium text-foreground">빠른 필터</label>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    variant={activeQuickFilter === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onQuickDateFilter('today')}
                    className="text-xs px-4 py-1"
                  >
                    오늘
                  </Button>
                  <Button
                    variant={activeQuickFilter === 'yesterday' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onQuickDateFilter('yesterday')}
                    className="text-xs px-4 py-1"
                  >
                    어제
                  </Button>
                  <Button
                    variant={activeQuickFilter === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onQuickDateFilter('week')}
                    className="text-xs px-4 py-1"
                  >
                    최근 7일
                  </Button>
                  <Button
                    variant={activeQuickFilter === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onQuickDateFilter('month')}
                    className="text-xs px-4 py-1"
                  >
                    최근 30일
                  </Button>
                  <Button
                    variant={activeQuickFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onQuickDateFilter('all')}
                    className="text-xs px-4 py-1"
                  >
                    전체
                  </Button>
                </div>
              </div>
            </div>

            {/* 두 번째 행: 상태, 생산라인, 통합검색, 초기화 버튼 */}
            <div className="flex flex-col 3xl:flex-row gap-4 items-start 3xl:items-end">
              {/* 상태 드롭다운 */}
              <div className="w-full lg:w-auto lg:min-w-[10rem] space-y-1">
                <label className="text-sm font-medium text-foreground">상태</label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => onFilterChange('status', value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="completed">생산완료</SelectItem>
                    <SelectItem value="in_progress">작업중</SelectItem>
                    <SelectItem value="pending">대기</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 생산라인 드롭다운 */}
              <div className="w-full lg:w-auto lg:min-w-[10rem] space-y-1">
                <label className="text-sm font-medium text-foreground">생산라인</label>
                <Select
                  value={filters.productionLine || 'all'}
                  onValueChange={(value) => onFilterChange('productionLine', value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="생산라인 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {PRODUCTION_LINE_OPTIONS.map(line => (
                      <SelectItem key={line} value={line}>{line}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 통합검색 */}
              <div className="w-full lg:flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">통합검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="제품명, 발주처, 발주번호 검색..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 초기화 버튼 + 총 건수 */}
              <div className="w-full lg:w-auto flex items-center justify-between lg:justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClearFilters}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  초기화
                </Button>
                
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  총 {reports.length}건
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요약 섹션 - HS-Jig 스타일 (Collapsible) */}
      {summaryData && (
        <Card className="flex-shrink-0">
          <CardContent className="p-4">
            {/* 요약 헤더 (클릭 가능) */}
            <div 
              className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md transition-colors"
              onClick={onSummaryToggle}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  생산 요약
                  {summaryData && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({formatDate(summaryData.actualStartDate)} ~ {formatDate(summaryData.actualEndDate)})
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">총 투입: <span className="font-semibold">{summaryData.total.input.toLocaleString()}</span></span>
                  <span className="font-medium">총 양품: <span className="font-semibold">{summaryData.total.good.toLocaleString()}</span></span>
                  <span className="font-medium text-red-500">총 불량: <span className="font-semibold">{summaryData.total.defect.toLocaleString()}</span></span>
                  <span className="font-medium">총 양품률: <span className="font-semibold">{summaryData.total.input > 0 ? ((summaryData.total.good / summaryData.total.input) * 100).toFixed(1) + '%' : 'N/A'}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSummaryVisible ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* 요약 상세 내용 (Collapsible) */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isSummaryVisible ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                  <h4 className="font-semibold mb-2 text-center text-sm">2층 증착</h4>
                  {byLineGroup1.map(([line, data]) => (
                    <div key={line} className="grid grid-cols-4 gap-2 border-b dark:border-slate-600 last:border-b-0 py-1">
                      <span>{line}</span>
                      <span className="text-right">{data.input.toLocaleString()}</span>
                      <span className="text-right">{data.good.toLocaleString()}</span>
                      <span className="text-right text-red-500">{data.defect.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                  <h4 className="font-semibold mb-2 text-center text-sm">1층 코팅</h4>
                  {byLineGroup2.map(([line, data]) => (
                    <div key={line} className="grid grid-cols-4 gap-2 border-b dark:border-slate-600 last:border-b-0 py-1">
                      <span>{line}</span>
                      <span className="text-right">{data.input.toLocaleString()}</span>
                      <span className="text-right">{data.good.toLocaleString()}</span>
                      <span className="text-right text-red-500">{data.defect.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 보고서 목록 */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex flex-col flex-1 min-h-0">
          {reports.length === 0 ? (
            /* 빈 상태 - 중앙 정렬 */
            <div className="flex flex-col items-center justify-center gap-4 flex-1 min-h-[24rem]">
              <div className="rounded-full bg-muted/50 p-4">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-muted-foreground font-medium">생산일보가 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  새로운 생산일보를 등록해보세요.
                </p>
              </div>
            </div>
          ) : (
            /* 스크롤 가능한 테이블 전체 - 높이 고정 */
            <div className="flex-1 overflow-auto h-[600px]">
              <Table className="w-full text-sm text-left text-gray-500 dark:text-slate-400 min-w-[2000px]">
                {/* 고정 헤더 */}
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="border-b bg-background">
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background rounded-tl-lg">작업일자</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">상태</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">생산라인</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">발주번호</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">발주처</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">제품명/부속명</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background text-right">발주수량</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background">사양</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background text-right">투입</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background text-right">양품</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background text-right">불량</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background text-right">인원</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background">라인비율</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background text-right">시간당생산량</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background">시작시간</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background">종료시간</TableHead>
                     <TableHead className="px-2 py-3 whitespace-nowrap bg-background text-right">양품률</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">작성자</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">공정조건</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">메모</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">부족분신청</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background">작업</TableHead>
                    <TableHead className="px-2 py-3 whitespace-nowrap bg-background rounded-tr-lg">
                      <div className="flex items-center justify-center gap-2">
                      <span>물류이동</span>
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={onSelectAll}
                          aria-label="전체 선택"
                          className={isIndeterminate ? 'data-[state=checked]:bg-primary/50' : ''}
                        />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      isSelected={selectedReportIds.has(report.id)}
                      hasShortageRequest={shortageRequestsMap.has(report.id)}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleSelection={onToggleReportSelection}
                      onOpenProcessConditions={onOpenProcessConditions}
                      onOpenMemo={onOpenMemo}
                      onOpenShortageRequest={onOpenShortageRequest}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// React.memo로 최적화하여 불필요한 리렌더링 방지
export const PackagingReportListView = React.memo(PackagingReportListViewComponent);
