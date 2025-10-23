import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { QualityInspection, GroupedInspectionData } from '../types';
import {
  subscribeToQualityInspections,
  subscribeToQualityInspectionsByDateRange,
  groupInspectionsByOrder
} from '../services/qualityInspectionService';
import { useQualityInspectionStore } from '../store/qualityInspectionStore';

interface UseQualityInspectionsReturn {
  inspections: QualityInspection[];
  groupedInspections: GroupedInspectionData[];
  filteredGroupedInspections: GroupedInspectionData[];
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching 상태
  error: Error | null;
  refetch: () => void;
  getInspectionsByDateRange: (startDate: string, endDate: string) => void;
}

interface UseQualityInspectionsOptions {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  limitCount?: number;
}

/**
 * 품질검사 목록을 실시간으로 구독하고 그룹화하는 훅
 * 복합 인덱스 최적화: 날짜 범위별 서버 사이드 필터링
 */
export const useQualityInspections = (
  options: UseQualityInspectionsOptions = {}
): UseQualityInspectionsReturn => {
  const { searchTerm: inputSearchTerm, limitCount = 1000 } = options;
  
  // 검색어 디바운싱 (300ms)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(inputSearchTerm || '');
    }, 300);
    
    return () => clearTimeout(timer);
  }, [inputSearchTerm]);
  
  const [mounted, setMounted] = useState(false);
  
  // 현재 구독 중인 날짜 범위 (실시간 구독 관리용)
  const [currentDateRange, setCurrentDateRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // 중복 요청 방지를 위한 debounce 타이머
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Zustand 스토어 사용
  const {
    inspections,
    isLoading,
    isFetching,
    error,
    getCachedInspections,
    setInspections,
    setLoading,
    setFetching,
    setError
  } = useQualityInspectionStore();

  // 클라이언트 사이드에서만 실행되도록 보장
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 초기 마운트 시 오늘 날짜로 실시간 구독 시작
  useEffect(() => {
    if (!mounted) return;

    const today = new Date().toISOString().split('T')[0];
    setCurrentDateRange({ startDate: today, endDate: today });
  }, [mounted]);

  // ✅ 캐시 확인 및 즉시 표시 + 백그라운드 동기화
  useEffect(() => {
    if (!mounted || !currentDateRange) return;
    
    const { startDate: rangeStartDate, endDate: rangeEndDate } = currentDateRange;
    
    // 캐시된 데이터 확인
    const cachedInspections = getCachedInspections(rangeStartDate, rangeEndDate);
    if (cachedInspections) {
      // 백그라운드에서 최신 데이터 가져오기
      setFetching(true);
      
      // 기존 구독 해제
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      // 백그라운드 구독 시작
      unsubscribeRef.current = subscribeToQualityInspectionsByDateRange(
        rangeStartDate,
        rangeEndDate,
        (newInspections) => {
          setInspections(newInspections, rangeStartDate, rangeEndDate);
          setFetching(false);
        },
        (err) => {
          console.error('❌ 백그라운드 동기화 실패:', err);
          setFetching(false);
        },
        limitCount
      );
      
      return;
    }
    
    // 캐시가 없으면 일반 구독 시작
  }, [mounted, currentDateRange, getCachedInspections, setFetching, setInspections, limitCount]);

  // ✅ 날짜 범위 또는 검색어 변경 시 실시간 구독 재시작
  useEffect(() => {
    if (!mounted) return;

    let isCancelled = false;

    const initSubscription = () => {
      // 로딩 시작
      setLoading(true);
      setError(null);
      if (isCancelled) return;
      
      // 기존 구독 해제
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // 검색어가 있으면 모든 데이터 구독 (날짜 필터 무시)
      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        unsubscribeRef.current = subscribeToQualityInspections(
          (newInspections) => {
            if (!isCancelled) {
              setInspections(newInspections, '', ''); // 검색어 모드에서는 캐싱하지 않음
              setLoading(false);
              setError(null);
            }
          },
          limitCount,
          (err) => {
            if (!isCancelled) {
              console.error('❌ 품질검사 데이터 로드 실패:', err);
              setError(err);
              setLoading(false);
            }
          }
        );
      } else if (currentDateRange) {
        // 검색어가 없으면 날짜 범위별 구독 (복합 인덱스 최적화)
        const { startDate: rangeStartDate, endDate: rangeEndDate } = currentDateRange;
        
        unsubscribeRef.current = subscribeToQualityInspectionsByDateRange(
          rangeStartDate,
          rangeEndDate,
          (newInspections) => {
            if (!isCancelled) {
              setInspections(newInspections, rangeStartDate, rangeEndDate); // 캐싱
              setLoading(false);
              setError(null);
            }
          },
          (err) => {
            if (!isCancelled) {
              console.error('❌ 품질검사 데이터 로드 실패:', err);
              setError(err);
              setLoading(false);
            }
          },
          limitCount
        );
      }
    };

    initSubscription();

    return () => {
      isCancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // debounce 타이머 정리
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [mounted, currentDateRange, debouncedSearchTerm, limitCount, setLoading, setError, setInspections]);

  // 수동 새로고침 (현재 날짜 범위 유지하면서 재구독)
  const refetch = useCallback(() => {
    if (!mounted || !currentDateRange) return;
    
    // 동일한 날짜 범위로 재설정 → useEffect가 구독 재시작
    setCurrentDateRange({ ...currentDateRange });
  }, [mounted, currentDateRange]);

  // ✅ 특정 날짜 범위로 실시간 구독 변경 (debounce 적용)
  const getInspectionsByDateRange = useCallback((startDate: string, endDate: string) => {
    if (!mounted) return;
    
    // 기존 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 300ms 후에 실행 (연속된 요청 방지)
    debounceTimerRef.current = setTimeout(() => {
      // 날짜 범위 상태 변경 → useEffect가 자동으로 구독 재시작
      setCurrentDateRange({ startDate, endDate });
    }, 300);
  }, [mounted]);

  // 발주번호별 그룹화 (서버에서 이미 필터링된 데이터)
  const groupedInspections = useMemo(() => {
    return groupInspectionsByOrder(inspections);
  }, [inspections]);

  // 필터링된 그룹화 데이터
  const filteredGroupedInspections = useMemo(() => {
    let filtered = groupedInspections;

    // 검색어가 있으면 전체 데이터에서 검색 (생산일보와 동일한 방식)
    if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(group => {
        // 그룹 내 모든 검사들을 확인
        const allInspections = [...group.incoming, ...group.inProcess, ...group.outgoing];
        
        // 검사 데이터에서 검색어 찾기 (생산일보와 동일한 필드)
        return allInspections.some(inspection => {
          const matchesSearch = 
            (inspection.orderNumber && inspection.orderNumber.toLowerCase().includes(searchLower)) ||
            (inspection.supplier && inspection.supplier.toLowerCase().includes(searchLower)) ||
            (inspection.productName && inspection.productName.toLowerCase().includes(searchLower)) ||
            (inspection.partName && inspection.partName.toLowerCase().includes(searchLower)) ||
            (inspection.specification && inspection.specification.toLowerCase().includes(searchLower)) ||
            (inspection.inspectionType && inspection.inspectionType.toLowerCase().includes(searchLower)) ||
            (inspection.result && inspection.result.toLowerCase().includes(searchLower));
          
          return matchesSearch;
        });
      });
    }

    return filtered;
  }, [groupedInspections, debouncedSearchTerm]);

  return {
    inspections,
    groupedInspections,
    filteredGroupedInspections,
    isLoading,
    isFetching,
    error,
    refetch,
    getInspectionsByDateRange
  };
};