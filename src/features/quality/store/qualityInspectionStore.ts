import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { QualityInspection } from '@/features/quality/types';

/**
 * 품질검사 데이터 캐시 인터페이스
 */
interface DateRangeCache {
  startDate: string;
  endDate: string;
  inspections: QualityInspection[];
  timestamp: number; // 캐시 시간
}

interface QualityInspectionState {
  // 캐시된 데이터 (날짜 범위별)
  cache: DateRangeCache | null;
  
  // 현재 표시 중인 데이터
  inspections: QualityInspection[];
  
  // 로딩 상태
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching
  
  // 에러
  error: Error | null;
  
  // 마지막 업데이트 시간
  lastUpdated: number | null;
}

interface QualityInspectionActions {
  // 캐시 확인 및 반환
  getCachedInspections: (startDate: string, endDate: string) => QualityInspection[] | null;
  
  // 데이터 설정 (캐싱)
  setInspections: (inspections: QualityInspection[], startDate: string, endDate: string) => void;
  
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  
  // 에러 설정
  setError: (error: Error | null) => void;
  
  // 캐시 초기화
  clearCache: () => void;
  
  // 특정 검사 업데이트 (실시간 동기화)
  updateInspection: (inspectionId: string, updateData: Partial<QualityInspection>) => void;
  
  // 특정 검사 삭제 (실시간 동기화)
  deleteInspection: (inspectionId: string) => void;
  
  // 새 검사 추가 (실시간 동기화)
  addInspection: (inspection: QualityInspection) => void;
}

type QualityInspectionStore = QualityInspectionState & QualityInspectionActions;

// 캐시 유효 시간 (5분)
const CACHE_DURATION = 5 * 60 * 1000;

export const useQualityInspectionStore = create<QualityInspectionStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        cache: null,
        inspections: [],
        isLoading: false,
        isFetching: false,
        error: null,
        lastUpdated: null,
        
        // Actions
        getCachedInspections: (startDate: string, endDate: string) => {
          const { cache } = get();
          
          if (!cache) return null;
          
          // 날짜 범위가 일치하는지 확인
          if (cache.startDate !== startDate || cache.endDate !== endDate) {
            return null;
          }
          
          // 캐시 유효 시간 확인
          const now = Date.now();
          if (now - cache.timestamp > CACHE_DURATION) {
            return null;
          }
          
          return cache.inspections;
        },
        
        setInspections: (inspections: QualityInspection[], startDate: string, endDate: string) => {
          const now = Date.now();
          
          set({
            inspections,
            cache: {
              startDate,
              endDate,
              inspections,
              timestamp: now
            },
            lastUpdated: now,
            isLoading: false,
            isFetching: false,
            error: null
          });
          
        },
        
        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },
        
        setFetching: (isFetching: boolean) => {
          set({ isFetching });
        },
        
        setError: (error: Error | null) => {
          set({ error, isLoading: false, isFetching: false });
        },
        
        clearCache: () => {
          set({ cache: null });
        },
        
        updateInspection: (inspectionId: string, updateData: Partial<QualityInspection>) => {
          const { inspections, cache } = get();
          
          // 기존 검사 데이터 찾기
          const existingInspection = inspections.find(inspection => inspection.id === inspectionId);
          if (!existingInspection) {
            console.warn(`📦 품질검사 업데이트 실패: ${inspectionId}를 찾을 수 없음`);
            return;
          }
          
          // 실제 변경사항이 있는지 확인
          const hasChanges = Object.keys(updateData).some(key => {
            const typedKey = key as keyof QualityInspection;
            return existingInspection[typedKey] !== updateData[typedKey];
          });
          
          if (!hasChanges) {
            console.log(`📦 품질검사 업데이트 건너뛰기: ${inspectionId} (변경사항 없음)`);
            return;
          }
          
          const updatedInspections = inspections.map(inspection =>
            inspection.id === inspectionId
              ? { ...inspection, ...updateData }
              : inspection
          );
          
          set({ inspections: updatedInspections });
          
          // 캐시도 업데이트
          if (cache) {
            const updatedCacheInspections = cache.inspections.map(inspection =>
              inspection.id === inspectionId
                ? { ...inspection, ...updateData }
                : inspection
            );
            
            set({
              cache: {
                ...cache,
                inspections: updatedCacheInspections
              }
            });
          }
          
        },
        
        deleteInspection: (inspectionId: string) => {
          const { inspections, cache } = get();
          
          const filteredInspections = inspections.filter(
            inspection => inspection.id !== inspectionId
          );
          
          set({ inspections: filteredInspections });
          
          // 캐시도 업데이트
          if (cache) {
            const filteredCacheInspections = cache.inspections.filter(
              inspection => inspection.id !== inspectionId
            );
            
            set({
              cache: {
                ...cache,
                inspections: filteredCacheInspections
              }
            });
          }
          
        },
        
        addInspection: (inspection: QualityInspection) => {
          const { inspections, cache } = get();
          
          const updatedInspections = [inspection, ...inspections];
          
          set({ inspections: updatedInspections });
          
          // 캐시도 업데이트
          if (cache) {
            const updatedCacheInspections = [inspection, ...cache.inspections];
            
            set({
              cache: {
                ...cache,
                inspections: updatedCacheInspections
              }
            });
          }
          
        }
      }),
      {
        name: 'quality-inspection-store',
        partialize: (state) => ({
          cache: state.cache,
          lastUpdated: state.lastUpdated
        })
      }
    ),
    { name: 'quality-inspection-store' }
  )
);

