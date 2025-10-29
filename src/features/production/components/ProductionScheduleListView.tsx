'use client';

import React, { useState, useMemo } from 'react';
import { ProductionSchedule } from '@/features/production/types';
import { useProductionSchedules } from '@/features/production/hooks/useProductionSchedules';
import { usePackagingReports } from '@/features/production/hooks/usePackagingReports';
import { useIsAdmin, useIsManager } from '@/features/auth/hooks';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
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
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PRODUCTION_LINE_OPTIONS } from '@/features/production/constants';
import { toast } from 'sonner';
import { useDeviceType } from '@/shared/hooks/use-device';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';

const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// 라인별 은은한 배경색 반환 함수
const getLineBackgroundColor = (line?: string): string => {
  if (!line) return '';
  
  // 증착1 관련 - 파란색 계열
  if (line.includes('증착1')) {
    return 'bg-blue-100/40 dark:bg-blue-950/20';
  }
  // 증착2 관련 - 보라색 계열
  if (line.includes('증착2')) {
    return 'bg-purple-100/40 dark:bg-purple-950/20';
  }
  // 2코팅 - 청록색 계열
  if (line.includes('2코팅')) {
    return 'bg-cyan-100/40 dark:bg-cyan-950/20';
  }
  // 1코팅 - 초록색 계열
  if (line.includes('1코팅')) {
    return 'bg-green-100/40 dark:bg-green-950/20';
  }
  // 내부코팅 - 노란색 계열
  if (line.includes('내부코팅')) {
    return 'bg-yellow-100/40 dark:bg-yellow-950/20';
  }
  
  // 기본 - 회색 계열
  return 'bg-slate-100/30 dark:bg-slate-900/20';
};

type QuickFilterType = 'yesterday' | 'today' | 'tomorrow' | 'week' | 'nextWeek' | 'all' | 'custom';

interface ProductionScheduleListViewProps {
  onOpenUploadModal: () => void;
}

export const ProductionScheduleListView: React.FC<ProductionScheduleListViewProps> = ({
  onOpenUploadModal
}) => {
  const isAdmin = useIsAdmin();
  const isManager = useIsManager();
  const canManage = isAdmin || isManager;
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobile = isSmartphone || isTablet;

  const {
    schedules,
    loading,
    error,
    getSchedulesByDateRange,
    deleteSchedule,
    deleteSchedulesByDate
  } = useProductionSchedules();

  const [searchTerm, setSearchTerm] = useState('');
  const today = getLocalDateString(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // 생산일보 데이터 가져오기 (상태 매칭용)
  const { reports: packagingReports, getReportsByDateRange } = usePackagingReports();
  
  // 생산일정의 실제 날짜 범위 계산 (비용 최적화)
  const actualScheduleDateRange = useMemo(() => {
    if (schedules.length === 0) {
      return { min: today, max: today };
    }
    
    const dates = schedules.map(s => s.planDate).filter(Boolean);
    const minDate = dates.reduce((min, date) => date < min ? date : min, dates[0]);
    const maxDate = dates.reduce((max, date) => date > max ? date : max, dates[0]);
    
    return { min: minDate, max: maxDate };
  }, [schedules, today]);
  
  // 생산일정의 실제 날짜 범위에 맞춰 생산일보 조회 (비용 최적화)
  React.useEffect(() => {
    if (schedules.length === 0) return;
    
    const { min, max } = actualScheduleDateRange;
    getReportsByDateRange(min, max);
  }, [actualScheduleDateRange, getReportsByDateRange, schedules.length]);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterType>('today');
  const [progressFilter, setProgressFilter] = useState<string>('all');
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [itemToDelete, setItemToDelete] = useState<ProductionSchedule | null>(null);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);

  // 발주번호별 생산일보 상태 매핑
  const reportStatusMap = useMemo(() => {
    const map = new Map<string, '생산대기' | '작업중' | '생산완료'>();
    schedules.forEach(schedule => {
      const orderNumber = schedule.orderNumber;
      if (!orderNumber) {
        return;
      }
      
      // 이 발주번호가 포함된 생산일보 찾기
      const report = packagingReports.find(r => 
        r.orderNumbers && r.orderNumbers.includes(orderNumber)
      );
      
      let status: '생산대기' | '작업중' | '생산완료';
      
      if (!report) {
        status = '생산대기';
      } else if (report.endTime) {
        status = '생산완료';
      } else if (report.startTime) {
        status = '작업중';
      } else {
        status = '생산대기';
      }
      
      map.set(orderNumber, status);
    });
    return map;
  }, [schedules, packagingReports]);

  // 퀵 필터 핸들러
  const handleQuickFilter = (filter: Exclude<QuickFilterType, 'custom'>) => {
    setActiveQuickFilter(filter);
    const todayDate = new Date();
    
    let newStartDate = '';
    let newEndDate = '';

    switch (filter) {
      case 'today':
        newStartDate = newEndDate = getLocalDateString(todayDate);
        break;
      case 'yesterday': {
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(todayDate.getDate() - 1);
        newStartDate = newEndDate = getLocalDateString(yesterdayDate);
        break;
      }
      case 'tomorrow': {
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setDate(todayDate.getDate() + 1);
        newStartDate = newEndDate = getLocalDateString(tomorrowDate);
        break;
      }
      case 'week': {
        const firstDayOfWeek = new Date(todayDate);
        firstDayOfWeek.setDate(todayDate.getDate() - todayDate.getDay());
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        newStartDate = getLocalDateString(firstDayOfWeek);
        newEndDate = getLocalDateString(lastDayOfWeek);
        break;
      }
      case 'nextWeek': {
        const firstDayOfNextWeek = new Date(todayDate);
        firstDayOfNextWeek.setDate(todayDate.getDate() - todayDate.getDay() + 7);
        const lastDayOfNextWeek = new Date(firstDayOfNextWeek);
        lastDayOfNextWeek.setDate(firstDayOfNextWeek.getDate() + 6);
        newStartDate = getLocalDateString(firstDayOfNextWeek);
        newEndDate = getLocalDateString(lastDayOfNextWeek);
        break;
      }
      case 'all':
        newStartDate = '';
        newEndDate = '';
        break;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
    getSchedulesByDateRange(newStartDate, newEndDate);
  };

  // 필터링된 일정
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // 검색어가 있으면 다른 필터 무시하고 검색만 적용 (생산일보와 동일)
      if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const searchFields: (keyof ProductionSchedule)[] = [
          'progress',
          'line',
          'orderNumber',
          'client',
          'productName',
          'postProcess'
        ];

        return searchFields.some(field => {
          const value = schedule[field];
          return value && String(value).toLowerCase().includes(lowerCaseSearchTerm);
        });
      }

      // 검색어가 없을 때만 필터 적용
      // 진행 상태 필터 (동적 상태 사용)
      if (progressFilter !== 'all') {
        const actualStatus = reportStatusMap.get(schedule.orderNumber || '') || '생산대기';
        if (actualStatus !== progressFilter) {
          return false;
        }
      }

      // 라인 필터
      if (lineFilter !== 'all' && schedule.line !== lineFilter) {
        return false;
      }

      return true;
    });
  }, [schedules, searchTerm, progressFilter, lineFilter, reportStatusMap]);

  // 날짜별 그룹핑
  const schedulesByDate = useMemo(() => {
    return filteredSchedules.reduce((acc, schedule) => {
      const date = schedule.planDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(schedule);
      return acc;
    }, {} as Record<string, ProductionSchedule[]>);
  }, [filteredSchedules]);

  // 삭제 확인 핸들러
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteSchedule(itemToDelete.id);
      toast.success('일정이 삭제되었습니다.');
      setItemToDelete(null);
    } catch {
      toast.error('일정 삭제에 실패했습니다.');
    }
  };

  // 날짜별 전체 삭제 확인 핸들러
  const confirmDeleteByDate = async () => {
    if (!dateToDelete) return;
    
    try {
      await deleteSchedulesByDate(dateToDelete);
      toast.success(`${dateToDelete} 날짜의 모든 일정이 삭제되었습니다.`);
      setDateToDelete(null);
    } catch {
      toast.error('일정 삭제에 실패했습니다.');
    }
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">데이터 로드 중 오류가 발생했습니다.</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col space-y-4 pb-6">
      {/* 헤더 */}
      <div className="flex justify-end">
        {canManage && (
          <Button onClick={onOpenUploadModal} className="font-semibold">
            일괄 등록/업데이트
          </Button>
        )}
      </div>

      {/* 필터 영역 - Card로 분리 */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4">
          <Collapsible open={isMobile ? isFilterExpanded : true} onOpenChange={setIsFilterExpanded}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">필터</h3>
              {isMobile && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    {isFilterExpanded ? (
                      <>
                        접기
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        펼치기
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>

            <CollapsibleContent className={isMobile ? "overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up" : undefined}>
              <div className="flex flex-col space-y-3">
                {/* 빠른 필터 버튼들 */}
            <div className="w-full space-y-1">
              <label className="text-sm font-medium text-foreground">빠른 필터</label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { filter: 'yesterday' as const, label: '어제' },
                  { filter: 'today' as const, label: '오늘' },
                  { filter: 'tomorrow' as const, label: '내일' },
                  { filter: 'week' as const, label: '이번 주' },
                  { filter: 'nextWeek' as const, label: '다음주' },
                  { filter: 'all' as const, label: '전체' },
                ].map(({ filter, label }) => (
                  <Button
                    key={filter}
                    onClick={() => handleQuickFilter(filter)}
                    variant={activeQuickFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs px-4 py-1"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

                {/* 날짜 범위 및 검색 */}
                <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
              {/* 조회기간 */}
              <div className="w-full md:w-auto space-y-1">
                <label className="text-sm font-medium text-foreground">조회기간</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setActiveQuickFilter('custom');
                      getSchedulesByDateRange(e.target.value, endDate);
                    }}
                    className="w-full sm:w-auto sm:min-w-[8.75rem]"
                  />
                  <span className="text-muted-foreground">~</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setActiveQuickFilter('custom');
                      getSchedulesByDateRange(startDate, e.target.value);
                    }}
                    min={startDate}
                    className="w-full sm:w-auto sm:min-w-[8.75rem]"
                  />
                </div>
              </div>

              {/* 진행 상태 필터 */}
              <div className="w-full md:w-auto md:min-w-[10rem] space-y-1">
                <label className="text-sm font-medium text-foreground">진행 상태</label>
                <Select
                  value={progressFilter}
                  onValueChange={(value) => setProgressFilter(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="생산완료">생산완료</SelectItem>
                    <SelectItem value="작업중">작업중</SelectItem>
                    <SelectItem value="생산대기">생산대기</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 라인 필터 */}
              <div className="w-full md:w-auto md:min-w-[10rem] space-y-1">
                <label className="text-sm font-medium text-foreground">생산라인</label>
                <Select
                  value={lineFilter}
                  onValueChange={(value) => setLineFilter(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="라인 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {PRODUCTION_LINE_OPTIONS.map(line => (
                      <SelectItem key={line} value={line}>{line}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 검색 */}
              <div className="w-full md:flex-1 space-y-1">
                <label className="text-sm font-medium text-foreground">검색</label>
                <Input
                  type="text"
                  placeholder="진행, 라인, 발주번호, 발주처, 제품명, 후공정 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                </div>
              </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card className="flex-1">
        <CardContent className="p-0">
          {loading && schedules.length === 0 ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error && schedules.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                데이터를 불러오는 중 오류가 발생했습니다
              </AlertDescription>
            </Alert>
          ) : filteredSchedules.length === 0 ? (
            <p className="text-center p-8 text-muted-foreground">표시할 일정이 없습니다.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                  <TableHead className="whitespace-nowrap">계획일자</TableHead>
                  <TableHead className="whitespace-nowrap">진행</TableHead>
                  <TableHead className="whitespace-nowrap">출하</TableHead>
                  <TableHead className="whitespace-nowrap">라인</TableHead>
                  <TableHead className="whitespace-nowrap">사출</TableHead>
                  <TableHead className="whitespace-nowrap">발주번호</TableHead>
                  <TableHead className="whitespace-nowrap">발주처</TableHead>
                  <TableHead className="whitespace-nowrap">제품명</TableHead>
                  <TableHead className="whitespace-nowrap">부속명</TableHead>
                  <TableHead className="whitespace-nowrap text-right">발주</TableHead>
                  <TableHead className="whitespace-nowrap">사양</TableHead>
                  <TableHead className="whitespace-nowrap">후공정</TableHead>
                  <TableHead className="whitespace-nowrap">참고</TableHead>
                  <TableHead className="whitespace-nowrap">담당자</TableHead>
                  <TableHead className="whitespace-nowrap">내/수</TableHead>
                  <TableHead className="whitespace-nowrap">사용지그</TableHead>
                  <TableHead className="whitespace-nowrap">신/재</TableHead>
                  <TableHead className="whitespace-nowrap text-right">부족수량</TableHead>
                  {canManage && <TableHead className="whitespace-nowrap">작업</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(schedulesByDate).map(([date, schedulesForDate]) => (
                  <React.Fragment key={date}>
                    {/* 날짜 헤더 행 */}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={18 + (canManage ? 1 : 0)} className="whitespace-nowrap font-bold text-base py-1">
                        <div className="flex items-center gap-4">
                          <span>
                            {date} ({new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'long' })})
                          </span>
                          {canManage && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDateToDelete(date)}
                            >
                              이 날짜 전체 삭제
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* 일정 데이터 행들 */}
                    {schedulesForDate.map((schedule) => {
                      const actualStatus = reportStatusMap.get(schedule.orderNumber || '') || '생산대기';
                      const statusColorClass = actualStatus === '생산완료'
                        ? 'bg-[hsl(var(--status-completed))] text-[hsl(var(--status-completed-foreground))]'
                        : actualStatus === '작업중'
                        ? 'bg-[hsl(var(--status-inprogress))] text-[hsl(var(--status-inprogress-foreground))]'
                        : 'bg-[hsl(var(--status-pending))] text-[hsl(var(--status-pending-foreground))]';
                      
                      const lineBgColor = getLineBackgroundColor(schedule.line);
                      
                      return (
                        <TableRow key={schedule.id} className={`${lineBgColor} hover:bg-muted/50`}>
                          <TableCell className="whitespace-nowrap py-1">{schedule.planDate}</TableCell>
                          <TableCell className="whitespace-nowrap py-1">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${statusColorClass}`}>
                              {actualStatus}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-1">{schedule.shipping}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.line}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.injection}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.orderNumber}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.client}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.productName}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.partName}</TableCell>
                        <TableCell className="whitespace-nowrap text-right py-1">
                          {schedule.orderQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.specification}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.postProcess}</TableCell>
                        <TableCell className="whitespace-nowrap py-1" title={schedule.remarks}>{schedule.remarks}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.manager}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.domesticOrExport}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.jigUsed}</TableCell>
                        <TableCell className="whitespace-nowrap py-1">{schedule.newOrRe}</TableCell>
                        <TableCell className="whitespace-nowrap text-right py-1">
                          {schedule.shortageQuantity.toLocaleString()}
                        </TableCell>
                        {canManage && (
                          <TableCell className="whitespace-nowrap py-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setItemToDelete(schedule)}
                            >
                              삭제
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        </CardContent>
      </Card>

      {/* 개별 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일정 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{itemToDelete?.planDate}&apos;의 &apos;{itemToDelete?.productName}&apos; 일정을 정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 날짜별 전체 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!dateToDelete} onOpenChange={(open) => !open && setDateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일괄 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{dateToDelete}&apos;의 모든 생산 일정을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteByDate} className="bg-destructive">
              전체 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

