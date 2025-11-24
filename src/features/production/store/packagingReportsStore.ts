import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { PackagingReport } from '@/features/production/types';

/**
 * 생산일보 데이터 캐시 인터페이스
 */
interface DateRangeCache {
  startDate: string;
  endDate: string;
  reports: PackagingReport[];
  timestamp: number; // 캐시 시간
}

interface PackagingReportsState {
  // 캐시된 데이터 (날짜 범위별)
  cache: DateRangeCache | null;
  
  // 현재 표시 중인 데이터
  reports: PackagingReport[];
  
  // 로딩 상태
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching
  
  // 에러
  error: Error | null;
  
  // 마지막 업데이트 시간
  lastUpdated: number | null;
}

interface PackagingReportsActions {
  // 캐시 확인 및 반환
  getCachedReports: (startDate: string, endDate: string) => PackagingReport[] | null;
  
  // 데이터 설정 (캐싱)
  setReports: (reports: PackagingReport[], startDate: string, endDate: string) => void;
  
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  
  // 에러 설정
  setError: (error: Error | null) => void;
  
  // 캐시 초기화
  clearCache: () => void;
  
  // 특정 보고서 업데이트 (실시간 동기화)
  updateReport: (reportId: string, updateData: Partial<PackagingReport>) => void;
  
  // 특정 보고서 삭제 (실시간 동기화)
  deleteReport: (reportId: string) => void;
  
  // 새 보고서 추가 (실시간 동기화)
  addReport: (report: PackagingReport) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시 유효 시간

export const usePackagingReportsStore = create<PackagingReportsState & PackagingReportsActions>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        cache: null,
        reports: [],
        isLoading: false,
        isFetching: false,
        error: null,
        lastUpdated: null,

        // 캐시된 데이터 가져오기
        getCachedReports: (startDate: string, endDate: string) => {
          const { cache } = get();
          
          if (!cache) return null;
          
          // 날짜 범위가 일치하는지 확인
          if (cache.startDate === startDate && cache.endDate === endDate) {
            // 캐시 유효 시간 확인
            const now = Date.now();
            const cacheAge = now - cache.timestamp;
            
            if (cacheAge < CACHE_DURATION) {
              return cache.reports;
            }
            // 캐시가 만료된 경우 계속 진행하여 새로 로드
          }
          
          return null;
        },

        // 데이터 설정 및 캐싱
        setReports: (reports: PackagingReport[], startDate: string, endDate: string) => {
          set({
            reports,
            cache: {
              startDate,
              endDate,
              reports,
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
          reports: [], 
          error: null,
          lastUpdated: null 
        }),

        // 실시간 업데이트: 보고서 수정
        updateReport: (reportId: string, updateData: Partial<PackagingReport>) => {
          const { reports, cache } = get();
          
          const updatedReports = reports.map(report =>
            report.id === reportId ? { ...report, ...updateData } : report
          );
          
          set({
            reports: updatedReports,
            cache: cache ? { ...cache, reports: updatedReports, timestamp: Date.now() } : null,
            lastUpdated: Date.now()
          });
        },

        // 실시간 업데이트: 보고서 삭제
        deleteReport: (reportId: string) => {
          const { reports, cache } = get();
          
          const filteredReports = reports.filter(report => report.id !== reportId);
          
          set({
            reports: filteredReports,
            cache: cache ? { ...cache, reports: filteredReports, timestamp: Date.now() } : null,
            lastUpdated: Date.now()
          });
        },

        // 실시간 업데이트: 새 보고서 추가
        addReport: (report: PackagingReport) => {
          const { reports, cache } = get();
          
          const newReports = [report, ...reports];
          
          set({
            reports: newReports,
            cache: cache ? { ...cache, reports: newReports, timestamp: Date.now() } : null,
            lastUpdated: Date.now()
          });
        },
      }),
      {
        name: 'packaging-reports-store',
        // 캐시만 persist (로딩 상태는 저장하지 않음)
        partialize: (state) => ({
          cache: state.cache,
          lastUpdated: state.lastUpdated
        }),
      }
    ),
    { name: 'packaging-reports-store' }
  )
);

