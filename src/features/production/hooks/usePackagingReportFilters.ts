import { useState, useMemo, useEffect } from 'react';
import { PackagingReport, ProductionReportFilter } from '@/features/production/types';

/**
 * 생산일보 필터링, 검색, 요약 계산 훅
 * 
 * @description
 * - 검색어 디바운싱 (300ms)
 * - 날짜/라인/발주처/제품명 필터링
 * - 투입/양품/불량 요약 계산
 * - 증착/코팅 라인별 그룹핑
 */
export const usePackagingReportFilters = (reports: PackagingReport[]) => {
  // 날짜 유틸리티
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const today = formatDateForInput(new Date());

  // 상태 관리
  const [filters, setFilters] = useState<ProductionReportFilter>({
    startDate: today,
    endDate: today
  });

  const [inputValue, setInputValue] = useState(''); // 즉시 반영되는 입력값
  const [searchTerm, setSearchTerm] = useState(''); // 디바운스된 검색어
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);

  // 검색어 디바운싱: 입력이 멈춘 후 300ms 뒤에 검색 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(inputValue);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [inputValue]);

  // 날짜 계산 함수들
  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDateForInput(yesterday);
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
    return reports.filter(report => {
      // 통합 검색어 필터 (모든 데이터에서 검색, 필터와 독립적으로 작동)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          report.productName.toLowerCase().includes(searchLower) ||
          report.supplier.toLowerCase().includes(searchLower) ||
          report.productionLine.toLowerCase().includes(searchLower) ||
          (report.orderNumbers && report.orderNumbers.some(order => order.toLowerCase().includes(searchLower))) ||
          (report.partName && report.partName.toLowerCase().includes(searchLower)) ||
          (report.specification && report.specification.toLowerCase().includes(searchLower));
        
        return matchesSearch; // 통합검색어가 있으면 검색 결과만 반환 (필터 무시)
      }

      // 통합검색어가 없을 때만 다른 필터들 적용
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
  }, [reports, filters, searchTerm]);

  // 요약 데이터 계산 (HS-Jig 스타일)
  const summaryData = useMemo(() => {
    if (filteredReports.length === 0) return null;

    const total = { input: 0, good: 0, defect: 0 };
    const byLine = new Map<string, typeof total>();

    // 실제 데이터의 날짜 범위 계산
    const dates = filteredReports.map(report => report.workDate).sort();
    const actualStartDate = dates[0];
    const actualEndDate = dates[dates.length - 1];

    filteredReports.forEach(report => {
      const input = report.inputQuantity || 0;
      const good = report.goodQuantity || 0;
      const defect = report.defectQuantity || 0;
      
      total.input += input;
      total.good += good;
      total.defect += defect;

      if (!byLine.has(report.productionLine)) {
        byLine.set(report.productionLine, { input: 0, good: 0, defect: 0 });
      }
      const lineData = byLine.get(report.productionLine)!;
      lineData.input += input;
      lineData.good += good;
      lineData.defect += defect;
    });

    return {
      total,
      byLine: Array.from(byLine.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ko')),
      actualStartDate,
      actualEndDate
    };
  }, [filteredReports]);

  // 라인별 그룹핑 (HS-Jig 스타일)
  const { byLineGroup1, byLineGroup2 } = useMemo(() => {
    if (!summaryData) return { byLineGroup1: [], byLineGroup2: [] };
    
    const lineGroup1 = ['증착1', '증착1하도', '증착1상도', '증착2', '증착2하도', '증착2상도', '증착1하도(아)', '증착1상도(아)', '증착2하도(아)', '증착2상도(아)'];
    const lineGroup2 = ['2코팅', '1코팅', '내부코팅1호기', '내부코팅2호기', '내부코팅3호기'];
  
    return {
      byLineGroup1: summaryData.byLine.filter(([line]) => lineGroup1.includes(line)),
      byLineGroup2: summaryData.byLine.filter(([line]) => lineGroup2.includes(line))
    };
  }, [summaryData]);

  // 필터 변경 핸들러
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

  const handleQuickDateFilter = (type: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
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
      case 'all':
        // 전체 기간 조회 (필터 제거)
        handleDateRangeFilter('', '');
        break;
    }
  };

  const clearFilters = () => {
    // 초기화 시 오늘 날짜로 다시 설정
    setFilters({
      startDate: today,
      endDate: today
    });
    setInputValue(''); // 입력값 초기화
    setSearchTerm(''); // 검색어 초기화
  };

  const toggleSummary = () => {
    setIsSummaryVisible(!isSummaryVisible);
  };

  return {
    // 상태
    filters,
    searchTerm: inputValue, // UI에는 즉시 반영되는 값 사용
    isSummaryVisible,
    
    // 계산된 데이터
    filteredReports,
    summaryData,
    byLineGroup1,
    byLineGroup2,
    
    // 핸들러
    handleFilterChange,
    handleQuickDateFilter,
    handleSearchChange: setInputValue,
    clearFilters,
    toggleSummary
  };
};

