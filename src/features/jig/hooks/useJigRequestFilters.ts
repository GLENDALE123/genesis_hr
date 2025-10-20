'use client';

/**
 * 지그 요청 필터링 훅
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { JigRequest, JigStatus } from '../types';

export const useJigRequestFilters = (requests: JigRequest[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<JigStatus>>(new Set());
  const [selectedRequesters, setSelectedRequesters] = useState<Set<string>>(new Set());
  const [selectedDestinations, setSelectedDestinations] = useState<Set<string>>(new Set());
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());

  // 디바운스된 검색어
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // 검색어가 있으면 필터 무시, 없으면 필터 적용
  const ignoreFilters = !!debouncedSearchTerm;

  // 요청자 목록 추출
  const requesters = useMemo(() => {
    const uniqueRequesters = new Set(requests.map(r => r.requester));
    return Array.from(uniqueRequesters).sort();
  }, [requests]);

  // 수신처 목록 추출
  const destinations = useMemo(() => {
    const uniqueDestinations = new Set(requests.map(r => r.destination));
    return Array.from(uniqueDestinations).sort();
  }, [requests]);

  // 월별 목록 추출
  const months = useMemo(() => {
    const uniqueMonths = new Set(
      requests.map(r => {
        const date = new Date(r.requestDate);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
      })
    );
    return Array.from(uniqueMonths).sort().reverse();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    // 필터 무시 옵션이 활성화되면 검색어만 적용
    if (ignoreFilters) {
      if (!debouncedSearchTerm) return requests;
      
      const search = debouncedSearchTerm.toLowerCase();
      return requests.filter(request => (
        request.id.toLowerCase().includes(search) ||
        request.requestType.toLowerCase().includes(search) ||
        request.requester.toLowerCase().includes(search) ||
        request.destination.toLowerCase().includes(search) ||
        request.deliveryDate.toLowerCase().includes(search) ||
        request.itemName.toLowerCase().includes(search) ||
        request.partName.toLowerCase().includes(search) ||
        request.itemNumber.toLowerCase().includes(search) ||
        request.jigHandleLength?.toString().includes(search) ||
        request.specification.toLowerCase().includes(search) ||
        request.quantity.toString().includes(search) ||
        request.receivedQuantity.toString().includes(search) ||
        request.remarks.toLowerCase().includes(search) ||
        request.status.toLowerCase().includes(search) ||
        new Date(request.requestDate).toLocaleString('ko-KR').toLowerCase().includes(search) ||
        request.history.some(h => h.user.toLowerCase().includes(search))
      ));
    }

    // 일반 필터링 (필터 + 검색어)
    return requests
      .filter(request => selectedStatuses.size === 0 || selectedStatuses.has(request.status))
      .filter(request => selectedRequesters.size === 0 || selectedRequesters.has(request.requester))
      .filter(request => selectedDestinations.size === 0 || selectedDestinations.has(request.destination))
      .filter(request => {
        if (selectedMonths.size === 0) return true;
        const date = new Date(request.requestDate);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const requestMonth = `${year}-${month}`;
        return selectedMonths.has(requestMonth);
      })
      .filter(request => {
        if (!debouncedSearchTerm) return true;
        const search = debouncedSearchTerm.toLowerCase();
        
        return (
          request.id.toLowerCase().includes(search) ||
          request.requestType.toLowerCase().includes(search) ||
          request.requester.toLowerCase().includes(search) ||
          request.destination.toLowerCase().includes(search) ||
          request.deliveryDate.toLowerCase().includes(search) ||
          request.itemName.toLowerCase().includes(search) ||
          request.partName.toLowerCase().includes(search) ||
          request.itemNumber.toLowerCase().includes(search) ||
          request.jigHandleLength?.toString().includes(search) ||
          request.specification.toLowerCase().includes(search) ||
          request.quantity.toString().includes(search) ||
          request.receivedQuantity.toString().includes(search) ||
          request.remarks.toLowerCase().includes(search) ||
          request.status.toLowerCase().includes(search) ||
          new Date(request.requestDate).toLocaleString('ko-KR').toLowerCase().includes(search) ||
          request.history.some(h => h.user.toLowerCase().includes(search))
        );
      });
  }, [requests, debouncedSearchTerm, selectedStatuses, selectedRequesters, selectedDestinations, selectedMonths, ignoreFilters]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStatuses(new Set());
    setSelectedRequesters(new Set());
    setSelectedDestinations(new Set());
    setSelectedMonths(new Set());
  }, []);

  return {
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
    requesters,
    destinations,
    months,
    filteredRequests,
    resetFilters,
  };
};