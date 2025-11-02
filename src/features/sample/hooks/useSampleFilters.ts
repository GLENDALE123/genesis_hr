/**
 * 샘플 요청 필터링 훅
 * usePackagingReportFilters 패턴 참고
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { SampleRequest, SampleStatus } from '../types';
import { COATING_METHODS } from '../constants';

/**
 * 로컬 날짜 가져오기 (YYYY-MM-DD 형식)
 */
const getLocalDate = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 샘플 요청 필터링 관리 훅
 */
export const useSampleFilters = (requests: SampleRequest[]) => {
  const today = useMemo(() => getLocalDate(new Date()), []);
  const yesterday = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDate(y);
  }, []);

  // 날짜 범위 필터 (기본값: 빈 값)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // 검색어 (디바운스용 분리)
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // 선택된 상태 필터 (기본값: 접수, 진행중, 보류, 반려)
  const [selectedStatuses, setSelectedStatuses] = useState<Set<SampleStatus>>(
    new Set([SampleStatus.Received, SampleStatus.InProgress, SampleStatus.OnHold, SampleStatus.Rejected])
  );
  
  // 선택된 코팅방식 필터 (기본값: 전체)
  const [selectedCoatingMethods, setSelectedCoatingMethods] = useState<Set<string>>(
    new Set(COATING_METHODS)
  );

  // 검색어 디바운싱: 입력이 멈춘 후 300ms 뒤에 검색 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(inputValue);
      setIsSearching(false);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [inputValue]);

  /**
   * 필터링된 요청 목록
   */
  const filteredRequests = useMemo(() => {
    return requests
      // 검색어가 있으면 검색만 적용 (생산일보 패턴)
      .filter(req => {
        if (searchTerm && searchTerm.trim() !== '') {
          const searchLower = searchTerm.toLowerCase();
          return (
            req.id.toLowerCase().includes(searchLower) ||
            req.clientName.toLowerCase().includes(searchLower) ||
            req.productName.toLowerCase().includes(searchLower) ||
            req.requesterName.toLowerCase().includes(searchLower) ||
            req.items.some(item =>
              item.partName.toLowerCase().includes(searchLower) ||
              item.colorSpec.toLowerCase().includes(searchLower)
            )
          );
        }
        return true;
      })
      // 검색어가 없을 때만 다른 필터들 적용
      .filter(req => {
        // 날짜 필터링 (요청일 기준)
        if (!searchTerm && startDate && req.requestDate < startDate) return false;
        if (!searchTerm && endDate && req.requestDate > endDate) return false;
        return true;
      })
      .filter(req => {
        // 상태 필터링
        if (!searchTerm && selectedStatuses.size > 0 && !selectedStatuses.has(req.status)) return false;
        return true;
      })
      .filter(req => {
        // 코팅방식 필터링
        if (!searchTerm && selectedCoatingMethods.size > 0) {
          if (!req.items.some(item => selectedCoatingMethods.has(item.coatingMethod))) return false;
        }
        return true;
      });
  }, [requests, selectedStatuses, selectedCoatingMethods, searchTerm, startDate, endDate]);

  /**
   * 날짜 범위 설정
   */
  const handleStartDateChange = useCallback((date: string) => {
    setStartDate(date);
  }, []);

  const handleEndDateChange = useCallback((date: string) => {
    setEndDate(date);
  }, []);

  /**
   * 빠른 날짜 필터
   */
  const getWeekAgo = useCallback(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return getLocalDate(weekAgo);
  }, []);

  const getMonthAgo = useCallback(() => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return getLocalDate(monthAgo);
  }, []);

  const handleQuickDateFilter = useCallback((type: 'today' | 'yesterday' | 'week' | 'month') => {
    switch (type) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'yesterday':
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case 'week':
        setStartDate(getWeekAgo());
        setEndDate(today);
        break;
      case 'month':
        setStartDate(getMonthAgo());
        setEndDate(today);
        break;
    }
  }, [today, yesterday, getWeekAgo, getMonthAgo]);

  /**
   * 상태 필터 토글
   */
  const toggleStatusFilter = useCallback((status: SampleStatus) => {
    setSelectedStatuses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  }, []);

  /**
   * 코팅방식 필터 토글
   */
  const toggleCoatingMethodFilter = useCallback((method: string) => {
    setSelectedCoatingMethods(prev => {
      const newSet = new Set(prev);
      if (newSet.has(method)) {
        newSet.delete(method);
      } else {
        newSet.add(method);
      }
      return newSet;
    });
  }, []);

  /**
   * 상태 필터 직접 설정 (URL 파라미터용)
   */
  const setStatusFilter = useCallback((status: SampleStatus) => {
    setSelectedStatuses(new Set([status]));
  }, []);

  /**
   * 코팅방식 필터 직접 설정 (URL 파라미터용)
   */
  const setCoatingMethodFilter = useCallback((method: string) => {
    setSelectedCoatingMethods(new Set([method]));
  }, []);

  /**
   * 검색어 설정 (디바운스 적용)
   */
  const handleSearchChange = useCallback((term: string) => {
    setIsSearching(true);
    setInputValue(term);
  }, []);

  /**
   * 모든 필터 초기화
   */
  const resetFilters = useCallback(() => {
    setSelectedStatuses(new Set([SampleStatus.Received, SampleStatus.InProgress, SampleStatus.OnHold, SampleStatus.Rejected]));
    setSelectedCoatingMethods(new Set(COATING_METHODS));
    setSearchTerm('');
    setInputValue('');
    setStartDate('');
    setEndDate('');
  }, []);

  /**
   * 필터가 활성화되어 있는지 확인
   */
  const hasActiveFilters = useMemo(() => {
    const defaultStatuses = new Set([SampleStatus.Received, SampleStatus.InProgress, SampleStatus.OnHold, SampleStatus.Rejected]);
    const defaultCoatings = new Set(COATING_METHODS);
    
    const hasCustomStatus = selectedStatuses.size !== defaultStatuses.size || 
      !Array.from(defaultStatuses).every(s => selectedStatuses.has(s));
    const hasCustomCoating = selectedCoatingMethods.size !== defaultCoatings.size ||
      !Array.from(defaultCoatings).every(c => selectedCoatingMethods.has(c));
    
    return hasCustomStatus || hasCustomCoating || inputValue !== '' || startDate !== '' || endDate !== '';
  }, [selectedStatuses, selectedCoatingMethods, inputValue, startDate, endDate]);

  return {
    // 필터링된 데이터
    filteredRequests,
    
    // 필터 상태
    searchTerm: inputValue, // UI에는 즉시 반영되는 값
    selectedStatuses,
    selectedCoatingMethods,
    hasActiveFilters,
    startDate,
    endDate,
    today,
    yesterday,
    isSearching,
    
    // 필터 설정 함수
    setSearchTerm: handleSearchChange,
    setStartDate: handleStartDateChange,
    setEndDate: handleEndDateChange,
    toggleStatusFilter,
    toggleCoatingMethodFilter,
    setStatusFilter,
    setCoatingMethodFilter,
    handleQuickDateFilter,
    resetFilters
  };
};


