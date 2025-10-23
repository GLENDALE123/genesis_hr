export interface WorkSchedule {
  id: string;
  date: string; // YYYY-MM-DD 형식
  type: WorkType;
  description: string;
}

export type WorkType = 
  | '기본근무'
  | '기본+잔업근무'
  | '토요근무(전체)'
  | '휴일근무(전체)'
  | '토요 부분근무'
  | '휴일 부분근무'
  | '주말 부분근무'
  | '라인정비'
  | '활성탄 교체 공사'
  | '기타 공사'
  | '휴무';

export interface WorkTypeConfig {
  description: string;
  color: string;
  icon: string;
}

export const WORK_TYPES: Record<WorkType, WorkTypeConfig> = {
  '기본근무': { description: '08시-17시', color: '#3b82f6', icon: '🔵' },
  '기본+잔업근무': { description: '08시-20시', color: '#3b82f6', icon: '🔵' },
  '토요근무(전체)': { description: '08시-17시', color: '#f59e0b', icon: '🟠' },
  '휴일근무(전체)': { description: '08시-17시', color: '#f59e0b', icon: '🟠' },
  '토요 부분근무': { description: '08시-17시', color: '#f59e0b', icon: '🟠' },
  '휴일 부분근무': { description: '08시-17시', color: '#f59e0b', icon: '🟠' },
  '주말 부분근무': { description: '', color: '#f59e0b', icon: '🟠' },
  '라인정비': { description: '', color: '#10b981', icon: '🟢' },
  '활성탄 교체 공사': { description: '', color: '#ef4444', icon: '🔴' },
  '기타 공사': { description: '', color: '#6366f1', icon: '🟣' },
  '휴무': { description: '휴무', color: '#64748b', icon: '⚫' }
};

export const HOLIDAYS: Record<number, Record<string, string>> = {
  2024: {
    '1-1': '신정', '2-9': '설날', '2-10': '설날', '2-11': '설날', '2-12': '대체공휴일',
    '3-1': '삼일절', '4-10': '국회의원선거', '5-1': '근로자의 날', '5-5': '어린이날',
    '5-6': '대체공휴일', '5-15': '부처님오신날', '6-6': '현충일', '8-15': '광복절',
    '9-16': '추석', '9-17': '추석', '9-18': '추석', '10-3': '개천절',
    '10-9': '한글날', '12-25': '크리스마스'
  },
  2025: {
    '1-1': '신정', '1-28': '설날', '1-29': '설날', '1-30': '설날',
    '3-1': '삼일절', '5-1': '근로자의 날', '5-5': '어린이날',
    '5-6': '부처님오신날', '6-6': '현충일', '8-15': '광복절',
    '10-3': '개천절', '10-6': '추석', '10-7': '추석', '10-8': '추석',
    '10-9': '한글날', '12-25': '크리스마스'
  },
  2026: {
    '1-1': '신정', '2-16': '설날', '2-17': '설날', '2-18': '설날',
    '3-1': '삼일절', '3-2': '대체공휴일', '5-1': '근로자의 날',
    '5-5': '어린이날', '5-25': '부처님오신날', '6-6': '현충일', '8-15': '광복절',
    '9-24': '추석', '9-25': '추석', '9-26': '추석', '10-3': '개천절',
    '10-9': '한글날', '12-25': '크리스마스'
  },
  2027: {
    '1-1': '신정', '2-6': '설날', '2-7': '설날', '2-8': '설날', '2-9': '대체공휴일',
    '3-1': '삼일절', '5-1': '근로자의 날', '5-5': '어린이날',
    '5-14': '부처님오신날', '6-6': '현충일', '8-15': '광복절',
    '9-14': '추석', '9-15': '추석', '9-16': '추석', '10-3': '개천절',
    '10-4': '대체공휴일', '10-9': '한글날', '12-25': '크리스마스'
  }
};

export interface CalendarDay {
  day: number;
  dateString: string; // YYYY-MM-DD 형식
  isCurrentMonth: boolean;
  dayOfWeek: number; // 0=일요일, 6=토요일
  holiday?: string;
  schedule?: WorkSchedule;
}

export interface ScheduleSummary {
  '총 근무일': number;
  '휴무/휴일': number;
  [key: string]: number;
}
