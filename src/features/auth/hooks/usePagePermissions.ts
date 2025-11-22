
import { useState, useEffect, useCallback } from 'react';
import { usePermissionsStore } from '../store/permissionsStore';
import { PermissionsService } from '../services/permissionsService';
import { useAuthStore } from '../store/authStore';
import type { PageIdentifier, CrudPermission } from '../types/permissions';

/**
 * 페이지별 권한 체크 훅
 * - 캐싱을 활용하여 Firestore 조회 최소화
 * - Admin은 모든 권한 자동 부여
 * 
 * @example
 * ```tsx
 * const { canRead, canCreate, canUpdate, canDelete, loading } = usePagePermissions('production-daily-report');
 * 
 * return (
 *   <div>
 *     {canRead && <DataView />}
 *     {canCreate && <CreateButton />}
 *     {canUpdate && <EditButton />}
 *     {canDelete && <DeleteButton />}
 *   </div>
 * );
 * ```
 */
export const usePagePermissions = (pageId: PageIdentifier) => {
  const { user, userProfile } = useAuthStore();
  const {
    cache,
    loading: storeLoading,
    isCacheValid,
    getPagePermission,
    setPagePermission,
    initializeCache,
    setLoading,
    setError,
  } = usePermissionsStore();

  const [localLoading, setLocalLoading] = useState(false);

  // Admin/Manager는 기본 권한 자동 부여 (userProfile에서 role 확인)
  const isAdmin = userProfile?.role === 'Admin';
  const isManager = userProfile?.role === 'Manager';

  // 권한 데이터 가져오기 (캐싱 활용)
  useEffect(() => {
    if (!user || !userProfile) {
      // 로그인 정보나 프로필 로딩 중
      return;
    }

    // Admin만 권한 조회 불필요 (Manager는 커스텀 권한 설정을 받을 수 있음)
    if (isAdmin) {
      return;
    }

    // 캐시가 유효하면 사용
    const cachedPermission = getPagePermission(pageId);
    if (cachedPermission !== undefined && isCacheValid()) {
      return;
    }

    // 캐시가 없거나 무효하면 Firestore에서 가져오기
    const fetchPermissions = async () => {
      setLocalLoading(true);
      setLoading(true);

      try {
        // 캐시가 없으면 먼저 초기화
        if (!cache) {
          initializeCache(user.uid);
        }
        
        const permissions = await PermissionsService.getUserPagePermissions(user.uid, pageId);
        setPagePermission(pageId, permissions);
      } catch (error) {
        console.error(`❌ [usePagePermissions] 권한 조회 실패: ${pageId}`, error);
        setError('권한 조회에 실패했습니다.');
      } finally {
        setLocalLoading(false);
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, userProfile, pageId, isAdmin, isManager, cache, isCacheValid, getPagePermission, setPagePermission, initializeCache, setLoading, setError]);

  // CRUD 권한 체크 헬퍼 함수
  const hasPermission = useCallback(
    (permission: CrudPermission): boolean => {
      // Admin은 모든 권한 보유
      if (isAdmin) return true;

      // 캐시에서 권한 가져오기 (함수 내부에서 최신 캐시 조회)
      const currentPermissions = getPagePermission(pageId);
      
      // 커스텀 권한 설정이 있으면 우선 적용
      if (currentPermissions) {
        return currentPermissions.crudPermissions.includes(permission);
      }

      // 권한 설정이 없는 경우 Manager는 기본 권한 부여 (delete 제외)
      if (isManager) {
        return permission !== 'delete';
      }

      // 권한 데이터가 없으면 false
      return false;
    },
    [isAdmin, isManager, getPagePermission, pageId]
  );

  // 커스텀 권한 체크 헬퍼 함수
  const hasCustomPermission = useCallback(
    (customPermissionKey: string): boolean => {
      // Admin/Manager는 모든 커스텀 권한 보유
      if (isAdmin || isManager) return true;

      // 캐시에서 권한 가져오기 (함수 내부에서 최신 캐시 조회)
      const currentPermissions = getPagePermission(pageId);
      
      // 권한 데이터가 없으면 false
      if (!currentPermissions || !currentPermissions.customPermissions) return false;

      // 커스텀 권한 객체에서 값 확인
      return (currentPermissions.customPermissions as Record<string, boolean>)[customPermissionKey] === true;
    },
    [isAdmin, isManager, getPagePermission, pageId]
  );

  return {
    // CRUD 권한
    canRead: hasPermission('read'),
    canCreate: hasPermission('create'),
    canUpdate: hasPermission('update'),
    canDelete: hasPermission('delete'),

    // 권한 체크 함수들
    hasPermission,
    hasCustomPermission,

    // 로딩 상태
    loading: localLoading || storeLoading,

    // 권한 데이터 (디버깅용)
    permissions: getPagePermission(pageId),

    // 역할 여부
    isAdmin,
    isManager,
  };
};

/**
 * 단일 권한 체크 훅 (CRUD 권한)
 * @param pageId 페이지 식별자
 * @param permission 체크할 권한
 */
export const useHasPermission = (pageId: PageIdentifier, permission: CrudPermission) => {
  const { hasPermission } = usePagePermissions(pageId);
  return hasPermission(permission);
};

/**
 * 커스텀 권한 체크 훅
 * @param pageId 페이지 식별자
 * @param customPermissionKey 커스텀 권한 키
 */
export const useHasCustomPermission = (pageId: PageIdentifier, customPermissionKey: string) => {
  const { hasCustomPermission } = usePagePermissions(pageId);
  return hasCustomPermission(customPermissionKey);
};

