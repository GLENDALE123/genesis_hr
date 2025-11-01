/**
 * 사용자 관련 유틸리티 함수들
 * 
 * @description
 * 프로젝트 전체에서 사용하는 User 관련 모든 헬퍼 함수를 제공합니다.
 * - 사용자 표시 정보 (이름, 이니셜)
 * - 역할 및 권한 확인
 * - UI 헬퍼 (배지 variant 등)
 */

import type { UserRole } from '@/features/auth/types';

// ============================================================================
// 타입 정의
// ============================================================================

interface UserLike {
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
}

interface UserWithRole extends UserLike {
  role?: UserRole | null;
}

// ============================================================================
// 사용자 표시 정보
// ============================================================================

/**
 * 사용자 표시 이름 가져오기
 * 
 * @description
 * 우선순위: user.displayName > user.email에서 이름 추출 > fallback
 * Firebase Auth가 Source of Truth이므로 user.displayName을 우선 사용
 * 
 * @param user - Firebase Auth 사용자 (우선순위 1)
 * @param userProfile - Firestore 사용자 프로필 (현재는 사용하지 않음, 호환성을 위해 유지)
 * @param fallback - 기본값 (기본: 'Unknown')
 * @returns 표시할 사용자 이름
 * 
 * @example
 * const userName = getUserDisplayName(user, userProfile); // "홍길동"
 * const userName = getUserDisplayName(user, null, '알 수 없음'); // "알 수 없음"
 */
export const getUserDisplayName = (
  user: UserLike | null | undefined,
  userProfile: UserLike | null | undefined = null,
  fallback: string = 'Unknown'
): string => {
  // 1순위: user.displayName (Firebase Auth에서 가져온 표시 이름)
  if (user?.displayName) {
    return user.displayName;
  }
  
  // 2순위: 이메일에서 이름 추출
  const email = user?.email;
  if (email) {
    const emailName = email.split('@')[0];
    // 이메일이 의미있는 이름인지 확인 (숫자나 특수문자만 있는 경우 제외)
    if (emailName && /[a-zA-Z가-힣]/.test(emailName)) {
      return emailName;
    }
  }
  
  // 3순위: fallback
  return fallback;
};

/**
 * 사용자 이니셜 가져오기
 * 
 * @description
 * 사용자의 표시 이름에서 첫 글자를 대문자로 반환
 * 
 * @param user - 사용자 객체
 * @param fallback - 기본값 (기본: '?')
 * @returns 사용자 이니셜 (대문자)
 * 
 * @example
 * const initial = getUserInitial(userProfile); // "홍"
 * const initial = getUserInitial(null, 'U'); // "U"
 */
export const getUserInitial = (
  user: UserLike | null | undefined,
  fallback: string = '?'
): string => {
  const displayName = getUserDisplayName(user, null, fallback);
  return displayName.charAt(0).toUpperCase();
};

// ============================================================================
// 역할 및 권한 확인
// ============================================================================

/**
 * 사용자가 관리자 권한을 가지고 있는지 확인
 * 
 * @param user - 사용자 객체
 * @returns Admin 권한 여부
 * 
 * @example
 * if (isAdmin(userProfile)) {
 *   // 관리자만 접근 가능한 기능
 * }
 */
export const isAdmin = (user: UserWithRole | null | undefined): boolean => {
  return user?.role === 'Admin';
};

/**
 * 사용자가 매니저 이상 권한을 가지고 있는지 확인
 * 
 * @param user - 사용자 객체
 * @returns Manager 이상 권한 여부 (Admin 또는 Manager)
 * 
 * @example
 * if (isManager(userProfile)) {
 *   // 매니저 이상만 접근 가능한 기능
 * }
 */
export const isManager = (user: UserWithRole | null | undefined): boolean => {
  return user?.role === 'Admin' || user?.role === 'Manager';
};

/**
 * 사용자가 특정 역할을 가지고 있는지 확인
 * 
 * @param user - 사용자 객체
 * @param role - 확인할 역할
 * @returns 해당 역할 여부
 * 
 * @example
 * if (hasRole(userProfile, 'Manager')) {
 *   // 매니저 역할 확인
 * }
 */
export const hasRole = (user: UserWithRole | null | undefined, role: UserRole): boolean => {
  return user?.role === role;
};

/**
 * 사용자가 데이터를 수정/삭제할 수 있는지 확인
 * 
 * @description
 * Admin, Manager만 데이터 수정/삭제 가능
 * 
 * @param user - 사용자 객체
 * @returns 데이터 관리 권한 여부
 * 
 * @example
 * if (canManageData(userProfile)) {
 *   // 수정/삭제 버튼 표시
 * }
 */
export const canManageData = (user: UserWithRole | null | undefined): boolean => {
  return isManager(user);
};

/**
 * 사용자가 데이터를 생성할 수 있는지 확인
 * 
 * @description
 * 로그인된 모든 사용자 가능
 * 
 * @param user - 사용자 객체
 * @returns 데이터 생성 권한 여부
 */
export const canCreateData = (user: UserWithRole | null | undefined): boolean => {
  return !!user;
};

/**
 * 사용자가 데이터를 조회할 수 있는지 확인
 * 
 * @description
 * 로그인된 모든 사용자 가능
 * 
 * @param user - 사용자 객체
 * @returns 데이터 조회 권한 여부
 */
export const canViewData = (user: UserWithRole | null | undefined): boolean => {
  return !!user;
};

// ============================================================================
// UI 헬퍼 함수
// ============================================================================

/**
 * 사용자 역할에 따른 Badge variant 반환
 * 
 * @description
 * Shadcn/ui Badge 컴포넌트에 사용할 variant 반환
 * - Admin: 'default' (파란색)
 * - Manager: 'secondary' (회색)
 * - Member: 'outline' (테두리만)
 * 
 * @param user - 사용자 객체
 * @returns Badge variant ('default' | 'secondary' | 'outline')
 * 
 * @example
 * <Badge variant={getUserRoleBadgeVariant(userProfile)}>
 *   {userProfile.role}
 * </Badge>
 */
export const getUserRoleBadgeVariant = (
  user: UserWithRole | null | undefined
): 'default' | 'secondary' | 'outline' => {
  if (!user?.role) return 'outline';
  
  switch (user.role) {
    case 'Admin':
      return 'default';
    case 'Manager':
      return 'secondary';
    case 'Member':
    default:
      return 'outline';
  }
};

/**
 * 사용자 역할 표시 텍스트 가져오기
 * 
 * @param user - 사용자 객체
 * @param fallback - 기본값 (기본: 'Member')
 * @returns 역할 텍스트
 * 
 * @example
 * const roleText = getUserRoleText(userProfile); // "Admin"
 */
export const getUserRoleText = (
  user: UserWithRole | null | undefined,
  fallback: string = 'Member'
): string => {
  return user?.role || fallback;
};

