/**
 * 품질 이슈 Zustand 스토어
 * sampleRequestsStore 패턴 참고
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { QualityIssue } from '../types';

/**
 * 품질 이슈 데이터 캐시 인터페이스
 */
interface QualityIssuesCache {
  issues: QualityIssue[];
  timestamp: number;
}

interface QualityIssuesState {
  // 캐시된 데이터
  cache: QualityIssuesCache | null;
  
  // 현재 표시 중인 데이터
  issues: QualityIssue[];
  
  // 로딩 상태
  isLoading: boolean;
  isFetching: boolean; // 백그라운드 fetching
  
  // 에러
  error: Error | null;
  
  // 마지막 업데이트 시간
  lastUpdated: number | null;
}

interface QualityIssuesActions {
  // 캐시 확인 및 반환
  getCachedIssues: () => QualityIssue[] | null;
  
  // 데이터 설정 (캐싱)
  setIssues: (issues: QualityIssue[]) => void;
  
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  
  // 에러 설정
  setError: (error: Error | null) => void;
  
  // 캐시 초기화
  clearCache: () => void;
  
  // 특정 이슈 업데이트 (실시간 동기화)
  updateIssue: (issueId: string, updateData: Partial<QualityIssue>) => void;
  
  // 특정 이슈 삭제 (실시간 동기화)
  deleteIssue: (issueId: string) => void;
  
  // 새 이슈 추가 (실시간 동기화)
  addIssue: (issue: QualityIssue) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시 유효 시간

export const useQualityIssuesStore = create<QualityIssuesState & QualityIssuesActions>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        cache: null,
        issues: [],
        isLoading: false,
        isFetching: false,
        error: null,
        lastUpdated: null,

        // 캐시된 데이터 가져오기
        getCachedIssues: () => {
          const { cache } = get();
          
          if (!cache) return null;
          
          // 캐시 유효 시간 확인
          const now = Date.now();
          const cacheAge = now - cache.timestamp;
          
          if (cacheAge < CACHE_DURATION) {
            console.log('📦 캐시된 품질 이슈 데이터 사용');
            return cache.issues;
          } else {
            console.log('⏰ 캐시 만료 - 새로운 데이터 필요');
          }
          
          return null;
        },

        // 데이터 설정 및 캐싱
        setIssues: (issues) => {
          set({
            issues,
            cache: {
              issues,
              timestamp: Date.now()
            },
            lastUpdated: Date.now(),
            error: null
          });
          console.log(`✅ 품질 이슈 ${issues.length}건 캐싱 완료`);
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
            issues: [],
            lastUpdated: null,
            error: null
          });
          console.log('🗑️ 품질 이슈 캐시 초기화');
        },

        // 특정 이슈 업데이트 (낙관적 업데이트)
        updateIssue: (issueId, updateData) => {
          set((state) => {
            const updatedIssues = state.issues.map((issue) =>
              issue.id === issueId
                ? { ...issue, ...updateData }
                : issue
            );

            return {
              issues: updatedIssues,
              cache: state.cache
                ? {
                    issues: updatedIssues,
                    timestamp: state.cache.timestamp
                  }
                : null
            };
          });
          console.log('🔄 품질 이슈 업데이트:', issueId);
        },

        // 특정 이슈 삭제
        deleteIssue: (issueId) => {
          set((state) => {
            const filteredIssues = state.issues.filter(
              (issue) => issue.id !== issueId
            );

            return {
              issues: filteredIssues,
              cache: state.cache
                ? {
                    issues: filteredIssues,
                    timestamp: state.cache.timestamp
                  }
                : null
            };
          });
          console.log('🗑️ 품질 이슈 삭제:', issueId);
        },

        // 새 이슈 추가
        addIssue: (issue) => {
          set((state) => {
            const newIssues = [issue, ...state.issues];

            return {
              issues: newIssues,
              cache: state.cache
                ? {
                    issues: newIssues,
                    timestamp: state.cache.timestamp
                  }
                : null
            };
          });
          console.log('➕ 새 품질 이슈 추가:', issue.id);
        },
      }),
      {
        name: 'quality-issues-store',
        partialize: (state) => ({
          cache: state.cache,
          lastUpdated: state.lastUpdated
        })
      }
    ),
    { name: 'quality-issues-store' }
  )
);
