/**
 * 사용자 권한 유틸리티
 * 
 * @deprecated
 * 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새로운 코드에서는 @/shared/utils/user/userUtils를 직접 사용하세요.
 * 
 * @example
 * // 기존 방식 (여전히 작동)
 * import { isAdmin } from '@/features/auth/utils/permissions';
 * 
 * // 권장 방식
 * import { isAdmin } from '@/shared/utils/user/userUtils';
 */

// 공통 유틸리티에서 re-export
export {
  isAdmin,
  isManager,
  hasRole,
  canManageData,
  canCreateData,
  canViewData,
} from '@/shared/utils/user/userUtils';

