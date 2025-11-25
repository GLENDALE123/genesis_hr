/**
 * 부서 관련 공통 상수
 * 
 * 품질 이슈, 사용자 프로필 등에서 공통으로 사용하는 부서 목록
 */

// HS-Jig와 동일한 부서 목록
export const DEPARTMENT_OPTIONS = [
  '개발실',
  '금형실', 
  '영업팀',
  '샘플팀',
  '생산관리부',
  '품질관리부',
  '사출실',
  '착색실',
  '인쇄실',
  '조립실',
  '화성공장 증착팀',
  '제품관리부'
] as const;

// 각 부서별 다른 색상 적용 (품질 이슈 등에서 사용)
export const DEPARTMENT_COLORS = {
  '개발실': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
  '금형실': 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200',
  '영업팀': 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200',
  '샘플팀': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200',
  '생산관리부': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
  '품질관리부': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  '사출실': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200',
  '착색실': 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200',
  '인쇄실': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200',
  '조립실': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
  '화성공장 증착팀': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  '제품관리부': 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200',
} as const;

export type Department = typeof DEPARTMENT_OPTIONS[number];

/**
 * 부서명 정규화 (호환성 유지)
 * @param department - 정규화할 부서명
 * @returns 정규화된 부서명
 */
export const normalizeDepartmentName = (department: string | null | undefined): string => {
  if (!department) return '';
  
  // 이미 올바른 부서명인 경우 그대로 반환
  if (DEPARTMENT_OPTIONS.includes(department as Department)) {
    return department;
  }
  
  // 매핑되지 않는 경우 빈 문자열 반환
  return '';
};

