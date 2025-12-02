/**
 * 샘플 요청 Zustand 스토어
 * packagingReportsStore 패턴 참고
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { SampleRequest } from '../types';

/**
 * 샘플 요청 데이터 캐시 인터페이스
 */
interface SampleRequestsCache {
  requests: SampleRequest[];
  timestamp: number; // 캐시 시간
}

interface SampleRequestsState {
  // 캐시된 데이터
  cache: SampleRequestsCache | null;
  
  // 현재 표시 중인 데이터
  requests: SampleRequest[];
  
  // 로딩 상태
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching
  
  // 에러
  error: Error | null;
  
  // 마지막 업데이트 시간
  lastUpdated: number | null;
}

interface SampleRequestsActions {
  // 캐시 확인 및 반환
  getCachedRequests: () => SampleRequest[] | null;
  
  // 데이터 설정 (캐싱)
  setRequests: (requests: SampleRequest[]) => void;
  
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  
  // 에러 설정
  setError: (error: Error | null) => void;
  
  // 캐시 초기화
  clearCache: () => void;
  
  // 특정 요청 업데이트 (실시간 동기화)
  updateRequest: (requestId: string, updateData: Partial<SampleRequest>) => void;
  
  // 특정 요청 삭제 (실시간 동기화)
  deleteRequest: (requestId: string) => void;
  
  // 새 요청 추가 (실시간 동기화)
  addRequest: (request: SampleRequest) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시 유효 시간

export const useSampleRequestsStore = create<SampleRequestsState & SampleRequestsActions>()(
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
            return cache.requests;
          }
          // 캐시가 만료된 경우 계속 진행하여 새로 로드
          
          return null;
        },

        // 데이터 설정 및 캐싱
        setRequests: (requests: SampleRequest[]) => {
          set({
            requests,
            cache: {
              requests,
              timestamp: Date.now()
            },
            lastUpdated: Date.now(),
            error: null
          });
        },

        // 로딩 상태 설정
        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        setFetching: (fetching: boolean) => {
          set({ isFetching: fetching });
        },

        // 에러 설정
        setError: (error: Error | null) => {
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
        },

        // 특정 요청 업데이트 (낙관적 업데이트)
        updateRequest: (requestId: string, updateData: Partial<SampleRequest>) => {
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
        },

        // 특정 요청 삭제
        deleteRequest: (requestId: string) => {
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
        },

        // 새 요청 추가
        addRequest: (request: SampleRequest) => {
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
        },
      }),
      {
        name: 'sample-requests-store',
        partialize: (state) => ({
          // cache는 메모리에서만 관리 (LocalStorage 할당량 초과 방지)
          // lastUpdated만 저장하여 캐시 유효성 확인용으로 사용
          lastUpdated: state.lastUpdated
        })
      }
    ),
    { name: 'sample-requests-store' }
  )
);


