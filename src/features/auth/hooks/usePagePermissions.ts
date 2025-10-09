'use client';

import { useAuthStore } from '../store/authStore';
import { useDevStore } from '@/app/store';
import type { PageIdentifier, CrudPermission, PermissionCheck, CustomPermissions } from '../types/permissions';
import { useState, useEffect } from 'react';

/**
 * 특정 페이지의 권한을 체크하는 훅
 * TODO: Firestore에서 사용자별 권한 데이터를 가져와야 함
 */
export const usePagePermissions = (pageId: PageIdentifier): PermissionCheck => {
  const { userProfile } = useAuthStore();
  const { dummyRole } = useDevStore();
  const [permissions, setPermissions] = useState<PermissionCheck>({
    canRead: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    customPermissions: {}
  });

  useEffect(() => {
    if (!userProfile) {
      setPermissions({
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        customPermissions: {}
      });
      return;
    }

    // 현재 권한 (더미 권한 우선)
    const currentRole = dummyRole || userProfile.role;

    // 기본 권한 설정 (임시 - 나중에 Firestore에서 가져와야 함)
    let canRead = true;
    let canCreate = true;
    let canUpdate = false;
    let canDelete = false;

    if (currentRole === 'Admin') {
      canRead = true;
      canCreate = true;
      canUpdate = true;
      canDelete = true;
    } else if (currentRole === 'Manager') {
      canRead = true;
      canCreate = true;
      canUpdate = true;
      canDelete = false;
    } else {
      // Member
      canRead = true;
      canCreate = true;
      canUpdate = false;
      canDelete = false;
    }

    // TODO: Firestore에서 사용자별 커스텀 권한 가져오기
    const customPermissions: Record<string, boolean> = {
      // 생산일보 커스텀 권한 예시
      viewProcessConditions: true,
      viewMemo: true,
      exportExcel: currentRole === 'Admin' || currentRole === 'Manager',
      viewSummary: true,
    };

    setPermissions({
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      customPermissions
    });
  }, [userProfile, dummyRole, pageId]);

  return permissions;
};

/**
 * 특정 CRUD 권한이 있는지 체크
 */
export const useHasPermission = (
  pageId: PageIdentifier, 
  permission: CrudPermission
): boolean => {
  const permissions = usePagePermissions(pageId);
  
  switch (permission) {
    case 'read':
      return permissions.canRead;
    case 'create':
      return permissions.canCreate;
    case 'update':
      return permissions.canUpdate;
    case 'delete':
      return permissions.canDelete;
    default:
      return false;
  }
};

/**
 * 커스텀 권한 체크
 */
export const useHasCustomPermission = (
  pageId: PageIdentifier,
  customPermission: string
): boolean => {
  const permissions = usePagePermissions(pageId);
  return permissions.customPermissions[customPermission] || false;
};

