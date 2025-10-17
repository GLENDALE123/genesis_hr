import { useState, useMemo, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export interface InspectionFilters {
  startDate: string;
  endDate: string;
  searchTerm: string;
}

interface UseInspectionFiltersReturn {
  filters: InspectionFilters;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setSearchTerm: (term: string) => void;
  setFilters: (filters: Partial<InspectionFilters>) => void;
  resetFilters: () => void;
  today: string;
  yesterday: string;
  isSearching: boolean; // 검색어 debounce 상태
}

/**
 * 로컬 날짜 가져오기 (YYYY-MM-DD 형식)
 */
const getLocalDate = (date = new Date()): string => {
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - userTimezoneOffset);
  return localDate.toISOString().split('T')[0];
};

/**
 * 품질검사 필터 상태를 관리하는 훅
 */
export const useInspectionFilters = (): UseInspectionFiltersReturn => {
  const today = useMemo(() => getLocalDate(new Date()), []);
  const yesterday = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDate(y);
  }, []);

  const [filters, setFiltersState] = useState<InspectionFilters>({
    startDate: today,
    endDate: today,
    searchTerm: '',
  });

  const [isSearching, setIsSearching] = useState(false);

  const setStartDate = useCallback((date: string) => {
    setFiltersState(prev => ({ ...prev, startDate: date }));
  }, []);

  const setEndDate = useCallback((date: string) => {
    setFiltersState(prev => ({ ...prev, endDate: date }));
  }, []);

  // Debounced 검색어 설정 (300ms)
  const debouncedSetSearchTerm = useDebouncedCallback((term: string) => {
    setFiltersState(prev => ({ ...prev, searchTerm: term }));
    setIsSearching(false);
  }, 300);

  const setSearchTerm = useCallback((term: string) => {
    setIsSearching(true);
    debouncedSetSearchTerm(term);
  }, [debouncedSetSearchTerm]);

  const setFilters = useCallback((newFilters: Partial<InspectionFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({
      startDate: today,
      endDate: today,
      searchTerm: '',
    });
    setIsSearching(false);
  }, [today]);

  return {
    filters,
    setStartDate,
    setEndDate,
    setSearchTerm,
    setFilters,
    resetFilters,
    today,
    yesterday,
    isSearching,
  };
};

