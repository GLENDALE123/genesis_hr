import { useState, useMemo, useEffect } from 'react';
import { PackagingReport, ProductionReportFilter } from '@/features/production/types';
import { getLocalDateString } from '@/shared/utils/dateUtils';

/**
 * 생산일보 필터링, 검색, 요약 계산 훅
 * 
 * @description
 * - 검색어 디바운싱 (300ms)
 * - 날짜/라인/발주처/제품명 필터링
 * - 투입/양품/불량 요약 계산
 * - 증착/코팅 라인별 그룹핑
 * 
 * @param reports - 표시할 보고서 목록
 * @param onDateRangeChange - 날짜 범위 변경 시 호출될 콜백 (선택사항)
 */
export const usePackagingReportFilters = (
  reports: PackagingReport[],
  onDateRangeChange?: (startDate: string, endDate: string) => void
) => {
  // 날짜 유틸리티 (로컬 시간대 사용, 한국 시간 기준)
  const formatDateForInput = (date: Date) => {
    return getLocalDateString(date);
  };

  const today = getLocalDateString(new Date());
  
  // 초기 날짜 범위 계산 (오늘)
  const getInitialDateRange = () => {
    return {
      startDate: today,
      endDate: today
    };
  };

  // 상태 관리
  const [filters, setFilters] = useState<ProductionReportFilter>(getInitialDateRange());

  const [inputValue, setInputValue] = useState(''); // 즉시 반영되는 입력값
  const [searchTerm, setSearchTerm] = useState(''); // 디바운스된 검색어
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | null>('today'); // 기본값: 오늘

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

  // ✅ 필터 및 검색 변경 감지 → 서버 쿼리 전송 (통합)
  useEffect(() => {
    if (!onDateRangeChange) return;

    // 검색어가 있는 경우: 최근 데이터에서 검색 (메모리 사용량 제한)
    if (searchTerm && searchTerm.trim() !== '') {
      // 날짜 범위를 최근 6개월로 제한 (메모리 사용량 감소)
      const todayDate = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(todayDate.getMonth() - 6);
      
      const endDate = formatDateForInput(todayDate);
      const startDate = formatDateForInput(sixMonthsAgo);
      
      onDateRangeChange(startDate, endDate);
    } 
    // 검색어가 없는 경우: 날짜 필터 적용
    else if (filters.startDate && filters.endDate) {
      onDateRangeChange(filters.startDate, filters.endDate);
    }
  }, [searchTerm, filters.startDate, filters.endDate, onDateRangeChange]);

  // 필터링된 보고서 목록
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // ✅ 통합 검색어가 있는 경우: 검색어로만 필터링 (서버에서 전체 데이터 가져옴)
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          report.productName.toLowerCase().includes(searchLower) ||
          report.supplier.toLowerCase().includes(searchLower) ||
          report.productionLine.toLowerCase().includes(searchLower) ||
          (report.orderNumbers && report.orderNumbers.some(order => order.toLowerCase().includes(searchLower))) ||
          (report.partName && report.partName.toLowerCase().includes(searchLower)) ||
          (report.specification && report.specification.toLowerCase().includes(searchLower));
        
        return matchesSearch; // 검색어가 있으면 다른 필터 무시
      }

      // ✅ 검색어가 없을 때만 다른 필터들 적용
      // 날짜 필터 (서버에서 이미 필터링됨, 추가 안전장치)
      if (filters.startDate && report.workDate < filters.startDate) return false;
      if (filters.endDate && report.workDate > filters.endDate) return false;

      // 생산라인 필터
      if (filters.productionLine && report.productionLine !== filters.productionLine) return false;

      // 상태 필터 (endTime과 startTime 기반으로 동적 상태 계산)
      if (filters.status) {
        const statusMapping: Record<string, string> = {
          'completed': '생산완료',
          'in_progress': '작업중',
          'pending': '대기'
        };
        
        const filterStatusKorean = statusMapping[filters.status] || filters.status;
        
        // 실제 상태 계산 로직 (UI와 동일)
        const reportStatus = report.endTime ? '생산완료' : (report.startTime ? '작업중' : '대기');
        if (reportStatus !== filterStatusKorean) return false;
      }

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

  const handleQuickDateFilter = (type: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    // 활성 빠른 필터 설정
    setActiveQuickFilter(type);
    
    let startDate: string;
    let endDate: string = today;
    
    switch (type) {
      case 'today':
        startDate = today;
        break;
      case 'yesterday':
        startDate = getYesterday();
        endDate = getYesterday();
        break;
      case 'week':
        startDate = getWeekAgo();
        break;
      case 'month':
        startDate = getMonthAgo();
        break;
      case 'all':
        // ✅ 전체 기간 조회: 최근 6개월 데이터 조회
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        startDate = formatDateForInput(sixMonthsAgo);
        break;
      default:
        startDate = today;
    }
    
    // 필터 상태 업데이트
    setFilters(prev => ({
      ...prev,
      startDate,
      endDate
    }));
  };

  const clearFilters = () => {
    // 검색어 먼저 초기화 (useEffect 트리거 순서 중요)
    setInputValue(''); 
    setSearchTerm('');
    
    // 빠른 필터를 '오늘'로 설정
    setActiveQuickFilter('today');
    
    // 필터 초기화 (오늘로 설정)
    setFilters(getInitialDateRange());
  };

  const toggleSummary = () => {
    setIsSummaryVisible(!isSummaryVisible);
  };

  return {
    // 상태
    filters,
    searchTerm: inputValue, // UI에는 즉시 반영되는 값 사용
    isSummaryVisible,
    activeQuickFilter, // 활성화된 빠른 필터
    
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

