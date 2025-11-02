import { useState, useMemo, useCallback, useEffect } from 'react';

export interface JigMasterFilters {
  startDate: string;
  endDate: string;
  searchTerm: string;
}

interface UseJigMasterFiltersReturn {
  filters: JigMasterFilters;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setSearchTerm: (term: string) => void;
  setFilters: (filters: Partial<JigMasterFilters>) => void;
  resetFilters: () => void;
  today: string;
  yesterday: string;
  isSearching: boolean; // 검색어 debounce 상태
}

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
 * 지그 마스터 필터 상태를 관리하는 훅
 */
export const useJigMasterFilters = (): UseJigMasterFiltersReturn => {
  const today = useMemo(() => getLocalDate(new Date()), []);
  const yesterday = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getLocalDate(y);
  }, []);

  const [filters, setFiltersState] = useState<JigMasterFilters>({
    startDate: today,
    endDate: today,
    searchTerm: '',
  });

  const [inputValue, setInputValue] = useState(''); // 즉시 반영되는 입력값
  const [searchTerm, setSearchTerm] = useState(''); // 디바운스된 검색어
  const [isSearching, setIsSearching] = useState(false);

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

  const setStartDate = useCallback((date: string) => {
    setFiltersState(prev => ({ ...prev, startDate: date }));
  }, []);

  const setEndDate = useCallback((date: string) => {
    setFiltersState(prev => ({ ...prev, endDate: date }));
  }, []);

  const setSearchTermCallback = useCallback((term: string) => {
    setIsSearching(true);
    setInputValue(term);
  }, []);

  const setFilters = useCallback((newFilters: Partial<JigMasterFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({
      startDate: today,
      endDate: today,
      searchTerm: '',
    });
    setInputValue('');
    setSearchTerm('');
    setIsSearching(false);
  }, [today]);

  return {
    filters: {
      ...filters,
      searchTerm: inputValue, // UI에는 즉시 반영되는 값 사용
    },
    setStartDate,
    setEndDate,
    setSearchTerm: setSearchTermCallback,
    setFilters,
    resetFilters,
    today,
    yesterday,
    isSearching,
  };
};

