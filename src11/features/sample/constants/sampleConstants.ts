/**
 * 샘플센터 관련 상수 정의
 * HS-Jig 프로젝트의 constants.ts 참고
 */

import { SampleStatus } from '../types';

/**
 * 샘플 상태별 Tailwind CSS 클래스
 */
export const SAMPLE_STATUS_COLORS: Record<SampleStatus, string> = {
  [SampleStatus.Received]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  [SampleStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  [SampleStatus.OnHold]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  [SampleStatus.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  [SampleStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

/**
 * 샘플 상태 필터 목록
 */
export const SAMPLE_STATUS_FILTERS: SampleStatus[] = [
  SampleStatus.Received,
  SampleStatus.InProgress,
  SampleStatus.OnHold,
  SampleStatus.Rejected,
  SampleStatus.Completed,
];

/**
 * 코팅/증착 방식 목록
 */
export const COATING_METHODS = [
  '증착',
  '컬러코팅',
  '무광코팅',
  '클리어코팅',
  '내부코팅'
];

/**
 * 후가공 옵션 목록
 */
export const POST_PROCESSING_OPTIONS = [
  '인쇄',
  '박',
  '라벨',
  '조립'
];

/**
 * Firestore 컬렉션 이름
 */
export const SAMPLE_REQUESTS_COLLECTION = 'sample-requests';


