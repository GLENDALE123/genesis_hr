'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Package,
  TrendingUp,
  Users,
  RotateCcw,
  CalendarDays
} from 'lucide-react';
import { PackagingReport, ProductionReportFilter } from '@/features/production/types';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';

interface ProductionReportListProps {
  reports: PackagingReport[];
  onEdit: (report: PackagingReport) => void;
  onDelete: (reportId: string) => void;
  loading?: boolean;
}

const productionLineOptions = [
  '증착1', '증착2', '증착1하도', '증착1상도', '증착2하도', '증착2상도', 
  '2코팅', '1코팅', '내부코팅1호기', '내부코팅2호기', '내부코팅3호기',
  '증착1하도(아)', '증착1상도(아)', '증착2하도(아)', '증착2상도(아)'
];

export const ProductionReportList: React.FC<ProductionReportListProps> = ({
  reports,
  onEdit,
  onDelete,
  loading = false
}) => {
  const [filters, setFilters] = useState<ProductionReportFilter>({});
  const [searchTerm, setSearchTerm] = useState('');

  // 더미 데이터 3개 추가
  const dummyReports: PackagingReport[] = [
    {
      id: 'dummy-1',
      createdAt: new Date().toISOString(),
      workDate: '2024-01-15',
      author: {
        uid: 'user1',
        displayName: '김철수'
      },
      productionLine: '증착1',
      orderNumbers: ['T001', 'T002'],
      supplier: 'ABC회사',
      productName: '스마트폰 케이스',
      partName: '후면 커버',
      orderQuantity: 1000,
      specification: '50nm',
      lineRatio: '1:1',
      productionPerMinute: 15,
      uph: 900,
      inputQuantity: 1000,
      goodQuantity: 950,
      defectQuantity: 50,
      personnelCount: 3,
      startTime: '09:00',
      endTime: '17:00',
      packagingUnit: 100,
      boxCount: 10,
      remainder: 50,
      packagedBoxes: [
        { boxNumber: 'B001', type: '정상', quantity: 100 },
        { boxNumber: 'B002', type: '정상', quantity: 100 },
        { boxNumber: 'B003', type: 'B급', quantity: 50 }
      ],
      processConditions: {
        undercoat: { conditions: '100°C', remarks: '정상' },
        topcoat: { conditions: '150°C', remarks: '정상' }
      },
      memo: '정상 작업 완료'
    },
    {
      id: 'dummy-2',
      createdAt: new Date().toISOString(),
      workDate: '2024-01-16',
      author: {
        uid: 'user2',
        displayName: '이영희'
      },
      productionLine: '증착2',
      orderNumbers: ['T003'],
      supplier: 'DEF회사',
      productName: '태블릿 스탠드',
      partName: '지지대',
      orderQuantity: 500,
      specification: '30nm',
      lineRatio: '2:1',
      productionPerMinute: 20,
      uph: 1200,
      inputQuantity: 500,
      goodQuantity: 480,
      defectQuantity: 20,
      personnelCount: 2,
      startTime: '08:30',
      endTime: '16:30',
      packagingUnit: 50,
      boxCount: 10,
      remainder: 30,
      packagedBoxes: [
        { boxNumber: 'B004', type: '정상', quantity: 50 },
        { boxNumber: 'B005', type: '정상', quantity: 50 }
      ],
      processConditions: {
        undercoat: { conditions: '110°C', remarks: '정상' },
        midcoat: { conditions: '120°C', remarks: '정상' },
        topcoat: { conditions: '160°C', remarks: '정상' }
      },
      memo: '고품질 작업 완료'
    },
    {
      id: 'dummy-3',
      createdAt: new Date().toISOString(),
      workDate: '2024-01-17',
      author: {
        uid: 'user3',
        displayName: '박민수'
      },
      productionLine: '내부코팅1호기',
      orderNumbers: ['T004', 'T005', 'T006'],
      supplier: 'GHI회사',
      productName: '노트북 덮개',
      partName: '상판',
      orderQuantity: 200,
      specification: '25nm',
      lineRatio: '1:2',
      productionPerMinute: 10,
      uph: 600,
      inputQuantity: 200,
      goodQuantity: 190,
      defectQuantity: 10,
      personnelCount: 4,
      startTime: '10:00',
      endTime: '18:00',
      packagingUnit: 20,
      boxCount: 10,
      remainder: 10,
      packagedBoxes: [
        { boxNumber: 'B006', type: '정상', quantity: 20 },
        { boxNumber: 'B007', type: '정상', quantity: 20 }
      ],
      processConditions: {
        undercoat: { conditions: '105°C', remarks: '정상' },
        topcoat: { conditions: '155°C', remarks: '정상' }
      },
      memo: '세심한 작업으로 양품률 향상'
    }
  ];

  // 실제 데이터와 더미 데이터 합치기
  const allReports = [...reports, ...dummyReports];

  // 날짜 관련 유틸리티 함수들
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDateForInput(yesterday);
  };

  const getToday = () => {
    return formatDateForInput(new Date());
  };

  const getWeekAgo = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return formatDateForInput(weekAgo);
  };

  const getMonthAgo = () => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return formatDateForInput(monthAgo);
  };

  // 필터링된 보고서 목록
  const filteredReports = useMemo(() => {
    return allReports.filter(report => {
      // 통합 검색어 필터
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          report.productName.toLowerCase().includes(searchLower) ||
          report.supplier.toLowerCase().includes(searchLower) ||
          report.productionLine.toLowerCase().includes(searchLower) ||
          (report.orderNumbers && report.orderNumbers.some(order => order.toLowerCase().includes(searchLower))) ||
          (report.partName && report.partName.toLowerCase().includes(searchLower)) ||
          (report.specification && report.specification.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // 날짜 필터
      if (filters.startDate && report.workDate < filters.startDate) return false;
      if (filters.endDate && report.workDate > filters.endDate) return false;

      // 생산라인 필터
      if (filters.productionLine && report.productionLine !== filters.productionLine) return false;

      // 상태 필터 (기본적으로 모든 보고서는 'completed' 상태로 간주)
      if (filters.status && filters.status !== 'completed') return false;

      // 발주처 필터
      if (filters.supplier && !report.supplier.toLowerCase().includes(filters.supplier.toLowerCase())) return false;

      // 제품명 필터
      if (filters.productName && !report.productName.toLowerCase().includes(filters.productName.toLowerCase())) return false;

      return true;
    });
  }, [allReports, filters, searchTerm]);

  const handleFilterChange = (key: keyof ProductionReportFilter, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleDateRangeFilter = (startDate: string, endDate: string) => {
    setFilters(prev => ({
      ...prev,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    }));
  };

  const handleQuickDateFilter = (type: 'today' | 'yesterday' | 'week' | 'month') => {
    const today = getToday();
    switch (type) {
      case 'today':
        handleDateRangeFilter(today, today);
        break;
      case 'yesterday':
        const yesterday = getYesterday();
        handleDateRangeFilter(yesterday, yesterday);
        break;
      case 'week':
        const weekAgo = getWeekAgo();
        handleDateRangeFilter(weekAgo, today);
        break;
      case 'month':
        const monthAgo = getMonthAgo();
        handleDateRangeFilter(monthAgo, today);
        break;
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

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

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 필터 및 검색 */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4 space-y-3">
          {/* 첫 번째 행: 조회기간, 상태, 생산라인 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* 조회기간 */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                조회기간
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  placeholder="시작일"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-auto flex-1"
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="date"
                  placeholder="종료일"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-auto flex-1"
                />
              </div>
            </div>

            {/* 상태 드롭다운 */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-foreground">상태</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="in_progress">진행중</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 생산라인 드롭다운 */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-sm font-medium text-foreground">생산라인</label>
              <Select
                value={filters.productionLine || 'all'}
                onValueChange={(value) => handleFilterChange('productionLine', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="생산라인 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {productionLineOptions.map(line => (
                    <SelectItem key={line} value={line}>{line}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 두 번째 행: 통합검색, 빠른 필터, 액션 버튼들 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* 통합검색 */}
            <div className="md:col-span-6 space-y-1">
              <label className="text-sm font-medium text-foreground">통합검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="제품명, 발주처, 발주번호 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 빠른 필터 */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-sm font-medium text-foreground">빠른 필터</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center lg:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('today')}
                  className="w-full lg:w-auto"
                >
                  오늘
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('yesterday')}
                  className="w-full lg:w-auto"
                >
                  어제
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('week')}
                  className="w-full lg:w-auto"
                >
                  최근 7일
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('month')}
                  className="w-full lg:w-auto"
                >
                  최근 30일
                </Button>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="md:col-span-2 flex items-center justify-between lg:justify-start lg:gap-3">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                초기화
              </Button>
              
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                총 {filteredReports.length}건
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 보고서 목록 */}
      <div className="flex-1 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="h-full overflow-auto">
          <Table className="w-full text-sm text-left text-gray-500 dark:text-slate-400 min-w-[1800px]">
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[90px]">작업일자</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[70px]">상태</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[90px]">생산라인</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[100px]">발주번호</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[100px]">발주처</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[180px]">제품명/부속명</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[80px]">발주수량</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[70px]">사양</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[70px]">투입</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[70px]">양품</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[70px]">불량</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[60px]">인원</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[80px]">라인비율</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[100px]">시간당생산량</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[80px]">시작시간</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[80px]">종료시간</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[80px]">양품률</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[80px]">작성자</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[120px]">공정조건</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[120px]">메모</TableHead>
                <TableHead className="h-8 px-2 py-1 whitespace-nowrap w-[80px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} className="border-b">
                    {/* 작업일자 */}
                    <TableCell className="h-8 px-3 py-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(report.workDate)}
                      </div>
                    </TableCell>
                    {/* 상태 */}
                    <TableCell className="h-8 px-3 py-1">
                      <Badge variant="outline">완료</Badge>
                    </TableCell>
                    {/* 생산라인 */}
                    <TableCell className="h-8 px-3 py-1">
                      <Badge variant="secondary">{report.productionLine}</Badge>
                    </TableCell>
                    {/* 발주번호 */}
                    <TableCell className="h-8 px-3 py-1">
                      {report.orderNumbers?.join(', ') || '-'}
                    </TableCell>
                    {/* 발주처 */}
                    <TableCell className="h-8 px-3 py-1">{report.supplier}</TableCell>
                    {/* 제품명/부속명 */}
                    <TableCell className="h-8 px-3 py-1">
                      <div className="max-w-[200px] truncate" title={`${report.productName}${report.partName ? '/' + report.partName : ''}`}>
                        {report.productName}{report.partName ? '/' + report.partName : ''}
                      </div>
                    </TableCell>
                    {/* 발주수량 */}
                    <TableCell className="h-8 px-3 py-1">{report.orderQuantity?.toLocaleString() || '-'}</TableCell>
                    {/* 사양 */}
                    <TableCell className="h-8 px-3 py-1">{report.specification || '-'}</TableCell>
                    {/* 투입 */}
                    <TableCell className="h-8 px-3 py-1">{report.inputQuantity?.toLocaleString() || 0}</TableCell>
                    {/* 양품 */}
                    <TableCell className="h-8 px-3 py-1 text-green-600 font-medium">
                      {report.goodQuantity?.toLocaleString() || 0}
                    </TableCell>
                    {/* 불량 */}
                    <TableCell className="h-8 px-3 py-1 text-red-600">
                      {report.defectQuantity?.toLocaleString() || 0}
                    </TableCell>
                    {/* 인원 */}
                    <TableCell className="h-8 px-3 py-1">{report.personnelCount || '-'}</TableCell>
                    {/* 라인비율 */}
                    <TableCell className="h-8 px-3 py-1">{report.lineRatio || '-'}</TableCell>
                    {/* 시간당생산량 */}
                    <TableCell className="h-8 px-3 py-1">{report.uph || report.productionPerMinute ? `${report.uph || report.productionPerMinute}/h` : '-'}</TableCell>
                    {/* 시작시간 */}
                    <TableCell className="h-8 px-3 py-1">{report.startTime || '-'}</TableCell>
                    {/* 종료시간 */}
                    <TableCell className="h-8 px-3 py-1">{report.endTime || '-'}</TableCell>
                    {/* 양품률 */}
                    <TableCell className="h-8 px-3 py-1">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        {calculateYieldRate(
                          report.goodQuantity || 0, 
                          report.inputQuantity || 0
                        )}%
                      </div>
                    </TableCell>
                    {/* 작성자 */}
                    <TableCell className="h-8 px-3 py-1">{report.author.displayName}</TableCell>
                    {/* 공정조건 */}
                    <TableCell className="h-8 px-3 py-1">
                      {report.processConditions ? 
                        Object.entries(report.processConditions).map(([key, value]) => 
                          value ? `${key}: ${value}` : null
                        ).filter(Boolean).join(', ') || '-' 
                        : '-'
                      }
                    </TableCell>
                    {/* 메모 */}
                    <TableCell className="h-8 px-3 py-1">
                      <div className="max-w-[150px] truncate" title={report.memo}>
                        {report.memo || '-'}
                      </div>
                    </TableCell>
                    {/* 작업 */}
                    <TableCell className="h-8 px-3 py-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(report)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredReports.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">생산일보가 없습니다.</p>
            <p className="text-sm text-muted-foreground mt-1">
              새로운 생산일보를 등록해보세요.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
