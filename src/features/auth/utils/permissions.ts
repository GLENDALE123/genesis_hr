import { UserProfile, UserRole } from '../types';

/**
 * 사용자가 관리자 권한을 가지고 있는지 확인
 */
export const isAdmin = (userProfile: UserProfile | null): boolean => {
  return userProfile?.role === 'Admin';
};

/**
 * 사용자가 매니저 이상 권한을 가지고 있는지 확인
 */
export const isManager = (userProfile: UserProfile | null): boolean => {
  return userProfile?.role === 'Admin' || userProfile?.role === 'Manager';
};

/**
 * 사용자가 특정 역할을 가지고 있는지 확인
 */
export const hasRole = (userProfile: UserProfile | null, role: UserRole): boolean => {
  return userProfile?.role === role;
};

/**
 * 사용자가 데이터를 수정/삭제할 수 있는지 확인
 * Admin, Manager만 가능
 */
export const canManageData = (userProfile: UserProfile | null): boolean => {
  return isManager(userProfile);
};

/**
 * 사용자가 데이터를 생성할 수 있는지 확인
 * 로그인된 모든 사용자 가능
 */
export const canCreateData = (userProfile: UserProfile | null): boolean => {
  return !!userProfile;
};

/**
 * 사용자가 데이터를 조회할 수 있는지 확인
 * 로그인된 모든 사용자 가능
 */
export const canViewData = (userProfile: UserProfile | null): boolean => {
  return !!userProfile;
};

