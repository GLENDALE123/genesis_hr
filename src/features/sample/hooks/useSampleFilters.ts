/**
 * 샘플 요청 필터링 훅
 * usePackagingReportFilters 패턴 참고
 */

import { useState, useMemo, useCallback } from 'react';
import { SampleRequest, SampleStatus } from '../types';

/**
 * 샘플 요청 필터링 관리 훅
 */
export const useSampleFilters = (requests: SampleRequest[]) => {
  // 검색어
  const [searchTerm, setSearchTerm] = useState('');
  
  // 선택된 상태 필터
  const [selectedStatuses, setSelectedStatuses] = useState<Set<SampleStatus>>(new Set());
  
  // 선택된 코팅방식 필터
  const [selectedCoatingMethods, setSelectedCoatingMethods] = useState<Set<string>>(new Set());

  /**
   * 필터링된 요청 목록
   */
  const filteredRequests = useMemo(() => {
    return requests
      // 상태 필터링
      .filter(req => {
        if (selectedStatuses.size === 0) return true;
        return selectedStatuses.has(req.status);
      })
      // 코팅방식 필터링
      .filter(req => {
        if (selectedCoatingMethods.size === 0) return true;
        return req.items.some(item => selectedCoatingMethods.has(item.coatingMethod));
      })
      // 검색어 필터링
      .filter(req => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        
        return (
          req.id.toLowerCase().includes(search) ||
          req.clientName.toLowerCase().includes(search) ||
          req.productName.toLowerCase().includes(search) ||
          req.requesterName.toLowerCase().includes(search) ||
          req.items.some(item =>
            item.partName.toLowerCase().includes(search) ||
            item.colorSpec.toLowerCase().includes(search)
          )
        );
      });
  }, [requests, selectedStatuses, selectedCoatingMethods, searchTerm]);

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
   * 빠른 필터 적용 (현황 보드 셀 클릭 시)
   */
  const applyQuickFilter = useCallback((status: SampleStatus, coatingMethod: string) => {
    setSelectedStatuses(new Set([status]));
    setSelectedCoatingMethods(new Set([coatingMethod]));
    setSearchTerm('');
  }, []);

  /**
   * 모든 필터 초기화
   */
  const resetFilters = useCallback(() => {
    setSelectedStatuses(new Set());
    setSelectedCoatingMethods(new Set());
    setSearchTerm('');
  }, []);

  /**
   * 필터가 활성화되어 있는지 확인
   */
  const hasActiveFilters = useMemo(() => {
    return selectedStatuses.size > 0 || selectedCoatingMethods.size > 0 || searchTerm !== '';
  }, [selectedStatuses, selectedCoatingMethods, searchTerm]);

  return {
    // 필터링된 데이터
    filteredRequests,
    
    // 필터 상태
    searchTerm,
    selectedStatuses,
    selectedCoatingMethods,
    hasActiveFilters,
    
    // 필터 설정 함수
    setSearchTerm,
    toggleStatusFilter,
    toggleCoatingMethodFilter,
    applyQuickFilter,
    resetFilters
  };
};


