
/**
 * 지그 요청 필터링 훅 - 최적화된 버전
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { JigRequest } from '../types';
import { JigStatus } from '../types';
import { STATUS_FILTERS } from '../constants';

export const useJigRequestFilters = (requests: JigRequest[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<JigStatus>>(
    new Set(STATUS_FILTERS.filter(status => status !== JigStatus.Completed))
  );
  const [selectedRequesters, setSelectedRequesters] = useState<Set<string>>(new Set());
  const [selectedDestinations, setSelectedDestinations] = useState<Set<string>>(new Set());
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());

  // 디바운스된 검색어 (300ms → 200ms로 단축)
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  
  // 검색어가 있으면 필터 무시, 없으면 필터 적용
  const ignoreFilters = !!debouncedSearchTerm;

  // 요청자 목록 추출 (메모이제이션 개선)
  const requesters = useMemo(() => {
    const uniqueRequesters = new Set<string>();
    requests.forEach(r => {
      if (r.requester) uniqueRequesters.add(r.requester);
    });
    return Array.from(uniqueRequesters).sort();
  }, [requests]);

  // 수신처 목록 추출 (메모이제이션 개선)
  const destinations = useMemo(() => {
    const uniqueDestinations = new Set<string>();
    requests.forEach(r => {
      if (r.destination) uniqueDestinations.add(r.destination);
    });
    return Array.from(uniqueDestinations).sort();
  }, [requests]);

  // 월별 목록 추출 (메모이제이션 개선)
  const months = useMemo(() => {
    const uniqueMonths = new Set<string>();
    requests.forEach(r => {
      try {
        const date = new Date(r.requestDate);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          uniqueMonths.add(`${year}-${month}`);
        }
      } catch (error) {
        console.warn('Invalid date format:', r.requestDate);
      }
    });
    return Array.from(uniqueMonths).sort().reverse();
  }, [requests]);

  // 검색 함수 최적화
  const searchInRequest = useCallback((request: JigRequest, search: string): boolean => {
    const searchLower = search.toLowerCase();
    
    // 빠른 검색을 위한 필드 순서 최적화 (자주 검색되는 필드부터)
    const searchFields = [
      request.id,
      request.itemName,
      request.partName,
      request.itemNumber,
      request.requester,
      request.destination,
      request.requestType,
      request.deliveryDate,
      request.specification,
      request.remarks,
      request.status,
      request.quantity?.toString(),
      request.receivedQuantity?.toString(),
      request.jigHandleLength?.toString(),
    ];

    // 날짜 검색 (비용이 큰 연산이므로 마지막에)
    try {
      const requestDateStr = new Date(request.requestDate).toLocaleString('ko-KR');
      searchFields.push(requestDateStr);
    } catch (error) {
      // 날짜 파싱 실패 시 무시
    }

    // 히스토리 검색 (비용이 큰 연산이므로 마지막에)
    if (request.history?.length > 0) {
      const historyUsers = request.history.map(h => h.user).join(' ');
      searchFields.push(historyUsers);
    }

    return searchFields.some(field => 
      field && field.toLowerCase().includes(searchLower)
    );
  }, []);

  const filteredRequests = useMemo(() => {
    // 필터 무시 옵션이 활성화되면 검색어만 적용
    if (ignoreFilters) {
      if (!debouncedSearchTerm) return requests;
      return requests.filter(request => searchInRequest(request, debouncedSearchTerm));
    }

    // 일반 필터링 (필터 + 검색어) - 체인 방식으로 최적화
    let filtered = requests;

    // 상태 필터 (가장 선택적인 필터부터 적용)
    if (selectedStatuses.size > 0) {
      filtered = filtered.filter(request => selectedStatuses.has(request.status));
    }

    // 요청자 필터
    if (selectedRequesters.size > 0) {
      filtered = filtered.filter(request => selectedRequesters.has(request.requester));
    }

    // 수신처 필터
    if (selectedDestinations.size > 0) {
      filtered = filtered.filter(request => selectedDestinations.has(request.destination));
    }

    // 월별 필터 (날짜 파싱이 비용이 크므로 나중에)
    if (selectedMonths.size > 0) {
      filtered = filtered.filter(request => {
        try {
          const date = new Date(request.requestDate);
          if (isNaN(date.getTime())) return false;
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const requestMonth = `${year}-${month}`;
          return selectedMonths.has(requestMonth);
        } catch (error) {
          return false;
        }
      });
    }

    // 검색어 필터 (마지막에 적용)
    if (debouncedSearchTerm) {
      filtered = filtered.filter(request => searchInRequest(request, debouncedSearchTerm));
    }

    return filtered;
  }, [requests, debouncedSearchTerm, selectedStatuses, selectedRequesters, selectedDestinations, selectedMonths, ignoreFilters, searchInRequest]);

  // 필터 초기화 함수 최적화
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStatuses(new Set(STATUS_FILTERS.filter(status => status !== JigStatus.Completed)));
    setSelectedRequesters(new Set());
    setSelectedDestinations(new Set());
    setSelectedMonths(new Set());
  }, []);

  // 필터 상태 정보
  const filterInfo = useMemo(() => {
    const activeFilters = [
      selectedStatuses.size > 0 && `상태 ${selectedStatuses.size}개`,
      selectedRequesters.size > 0 && `요청자 ${selectedRequesters.size}개`,
      selectedDestinations.size > 0 && `수신처 ${selectedDestinations.size}개`,
      selectedMonths.size > 0 && `월별 ${selectedMonths.size}개`,
      debouncedSearchTerm && `검색: "${debouncedSearchTerm}"`,
    ].filter(Boolean);

    return {
      hasActiveFilters: activeFilters.length > 0,
      activeFilters,
      totalCount: requests.length,
      filteredCount: filteredRequests.length,
    };
  }, [selectedStatuses.size, selectedRequesters.size, selectedDestinations.size, selectedMonths.size, debouncedSearchTerm, requests.length, filteredRequests.length]);

  return {
    // 필터 상태
    searchTerm,
    setSearchTerm,
    selectedStatuses,
    setSelectedStatuses,
    selectedRequesters,
    setSelectedRequesters,
    selectedDestinations,
    setSelectedDestinations,
    selectedMonths,
    setSelectedMonths,
    
    // 필터 옵션
    requesters,
    destinations,
    months,
    
    // 필터링된 결과
    filteredRequests,
    
    // 액션
    resetFilters,
    
    // 필터 정보
    filterInfo,
  };
};
