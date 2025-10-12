import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProductionSchedule } from '@/features/production/types';
import * as ProductionScheduleService from '@/features/production/services/productionScheduleService';
import { waitForFirebaseInit } from '@/shared/services/firebase/config';

// 생산라인 정렬 순서 (HS-Jig과 동일)
const productionLineSortOrder = [
  '증착1하도(아)',
  '증착1상도(아)',
  '증착1',
  '증착1하도',
  '증착1상도',
  '증착2하도(아)',
  '증착2상도(아)',
  '증착2',
  '증착2하도',
  '증착2상도',
  '2코팅',
  '1코팅',
  '내부코팅1호기',
  '내부코팅2호기',
  '내부코팅3호기'
];

/**
 * 생산일정 데이터를 관리하는 커스텀 훅
 * HS-Jig의 production-schedules 컬렉션과 동일한 구조 사용
 * 
 * usePackagingReports 패턴 참고
 */
export const useProductionSchedules = () => {
  const [mounted, setMounted] = useState(false);
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // 현재 구독 중인 날짜 범위
  const [currentDateRange, setCurrentDateRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 클라이언트 사이드에서만 실행
  useEffect(() => {
    setMounted(true);
  }, []);

  // 초기 마운트 시 오늘 날짜로 실시간 구독 시작
  useEffect(() => {
    if (!mounted) return;

    const today = new Date().toISOString().split('T')[0];
    setCurrentDateRange({ startDate: today, endDate: today });
  }, [mounted]);

  // 날짜 범위가 변경될 때마다 실시간 구독 재시작
  useEffect(() => {
    if (!mounted || !currentDateRange) return;

    let isCancelled = false;
    const { startDate, endDate } = currentDateRange;

    const initSubscription = async () => {
      console.log(`🔄 생산일정 실시간 구독 시작: ${startDate} ~ ${endDate}`);
      
      setLoading(true);
      setError(null);

      // Firebase 초기화 대기
      const isFirebaseReady = await waitForFirebaseInit();
      
      if (isCancelled) return;

      if (!isFirebaseReady) {
        console.error('❌ Firebase 초기화 실패');
        setError(new Error('Firebase 초기화에 실패했습니다. 페이지를 새로고침해주세요.'));
        setLoading(false);
        return;
      }
      
      console.log('✅ Firebase 초기화 완료 - 생산일정 실시간 구독 시작');

      // 기존 구독 해제
      if (unsubscribeRef.current) {
        console.log('🔄 기존 구독 해제');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // 새로운 날짜 범위로 실시간 구독
      unsubscribeRef.current = ProductionScheduleService.subscribeToSchedulesByDateRange(
        startDate,
        endDate,
        (newSchedules) => {
          if (!isCancelled) {
            console.log(`✅ 생산일정 데이터 수신 성공: ${newSchedules.length}건`);
            setSchedules(newSchedules);
            setLoading(false);
          }
        },
        (err) => {
          if (!isCancelled) {
            console.error('❌ 생산일정 데이터 로드 실패:', err);
            setError(err);
            setLoading(false);
          }
        }
      );
    };

    initSubscription();

    return () => {
      isCancelled = true;
      if (unsubscribeRef.current) {
        console.log('🔄 구독 해제 (cleanup)');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [mounted, currentDateRange]);

  // 수동 새로고침
  const refetch = useCallback(() => {
    if (!mounted || !currentDateRange) return;
    
    console.log('🔄 수동 새로고침: 구독 재시작');
    setCurrentDateRange({ ...currentDateRange });
  }, [mounted, currentDateRange]);

  // 특정 날짜 범위로 실시간 구독 변경
  const getSchedulesByDateRange = useCallback((startDate: string, endDate: string) => {
    if (!mounted) return;
    
    console.log(`📅 날짜 범위 변경 요청: ${startDate} ~ ${endDate}`);
    setCurrentDateRange({ startDate, endDate });
  }, [mounted]);

  // 일정 삭제
  const deleteSchedule = useCallback(async (scheduleId: string) => {
    try {
      await ProductionScheduleService.deleteSchedule(scheduleId);
      // 실시간 구독이 자동으로 업데이트하지만 즉시 반영을 위해 로컬 상태도 업데이트
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // 날짜별 전체 삭제
  const deleteSchedulesByDate = useCallback(async (date: string) => {
    try {
      await ProductionScheduleService.deleteSchedulesByDate(date);
      // 실시간 구독이 자동으로 업데이트하지만 즉시 반영을 위해 로컬 상태도 업데이트
      setSchedules(prev => prev.filter(s => s.planDate !== date));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // 일정 생성
  const createSchedules = useCallback(async (
    newSchedules: Omit<ProductionSchedule, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => {
    try {
      setLoading(true);
      const createdIds = await ProductionScheduleService.createSchedules(newSchedules);
      await refetch();
      return createdIds;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  // 정렬된 일정 (날짜 > orderIndex > 라인 순서)
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      // 1. 날짜 정렬
      const dateComparison = a.planDate.localeCompare(b.planDate);
      if (dateComparison !== 0) return dateComparison;

      // 2. orderIndex 정렬
      const aOrder = a.orderIndex !== null && a.orderIndex !== undefined ? a.orderIndex : Infinity;
      const bOrder = b.orderIndex !== null && b.orderIndex !== undefined ? b.orderIndex : Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;

      // 3. 라인 정렬 (정해진 순서대로)
      const aLine = a.line || '';
      const bLine = b.line || '';
      const aIndex = productionLineSortOrder.indexOf(aLine);
      const bIndex = productionLineSortOrder.indexOf(bLine);
      const aSortIndex = aIndex === -1 ? Infinity : aIndex;
      const bSortIndex = bIndex === -1 ? Infinity : bIndex;
      
      if (aSortIndex !== bSortIndex) return aSortIndex - bSortIndex;

      // 4. 라인 이름 사전순 정렬 (fallback)
      return aLine.localeCompare(bLine, 'ko');
    });
  }, [schedules]);

  return {
    schedules: sortedSchedules,
    loading,
    error,
    refetch,
    getSchedulesByDateRange,
    createSchedules,
    deleteSchedule,
    deleteSchedulesByDate
  };
};

