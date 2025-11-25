/**
 * 유저 역할 관련 상수
 */

import type { UserRole } from '@/features/auth/types';

// 역할 표시 레이블
export const ROLE_LABELS: Record<UserRole, string> = {
  Admin: '관리자',
  Manager: '매니저',
  Member: '멤버',
} as const;

// 역할 뱃지 색상 (Tailwind CSS 클래스)
export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  Admin: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
  Manager: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  Member: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200',
} as const;

// 역할 옵션 (Select 컴포넌트용)
export const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'Admin', label: '관리자' },
  { value: 'Manager', label: '매니저' },
  { value: 'Member', label: '멤버' },
] as const;

