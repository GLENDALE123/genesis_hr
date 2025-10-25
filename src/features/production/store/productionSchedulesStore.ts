/**
 * 생산일정 데이터 Zustand 스토어
 * packagingReportsStore 패턴 참고
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ProductionSchedule } from '../types';

/**
 * 생산일정 데이터 캐시 인터페이스
 */
interface DateRangeCache {
  startDate: string;
  endDate: string;
  schedules: ProductionSchedule[];
  timestamp: number; // 캐시 시간
}

interface ProductionSchedulesState {
  // 캐시된 데이터 (날짜 범위별)
  cache: DateRangeCache | null;
  
  // 현재 표시 중인 데이터
  schedules: ProductionSchedule[];
  
  // 로딩 상태
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching
  
  // 에러
  error: Error | null;
  
  // 마지막 업데이트 시간
  lastUpdated: number | null;
}

interface ProductionSchedulesActions {
  // 캐시 확인 및 반환
  getCachedSchedules: (startDate: string, endDate: string) => ProductionSchedule[] | null;
  
  // 데이터 설정 (캐싱)
  setSchedules: (schedules: ProductionSchedule[], startDate: string, endDate: string) => void;
  
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  
  // 에러 설정
  setError: (error: Error | null) => void;
  
  // 캐시 초기화
  clearCache: () => void;
  
  // 특정 일정 업데이트 (실시간 동기화)
  updateSchedule: (scheduleId: string, updateData: Partial<ProductionSchedule>) => void;
  
  // 특정 일정 삭제 (실시간 동기화)
  deleteSchedule: (scheduleId: string) => void;
  
  // 새 일정 추가 (실시간 동기화)
  addSchedule: (schedule: ProductionSchedule) => void;
  
  // 날짜별 일정 삭제
  deleteSchedulesByDate: (date: string) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시 유효 시간

export const useProductionSchedulesStore = create<ProductionSchedulesState & ProductionSchedulesActions>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        cache: null,
        schedules: [],
        isLoading: false,
        isFetching: false,
        error: null,
        lastUpdated: null,

        // 캐시된 데이터 가져오기
        getCachedSchedules: (startDate: string, endDate: string) => {
          const { cache } = get();
          
          if (!cache) return null;
          
          // 날짜 범위가 일치하는지 확인
          if (cache.startDate === startDate && cache.endDate === endDate) {
            // 캐시 유효 시간 확인
            const now = Date.now();
            const cacheAge = now - cache.timestamp;
            
            if (cacheAge < CACHE_DURATION) {
              console.log('📦 캐시된 데이터 사용 (빠른 로딩)');
              return cache.schedules;
            } else {
              console.log('⏰ 캐시 만료 - 새로운 데이터 필요');
            }
          }
          
          return null;
        },

        // 데이터 설정 및 캐싱
        setSchedules: (schedules: ProductionSchedule[], startDate: string, endDate: string) => {
          set({
            schedules,
            cache: {
              startDate,
              endDate,
              schedules,
              timestamp: Date.now()
            },
            lastUpdated: Date.now(),
            isLoading: false,
            isFetching: false,
            error: null
          });
        },

        // 로딩 상태 설정
        setLoading: (isLoading: boolean) => set({ isLoading }),
        
        setFetching: (isFetching: boolean) => set({ isFetching }),

        // 에러 설정
        setError: (error: Error | null) => set({ error, isLoading: false, isFetching: false }),

        // 캐시 초기화
        clearCache: () => set({ 
          cache: null, 
          schedules: [], 
          error: null,
          lastUpdated: null 
        }),

        // 실시간 업데이트: 일정 수정
        updateSchedule: (scheduleId: string, updateData: Partial<ProductionSchedule>) => {
          const { schedules, cache } = get();
          
          const updatedSchedules = schedules.map(schedule =>
            schedule.id === scheduleId ? { ...schedule, ...updateData } : schedule
          );
          
          set({
            schedules: updatedSchedules,
            cache: cache ? { ...cache, schedules: updatedSchedules, timestamp: Date.now() } : null,
            lastUpdated: Date.now()
          });
        },

        // 실시간 업데이트: 일정 삭제
        deleteSchedule: (scheduleId: string) => {
          const { schedules, cache } = get();
          
          const filteredSchedules = schedules.filter(schedule => schedule.id !== scheduleId);
          
          set({
            schedules: filteredSchedules,
            cache: cache ? { ...cache, schedules: filteredSchedules, timestamp: Date.now() } : null,
            lastUpdated: Date.now()
          });
        },

        // 날짜별 일정 삭제
        deleteSchedulesByDate: (date: string) => {
          const { schedules, cache } = get();
          
          const filteredSchedules = schedules.filter(schedule => schedule.planDate !== date);
          
          set({
            schedules: filteredSchedules,
            cache: cache ? { ...cache, schedules: filteredSchedules, timestamp: Date.now() } : null,
            lastUpdated: Date.now()
          });
        },

        // 실시간 업데이트: 새 일정 추가
        addSchedule: (schedule: ProductionSchedule) => {
          const { schedules, cache } = get();
          
          const newSchedules = [schedule, ...schedules];
          
          set({
            schedules: newSchedules,
            cache: cache ? { ...cache, schedules: newSchedules, timestamp: Date.now() } : null,
            lastUpdated: Date.now()
          });
        },
      }),
      {
        name: 'production-schedules-store',
        // 캐시만 persist (로딩 상태는 저장하지 않음)
        partialize: (state) => ({
          cache: state.cache,
          lastUpdated: state.lastUpdated
        }),
      }
    ),
    { name: 'production-schedules-store' }
  )
);
