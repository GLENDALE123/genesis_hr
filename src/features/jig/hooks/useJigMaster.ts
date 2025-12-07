
/**
 * 지그 마스터 관리 훅
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { JigMasterItem } from '../types';
import {
  subscribeToJigMasters,
  subscribeToJigMastersByDateRange,
} from '../services/jigMasterService';
import { useJigMasterStore } from '../store/jigMasterStore';
import { waitForFirebaseInit } from '@/shared/services/firebase/config';
import { getLocalDateString } from '@/shared/utils/date/dateUtils';

interface UseJigMasterReturn {
  masterItems: JigMasterItem[];
  filteredMasterItems: JigMasterItem[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
  getMastersByDateRange: (startDate: string, endDate: string) => void;
}

interface UseJigMasterOptions {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  limitCount?: number;
}

/**
 * 지그 마스터 목록을 실시간으로 구독하는 훅
 * 복합 인덱스 최적화: 날짜 범위별 서버 사이드 필터링
 */
export const useJigMaster = (
  options: UseJigMasterOptions = {}
): UseJigMasterReturn => {
  const { searchTerm: inputSearchTerm, limitCount = 1000 } = options;
  
  // 검색어 디바운싱 (300ms)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
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
    masterItems,
    isLoading,
    isFetching,
    error,
    getCachedMasters,
    setMasters,
    setLoading,
    setFetching,
    setError
  } = useJigMasterStore();

  // 클라이언트 사이드에서만 실행되도록 보장
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 초기 마운트 시 오늘 날짜로 실시간 구독 시작
  useEffect(() => {
    if (!mounted) return;

    if (options.startDate && options.endDate) {
      setCurrentDateRange({ startDate: options.startDate, endDate: options.endDate });
    } else {
      const today = getLocalDateString(new Date());
      setCurrentDateRange({ startDate: today, endDate: today });
    }
  }, [mounted, options.startDate, options.endDate]);

  // ✅ 캐시 확인 및 즉시 표시 + 백그라운드 동기화
  useEffect(() => {
    if (!mounted || !currentDateRange) return;
    
    const { startDate: rangeStartDate, endDate: rangeEndDate } = currentDateRange;
    
    // 캐시된 데이터 확인
    const cachedMasters = getCachedMasters(rangeStartDate, rangeEndDate);
    if (cachedMasters) {
      // 백그라운드에서 최신 데이터 가져오기
      setFetching(true);
      
      // 기존 구독 해제
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      // 백그라운드 구독 시작
      unsubscribeRef.current = subscribeToJigMastersByDateRange(
        rangeStartDate,
        rangeEndDate,
        (newMasters) => {
          if (!isMountedRef.current) return;
          setMasters(newMasters, rangeStartDate, rangeEndDate);
          setFetching(false);
        },
        (err) => {
          if (!isMountedRef.current) return;
          console.error('❌ 백그라운드 동기화 실패:', err);
          setFetching(false);
        },
        limitCount
      );
      
      return;
    }
    
    // 캐시가 없으면 일반 구독 시작
  }, [mounted, currentDateRange, getCachedMasters, setFetching, setMasters]);

  // ✅ 날짜 범위 또는 검색어 변경 시 실시간 구독 재시작
  useEffect(() => {
    if (!mounted) return;

    let isCancelled = false;

    const initSubscription = async () => {
      // Firebase 초기화 대기
      const isFirebaseReady = await waitForFirebaseInit();
      if (!isFirebaseReady || isCancelled) return;

      // 로딩 시작
      setLoading(true);
      setError(null);
      if (isCancelled) return;
      
      // 기존 구독 해제
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // 검색어가 있으면 모든 데이터 구독 (날짜 필터 무시, 리미트 없음)
      if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
        unsubscribeRef.current = subscribeToJigMasters(
          (newMasters) => {
            if (!isCancelled) {
              setMasters(newMasters, '', ''); // 검색어 모드에서는 캐싱하지 않음
              setLoading(false);
              setError(null);
            }
          },
          0, // 검색 모드에서는 제한 없이 모든 문서 조회 (0은 limit 미적용을 의미)
          (err) => {
            if (!isCancelled) {
              console.error('❌ 지그 마스터 데이터 로드 실패:', err);
              setError(err);
              setLoading(false);
            }
          }
        );
      } else if (currentDateRange) {
        // 검색어가 없으면 날짜 범위별 구독 (복합 인덱스 최적화)
        const { startDate: rangeStartDate, endDate: rangeEndDate } = currentDateRange;
        
        unsubscribeRef.current = subscribeToJigMastersByDateRange(
          rangeStartDate,
          rangeEndDate,
          (newMasters) => {
            if (!isCancelled) {
              setMasters(newMasters, rangeStartDate, rangeEndDate); // 캐싱
              setLoading(false);
              setError(null);
            }
          },
          (err) => {
            if (!isCancelled) {
              console.error('❌ 지그 마스터 데이터 로드 실패:', err);
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
  }, [mounted, currentDateRange, debouncedSearchTerm, limitCount, setLoading, setError, setMasters]);

  // 수동 새로고침 (현재 날짜 범위 유지하면서 재구독)
  const refetch = useCallback(() => {
    if (!mounted || !currentDateRange) return;
    
    // 동일한 날짜 범위로 재설정 → useEffect가 구독 재시작
    setCurrentDateRange({ ...currentDateRange });
  }, [mounted, currentDateRange]);

  // ✅ 특정 날짜 범위로 실시간 구독 변경 (debounce 적용)
  const getMastersByDateRange = useCallback((startDate: string, endDate: string) => {
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

  // 필터링된 지그 목록
  const filteredMasterItems = useMemo(() => {
    let filtered = masterItems;

    // 검색어가 있으면 전체 데이터에서 검색
    if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const productName = (item.productName || item.itemName || '').toLowerCase().replace(/\s+/g, '');
        const partName = (item.partName || '').toLowerCase().replace(/\s+/g, '');
        const jigNumber = (item.jigNumber || item.itemNumber || '').toLowerCase().replace(/\s+/g, '');
        const orderNumber = (item.orderNumber || '').toLowerCase().replace(/\s+/g, '');
        const supplier = (item.supplier || '').toLowerCase().replace(/\s+/g, '');
        const requestType = (item.requestType || '').toLowerCase().replace(/\s+/g, '');
        const remarks = (item.remarks || '').toLowerCase().replace(/\s+/g, '');
        const normalizedSearch = searchLower.replace(/\s+/g, '');
        
        return productName.includes(normalizedSearch) ||
               partName.includes(normalizedSearch) ||
               jigNumber.includes(normalizedSearch) ||
               orderNumber.includes(normalizedSearch) ||
               supplier.includes(normalizedSearch) ||
               requestType.includes(normalizedSearch) ||
               remarks.includes(normalizedSearch);
      });
    }

    return filtered;
  }, [masterItems, debouncedSearchTerm]);

  return {
    masterItems,
    filteredMasterItems,
    isLoading,
    isFetching,
    error,
    refetch,
    getMastersByDateRange
  };
};

