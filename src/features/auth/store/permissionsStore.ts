
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PageIdentifier, PagePermissions } from '../types/permissions';

/**
 * 권한 캐싱 스토어
 * - 사용자별 권한을 메모리에 캐싱하여 Firestore 조회 최소화
 * - 로그인/로그아웃 시 자동 초기화
 */

interface PermissionsCacheEntry {
  permissions: Record<PageIdentifier, PagePermissions | null>;
  lastFetchedAt: Date;
  userId: string;
}

interface PermissionsState {
  // 캐시된 권한 데이터
  cache: PermissionsCacheEntry | null;
  
  // 로딩 상태
  loading: boolean;
  
  // 에러 상태
  error: string | null;
}

interface PermissionsActions {
  // 권한 캐시 설정
  setPermissionsCache: (userId: string, permissions: Record<PageIdentifier, PagePermissions | null>) => void;
  
  // 특정 페이지 권한 캐시 업데이트
  setPagePermission: (pageId: PageIdentifier, permission: PagePermissions | null) => void;
  
  // 캐시 초기화 (userId 지정)
  initializeCache: (userId: string) => void;
  
  // 캐시 초기화
  clearCache: () => void;
  
  // 캐시 유효성 검사 (5분 이상 지나면 무효)
  isCacheValid: () => boolean;
  
  // 특정 페이지 권한 가져오기 (캐시에서)
  getPagePermission: (pageId: PageIdentifier) => PagePermissions | null | undefined;
  
  // 로딩 상태 설정
  setLoading: (loading: boolean) => void;
  
  // 에러 설정
  setError: (error: string | null) => void;
}

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5분

export const usePermissionsStore = create<PermissionsState & PermissionsActions>()(
  devtools(
    (set, get) => ({
      // State
      cache: null,
      loading: false,
      error: null,
      
      // Actions
      setPermissionsCache: (userId, permissions) => {
        set({
          cache: {
            userId,
            permissions,
            lastFetchedAt: new Date(),
          },
          loading: false,
          error: null,
        });
      },
      
      setPagePermission: (pageId, permission) => {
        const { cache } = get();
        
        if (!cache) {
          return;
        }
        
        set({
          cache: {
            ...cache,
            permissions: {
              ...cache.permissions,
              [pageId]: permission,
            },
            lastFetchedAt: new Date(), // 캐시 시간 갱신
          },
        });
      },
      
      // 캐시 초기화 (userId 지정)
      initializeCache: (userId: string) => {
        set({
          cache: {
            userId,
            permissions: {
              dashboard: null,
              'production-daily-report': null,
              'production-shortage-management': null,
              employees: null,
              payroll: null,
              settings: null,
            },
            lastFetchedAt: new Date(),
          },
        });
      },
      
      clearCache: () => {
        set({
          cache: null,
          loading: false,
          error: null,
        });
      },
      
      isCacheValid: () => {
        const { cache } = get();
        if (!cache) return false;
        
        const now = new Date();
        const diff = now.getTime() - cache.lastFetchedAt.getTime();
        return diff < CACHE_EXPIRY_MS;
      },
      
      getPagePermission: (pageId) => {
        const { cache } = get();
        if (!cache) return undefined;
        
        return cache.permissions[pageId];
      },
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
    }),
    { name: 'permissions-store' }
  )
);


