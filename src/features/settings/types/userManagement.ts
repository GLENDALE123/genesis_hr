/**
 * 유저 관리 관련 타입 정의
 */

import type { UserRole } from '@/features/auth/types';

/**
 * 편집 가능한 유저 데이터
 */
export interface EditableUserData {
  displayName?: string;
  phoneNumber?: string;
  role: UserRole;
  position?: string;
  department?: string;
}

