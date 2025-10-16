// 상태별 색상 상수
export const STATUS_COLORS = {
  '미해결': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  '진행중': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  '해결완료': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  // 영어 상태값도 추가
  'open': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  'resolved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  'closed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
} as const;

export const PRIORITY_COLORS = {
  'urgent': 'bg-red-500 text-white',
  'high': 'bg-orange-500 text-white',
  'normal': 'bg-yellow-500 text-white',
  'low': 'bg-gray-500 text-white',
} as const;

// HS-Jig와 동일한 상수들
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
  '증착/코팅/내부코팅',
  '제품관리부'
] as const;

export const REGISTRATION_KEYWORD_OPTIONS = [
  '견본요청',
  '견본도착', 
  '한도생산'
] as const;

export const PROCESS_KEYWORD_OPTIONS = [
  'DP',
  '내부코팅',
  '박',
  '사출',
  '인쇄',
  '조립',
  '증착',
  '코팅'
] as const;

export const DEFECT_KEYWORD_OPTIONS = [
  '가스',
  '기름',
  '기포',
  '기능불량',
  '내부코팅',
  '미성형',
  '미증착',
  '변형',
  '색상차이',
  '수축',
  '스크레치',
  '웰드',
  '과열',
  '찍힘',
  '침식',
  '크랙',
  '흑점',
  'wetting'
] as const;

// 각 부서별 다른 색상 적용
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
  '증착/코팅/내부코팅': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  '제품관리부': 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200',
} as const;

export const PRIORITY_OPTIONS = [
  { value: 'low', label: '낮음', color: 'bg-blue-100 text-blue-800' },
  { value: 'normal', label: '보통', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: '높음', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: '긴급', color: 'bg-red-100 text-red-800' }
] as const;

export const CATEGORY_OPTIONS = [
  '외관불량',
  '치수불량',
  '색상불량',
  '기능불량',
  '재질불량',
  '공정불량',
  '설비불량',
  '원자재불량',
  '포장불량',
  '기타'
] as const;

