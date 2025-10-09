'use client';

import { useAuthStore } from '../store/authStore';
import { useDevStore } from '@/app/store';
import type { UserRole } from '@/features/auth/types';

/**
 * 사용자 권한을 가져오는 훅
 * 개발 모드에서는 더미 권한 우선 사용
 */
export const useUserRole = (): UserRole | null => {
  const { userProfile } = useAuthStore();
  const { dummyRole } = useDevStore();
  
  // 더미 권한이 설정되어 있으면 더미 권한 사용 (개발용)
  if (dummyRole) {
    return dummyRole;
  }
  
  // 일반 모드에서는 실제 권한 사용
  return userProfile?.role || null;
};

/**
 * 특정 권한이 있는지 확인하는 훅
 */
export const useHasRole = (requiredRole: UserRole | UserRole[]): boolean => {
  const role = useUserRole();
  
  if (!role) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(role);
  }
  
  return role === requiredRole;
};

/**
 * Admin 권한이 있는지 확인하는 훅
 */
export const useIsAdmin = (): boolean => {
  return useHasRole('Admin');
};

/**
 * Manager 이상 권한이 있는지 확인하는 훅
 */
export const useIsManager = (): boolean => {
  return useHasRole(['Admin', 'Manager']);
};

