'use client';

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
    setLoading,
    setError,
  } = usePermissionsStore();

  const [localLoading, setLocalLoading] = useState(false);

  // Admin은 모든 권한 자동 부여 (userProfile에서 role 확인)
  const isAdmin = userProfile?.role === 'Admin';

  // 권한 데이터 가져오기 (캐싱 활용)
  useEffect(() => {
    if (!user || !userProfile) {
      // 로그인 정보나 프로필 로딩 중
      return;
    }

    // Admin은 권한 조회 불필요
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
  }, [user, userProfile, pageId, isAdmin, isCacheValid, getPagePermission, setPagePermission, setLoading, setError]);

  // 캐시에서 권한 가져오기
  const pagePermissions = isAdmin ? null : getPagePermission(pageId);

  // CRUD 권한 체크 헬퍼 함수
  const hasPermission = useCallback(
    (permission: CrudPermission): boolean => {
      // Admin은 모든 권한 보유
      if (isAdmin) return true;

      // 권한 데이터가 없으면 false
      if (!pagePermissions) return false;

      // 권한 배열에 포함되어 있는지 확인
      return pagePermissions.crudPermissions.includes(permission);
    },
    [isAdmin, pagePermissions]
  );

  // 커스텀 권한 체크 헬퍼 함수
  const hasCustomPermission = useCallback(
    (customPermissionKey: string): boolean => {
      // Admin은 모든 권한 보유
      if (isAdmin) return true;

      // 권한 데이터가 없으면 false
      if (!pagePermissions || !pagePermissions.customPermissions) return false;

      // 커스텀 권한 객체에서 값 확인
      return (pagePermissions.customPermissions as any)[customPermissionKey] === true;
    },
    [isAdmin, pagePermissions]
  );

  return {
    // CRUD 권한
    canRead: hasPermission('read'),
    canCreate: hasPermission('create'),
    canUpdate: hasPermission('update'),
    canDelete: hasPermission('delete'),

    // 커스텀 권한 체크 함수
    hasCustomPermission,

    // 로딩 상태
    loading: localLoading || storeLoading,

    // 권한 데이터 (디버깅용)
    permissions: pagePermissions,

    // Admin 여부
    isAdmin,
  };
};
