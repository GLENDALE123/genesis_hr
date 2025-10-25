/**
 * 부족분 요청 Zustand 스토어
 * qualityIssuesStore 패턴 참고
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ShortageRequest } from '../types';

/**
 * 부족분 요청 데이터 캐시 인터페이스
 */
interface ShortageRequestsCache {
  requests: ShortageRequest[];
  timestamp: number;
}

interface ShortageRequestsState {
  // 캐시된 데이터
  cache: ShortageRequestsCache | null;
  
  // 현재 표시 중인 데이터
  requests: ShortageRequest[];
  
  // 로딩 상태
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching
  
  // 에러
  error: Error | null;
  
  // 마지막 업데이트 시간
  lastUpdated: number | null;
}

interface ShortageRequestsActions {
  // 캐시 확인 및 반환
  getCachedRequests: () => ShortageRequest[] | null;
  
  // 데이터 설정 (캐싱)
  setRequests: (requests: ShortageRequest[]) => void;
  
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  
  // 에러 설정
  setError: (error: Error | null) => void;
  
  // 캐시 초기화
  clearCache: () => void;
  
  // 특정 요청 업데이트 (실시간 동기화)
  updateRequest: (requestId: string, updateData: Partial<ShortageRequest>) => void;
  
  // 특정 요청 삭제 (실시간 동기화)
  deleteRequest: (requestId: string) => void;
  
  // 새 요청 추가 (실시간 동기화)
  addRequest: (request: ShortageRequest) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시 유효 시간

export const useShortageRequestsStore = create<ShortageRequestsState & ShortageRequestsActions>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        cache: null,
        requests: [],
        isLoading: false,
        isFetching: false,
        error: null,
        lastUpdated: null,

        // 캐시된 데이터 가져오기
        getCachedRequests: () => {
          const { cache } = get();
          
          if (!cache) return null;
          
          // 캐시 유효 시간 확인
          const now = Date.now();
          const cacheAge = now - cache.timestamp;
          
          if (cacheAge < CACHE_DURATION) {
            console.log('📦 캐시된 부족분 요청 데이터 사용');
            return cache.requests;
          } else {
            console.log('⏰ 캐시 만료 - 새로운 데이터 필요');
          }
          
          return null;
        },

        // 데이터 설정 및 캐싱
        setRequests: (requests) => {
          set({
            requests,
            cache: {
              requests,
              timestamp: Date.now()
            },
            lastUpdated: Date.now(),
            error: null
          });
          console.log(`✅ 부족분 요청 ${requests.length}건 캐싱 완료`);
        },

        // 로딩 상태 설정
        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setFetching: (fetching) => {
          set({ isFetching: fetching });
        },

        // 에러 설정
        setError: (error) => {
          set({ error });
        },

        // 캐시 초기화
        clearCache: () => {
          set({
            cache: null,
            requests: [],
            lastUpdated: null,
            error: null
          });
          console.log('🗑️ 부족분 요청 캐시 초기화');
        },

        // 특정 요청 업데이트 (낙관적 업데이트)
        updateRequest: (requestId, updateData) => {
          set((state) => {
            const updatedRequests = state.requests.map((request) =>
              request.id === requestId
                ? { ...request, ...updateData }
                : request
            );

            return {
              requests: updatedRequests,
              cache: state.cache
                ? {
                    requests: updatedRequests,
                    timestamp: state.cache.timestamp
                  }
                : null
            };
          });
          console.log('🔄 부족분 요청 업데이트:', requestId);
        },

        // 특정 요청 삭제
        deleteRequest: (requestId) => {
          set((state) => {
            const filteredRequests = state.requests.filter(
              (request) => request.id !== requestId
            );

            return {
              requests: filteredRequests,
              cache: state.cache
                ? {
                    requests: filteredRequests,
                    timestamp: state.cache.timestamp
                  }
                : null
            };
          });
          console.log('🗑️ 부족분 요청 삭제:', requestId);
        },

        // 새 요청 추가
        addRequest: (request) => {
          set((state) => {
            const newRequests = [request, ...state.requests];

            return {
              requests: newRequests,
              cache: state.cache
                ? {
                    requests: newRequests,
                    timestamp: state.cache.timestamp
                  }
                : null
            };
          });
          console.log('➕ 새 부족분 요청 추가:', request.id);
        },
      }),
      {
        name: 'shortage-requests-store',
        partialize: (state) => ({
          cache: state.cache,
          lastUpdated: state.lastUpdated
        })
      }
    ),
    { name: 'shortage-requests-store' }
  )
);
