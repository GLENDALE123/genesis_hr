import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProductionSchedulesV0 } from '@/features/production/hooks/useProductionSchedulesV0';
import { useSheetsSync } from '@/features/production/hooks/useSheetsSync';
import { usePackagingReports } from '@/features/production/hooks/usePackagingReports';
import { useCanSyncProductionSchedules } from '@/features/auth/hooks';
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
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PRODUCTION_LINE_OPTIONS } from '@/features/production/constants';
import { toast } from 'sonner';
import { useDeviceType } from '@/shared/hooks/use-device';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 라인별 은은한 배경색 반환 함수
const getLineBackgroundColor = (line?: string): string => {
  if (!line) return '';
  
  if (line.includes('증착1')) {
    return 'bg-blue-100/40 dark:bg-blue-950/20';
  }
  if (line.includes('증착2')) {
    return 'bg-purple-100/40 dark:bg-purple-950/20';
  }
  if (line.includes('2코팅')) {
    return 'bg-cyan-100/40 dark:bg-cyan-950/20';
  }
  if (line.includes('1코팅')) {
    return 'bg-green-100/40 dark:bg-green-950/20';
  }
  if (line.includes('내부코팅')) {
    return 'bg-yellow-100/40 dark:bg-yellow-950/20';
  }
  
  return 'bg-slate-100/30 dark:bg-slate-900/20';
};

type QuickFilterType = 'yesterday' | 'today' | 'tomorrow' | 'week' | 'nextWeek' | 'all' | 'custom';

interface ProductionScheduleListViewProps {
  onOpenUploadModal?: () => void;
}

export const ProductionScheduleListView: React.FC<ProductionScheduleListViewProps> = ({
  onOpenUploadModal
}) => {
  const canSyncProductionSchedules = useCanSyncProductionSchedules();
  const { isSmartphone, isTablet } = useDeviceType();
  const isMobile = isSmartphone || isTablet;

  // V0 데이터 조회
  const { data: scheduleData, loading, error, getRowsByDateRange, refetch } = useProductionSchedulesV0();
  
  // Google 스프레드시트 동기화
  const { sync, loading: syncLoading, result: syncResult } = useSheetsSync();

  const [searchTerm, setSearchTerm] = useState('');
  const today = getLocalDateString(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // 생산일보 데이터 가져오기 (상태 매칭용)
  const { reports: packagingReports, getReportsByDateRange } = usePackagingReports();
  
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterType>('today');
  const [progressFilter, setProgressFilter] = useState<string>('all');
  const [lineFilter, setLineFilter] = useState<string>('all');

  // 헤더에서 컬럼 인덱스 찾기
  const getColumnIndex = (headerName: string): number => {
    if (!scheduleData?.headers) return -1;
    const index = scheduleData.headers.findIndex(h => h === headerName || h.toLowerCase() === headerName.toLowerCase());
    
    // 디버깅: 컬럼을 찾지 못한 경우
    if (index === -1 && process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ "${headerName}" 컬럼을 찾을 수 없습니다.`, {
        availableHeaders: scheduleData.headers,
        searchedHeader: headerName,
      });
    }
    
    return index;
  };

  // 날짜 범위로 필터링된 행 가져오기
  const filteredRows = useMemo(() => {
    if (!scheduleData) return [];
    
    const rows = getRowsByDateRange(startDate, endDate);
    
    // 검색어 필터링
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      return rows.filter(row => {
        return row.data.some(cell => 
          String(cell || '').toLowerCase().includes(lowerCaseSearchTerm)
        );
      });
    }

    // 진행 상태 필터
    if (progressFilter !== 'all') {
      const orderNumberIndex = getColumnIndex('발주번호');
      if (orderNumberIndex !== -1) {
        const reportStatusMap = new Map<string, '생산대기' | '작업중' | '생산완료'>();
        
        rows.forEach(row => {
          const orderNumber = String(row.data[orderNumberIndex] || '').trim();
          if (!orderNumber) return;
          
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
          
          reportStatusMap.set(orderNumber, status);
        });

        return rows.filter(row => {
          const orderNumber = String(row.data[orderNumberIndex] || '').trim();
          const actualStatus = reportStatusMap.get(orderNumber) || '생산대기';
          return actualStatus === progressFilter;
        });
      }
    }

    // 라인 필터
    if (lineFilter !== 'all') {
      const lineIndex = getColumnIndex('라인');
      if (lineIndex !== -1) {
        return rows.filter(row => {
          const line = String(row.data[lineIndex] || '').trim();
          return line === lineFilter;
        });
      }
    }

    return rows;
  }, [scheduleData, startDate, endDate, searchTerm, progressFilter, lineFilter, getRowsByDateRange, packagingReports]);

  // 날짜별 그룹핑
  const rowsByDate = useMemo(() => {
    if (!scheduleData) return {};
    
    const planDateIndex = getColumnIndex('계획일자');
    if (planDateIndex === -1) {
      return { '': filteredRows };
    }

    return filteredRows.reduce((acc, row) => {
      let planDate = String(row.data[planDateIndex] || '').trim();
      
      // 날짜 형식 정규화
      if (planDate.includes('/')) {
        const [month, day] = planDate.split('/');
        const currentYear = new Date().getFullYear();
        planDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (planDate.length === 8) {
        planDate = `${planDate.slice(0, 4)}-${planDate.slice(4, 6)}-${planDate.slice(6, 8)}`;
      }

      if (!acc[planDate]) {
        acc[planDate] = [];
      }
      acc[planDate].push(row);
      return acc;
    }, {} as Record<string, typeof filteredRows>);
  }, [filteredRows, scheduleData]);

  // 생산일보 상태 매핑
  const reportStatusMap = useMemo(() => {
    if (!scheduleData) return new Map();
    
    const orderNumberIndex = getColumnIndex('발주번호');
    if (orderNumberIndex === -1) return new Map();

    const map = new Map<string, '생산대기' | '작업중' | '생산완료'>();
    
    filteredRows.forEach(row => {
      const orderNumber = String(row.data[orderNumberIndex] || '').trim();
      if (!orderNumber) return;
      
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
  }, [filteredRows, scheduleData, packagingReports]);

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
  };

  // 동기화 핸들러
  const handleSync = async () => {
    if (!canSyncProductionSchedules) {
      toast.error('동기화 권한이 없습니다.');
      return;
    }
    
    try {
      await sync();
      // 동기화 후 데이터 새로고침
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      // 에러는 useSheetsSync에서 처리
    }
  };

  // 생산일보 데이터 조회 (날짜 범위)
  useEffect(() => {
    if (!scheduleData || filteredRows.length === 0) return;
    
    const planDateIndex = getColumnIndex('계획일자');
    if (planDateIndex === -1) return;

    const dates = filteredRows
      .map(row => {
        let planDate = String(row.data[planDateIndex] || '').trim();
        if (planDate.includes('/')) {
          const [month, day] = planDate.split('/');
          const currentYear = new Date().getFullYear();
          planDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else if (planDate.length === 8) {
          planDate = `${planDate.slice(0, 4)}-${planDate.slice(4, 6)}-${planDate.slice(6, 8)}`;
        }
        return planDate;
      })
      .filter(Boolean);

    if (dates.length === 0) return;

    const minDate = dates.reduce((min, date) => date < min ? date : min, dates[0]);
    const maxDate = dates.reduce((max, date) => date > max ? date : max, dates[0]);

    getReportsByDateRange(minDate, maxDate);
  }, [filteredRows, scheduleData, getReportsByDateRange]);

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

  // Google 스프레드시트 열기 핸들러
  const handleOpenSpreadsheet = () => {
    window.open(
      'https://docs.google.com/spreadsheets/d/1j36qASy8aiOoEaDEkzdjuWtJ2zCx7W-8ord6gheObVc/edit?gid=0#gid=0',
      'production-schedule-spreadsheet', // 고유한 창 이름 (같은 이름의 창이 있으면 포커스만 이동)
      'noopener,noreferrer'
    );
  };

  return (
    <div className="min-h-full flex flex-col space-y-4 pb-6">
      {/* 헤더 - 버튼들 */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleOpenSpreadsheet}
          variant="outline"
          className="font-semibold"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Google 스프레드시트 열기
        </Button>
        {canSyncProductionSchedules && (
          <Button 
            onClick={handleSync} 
            disabled={syncLoading}
            className="font-semibold"
          >
            {syncLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                동기화 중...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Google 스프레드시트 동기화
              </>
            )}
          </Button>
        )}
      </div>

      {/* 동기화 결과 표시 */}
      {syncResult && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            동기화 완료: 추가 {syncResult.added}개, 수정 {syncResult.updated}개, 삭제 {syncResult.deleted}개
          </AlertDescription>
        </Alert>
      )}

      {/* 필터 영역 */}
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
                      placeholder="모든 컬럼 검색..."
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
          {loading && !scheduleData ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !scheduleData ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                동기화된 데이터가 없습니다. 관리자 권한으로 Google 스프레드시트를 동기화해주세요.
              </AlertDescription>
            </Alert>
          ) : filteredRows.length === 0 ? (
            <p className="text-center p-8 text-muted-foreground">표시할 일정이 없습니다.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow>
                    {scheduleData.headers.map((header, index) => (
                      <TableHead 
                        key={index} 
                        className={`whitespace-nowrap px-2 ${index === 0 ? 'rounded-tl-lg' : ''} ${index === scheduleData.headers.length - 1 ? 'rounded-tr-lg' : ''}`}
                      >
                        {header}
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                  {Object.entries(rowsByDate).map(([date, rowsForDate]) => (
                  <React.Fragment key={date}>
                    {/* 날짜 헤더 행 */}
                      {date && (
                    <TableRow className="bg-muted/50">
                          <TableCell 
                            colSpan={scheduleData.headers.length} 
                            className="whitespace-nowrap font-bold text-base py-1 px-2"
                          >
                            {date} ({new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'long' })})
                      </TableCell>
                    </TableRow>
                      )}
                      {/* 데이터 행들 */}
                      {rowsForDate.map((row) => {
                        const orderNumberIndex = getColumnIndex('발주번호');
                        const orderNumber = orderNumberIndex !== -1 
                          ? String(row.data[orderNumberIndex] || '').trim() 
                          : '';
                        const actualStatus = reportStatusMap.get(orderNumber) || '생산대기';
                      const statusColorClass = actualStatus === '생산완료'
                        ? 'bg-[hsl(var(--status-completed))] text-[hsl(var(--status-completed-foreground))]'
                        : actualStatus === '작업중'
                        ? 'bg-[hsl(var(--status-inprogress))] text-[hsl(var(--status-inprogress-foreground))]'
                        : 'bg-[hsl(var(--status-pending))] text-[hsl(var(--status-pending-foreground))]';
                      
                        const lineIndex = getColumnIndex('라인');
                        const line = lineIndex !== -1 ? String(row.data[lineIndex] || '').trim() : '';
                        
                        // 디버깅: 라인 컬럼 찾기 실패 시 로그
                        if (lineIndex === -1 && process.env.NODE_ENV === 'development') {
                          console.warn('⚠️ "라인" 컬럼을 찾을 수 없습니다. 헤더:', scheduleData.headers);
                        }
                        
                        const lineBgColor = getLineBackgroundColor(line);
                        
                        // 헤더 길이에 맞춰 데이터 배열 확장 (새 컬럼 추가 시 빈 값으로 채움)
                        const paddedData = [...row.data];
                        while (paddedData.length < scheduleData.headers.length) {
                          paddedData.push('');
                        }
                      
                      return (
                          <TableRow key={row.rowIndex} className={`${lineBgColor} xl:hover:bg-muted/50`}>
                            {scheduleData.headers.map((header, cellIndex) => {
                              const cell = paddedData[cellIndex];
                              
                              // 진행 컬럼인 경우 상태 표시
                              if (header === '진행' || header === 'progress') {
                                return (
                                  <TableCell key={cellIndex} className="whitespace-nowrap py-1 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${statusColorClass}`}>
                              {actualStatus}
                            </span>
                          </TableCell>
                                );
                              }
                              
                              // 참고, 부족수량 컬럼인 경우 굵게 + 빨간색
                              const isSpecialColumn = header === '참고' || header === '부족수량';
                              const specialColumnClass = isSpecialColumn ? 'font-bold text-red-600 dark:text-red-400' : '';
                              
                              // 숫자 컬럼인 경우 우측 정렬
                              const isNumeric = typeof cell === 'number' || (typeof cell === 'string' && !isNaN(Number(cell)) && cell !== '');
                              return (
                                <TableCell 
                                  key={cellIndex} 
                                  className={`whitespace-nowrap py-1 px-2 ${isNumeric ? 'text-right' : ''} ${specialColumnClass}`}
                                >
                                  {isNumeric && typeof cell === 'number' 
                                    ? cell.toLocaleString() 
                                    : isNumeric && typeof cell === 'string'
                                    ? Number(cell).toLocaleString()
                                    : String(cell || '')}
                          </TableCell>
                              );
                            })}
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
    </div>
  );
};
