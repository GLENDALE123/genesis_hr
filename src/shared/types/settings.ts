/**
 * 설정 관련 타입 정의
 * 멀티 플랫폼(웹, Electron, 모바일) 지원
 */

// 알림 채널 정의 (중앙 관리 - 동적 확장 가능)
// Functions에서 사용하는 실제 타입과 일치
export const NOTIFICATION_CHANNELS = {
  'production-request': {
    label: '생산관리부 요청사항',
    icon: 'CalendarClock',
    description: '생산관리부 요청 등록 알림',
    section: 'production-center',
  },
  'shortage-request': {
    label: '부족분 신청',
    icon: 'AlertTriangle',
    description: '부족분 신청 알림',
    section: 'production-center',
  },
  'production-schedule': {
    label: '생산일정 변경',
    icon: 'CalendarDays',
    description: '생산일정 변경 알림',
    section: 'production-center',
  },
  'daily-report': {
    label: '생산일보 상태 변경',
    icon: 'FileText',
    description: '생산일보 상태 변경 알림',
    section: 'production-center',
  },
  'sample-status': {
    label: '샘플 요청 상태 변경',
    icon: 'TestTube',
    description: '샘플 요청 상태 변경 알림',
    section: 'sample-center',
  },
  'sample-request': {
    label: '샘플 요청',
    icon: 'TestTube',
    description: '샘플 요청 등록 알림',
    section: 'sample-center',
  },
  'comment-mention': {
    label: '댓글',
    icon: 'MessageSquare',
    description: '댓글 및 멘션 알림',
    section: 'communication',
  },
  'quality-issue-created': {
    label: '품질이슈 등록',
    icon: 'ShieldAlert',
    description: '품질이슈 등록 알림',
    section: 'quality-center',
  },
  'quality-issue-status': {
    label: '품질이슈 상태 변경',
    icon: 'ShieldAlert',
    description: '품질이슈 상태 변경 및 항목 추가 알림',
    section: 'quality-center',
  },
  'jig-request': {
    label: '지그 요청 등록',
    icon: 'Wrench',
    description: '지그 요청/관리 신규 요청 등록 알림',
    section: 'jig-center',
  },
  'jig-receive': {
    label: '지그 입고 처리',
    icon: 'PackageCheck',
    description: '지그 요청/관리 입고 처리 알림',
    section: 'jig-center',
  },
  'announcement': {
    label: '공지사항',
    icon: 'Megaphone',
    description: '새 공지사항 등록 알림',
    section: 'communication',
  },
  'work-schedule': {
    label: '근무계획',
    icon: 'CalendarClock',
    description: '근무계획 등록/변경 알림',
    section: 'communication',
  },
  // 🆕 새 채널 추가 시 여기만 수정하면 UI 자동 업데이트
} as const;

export type NotificationChannelType = keyof typeof NOTIFICATION_CHANNELS;

// 동적 채널 설정 (어떤 채널이든 추가 가능)
export type NotificationChannelSettings = Record<NotificationChannelType, boolean>;

// 알림 시간대 설정
export interface NotificationSchedule {
  enabled: boolean; // 시간대 제한 ON/OFF
  weekdays: {
    enabled: boolean; // 평일 알림 받기
    startTime: string; // "09:00"
    endTime: string; // "18:00"
  };
  weekends: {
    enabled: boolean; // 주말 알림 받기
    startTime: string; // "09:00"
    endTime: string; // "17:00"
  };
}

// 알림 설정
export interface NotificationSettings {
  enabled: boolean; // 전체 알림 ON/OFF
  channels: NotificationChannelSettings;
  schedule: NotificationSchedule;
  sound: boolean; // 소리 (Electron, 모바일)
  vibration: boolean; // 진동 (모바일만)
}

// 프로필 설정
export interface ProfileSettings {
  displayName: string;
  photoURL: string | null;
  phoneNumber: string | null;
  department: string | null;
}

// 화면 설정
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
}

// 전체 사용자 설정
export interface UserSettings {
  notifications: NotificationSettings;
  profile: ProfileSettings;
  appearance: AppearanceSettings;
}

// 플랫폼 타입
export type Platform = 'web' | 'desktop' | 'mobile';

// 기본 설정값
export const DEFAULT_SETTINGS: UserSettings = {
  notifications: {
    enabled: true,
    channels: {
        'production-request': true,
        'shortage-request': true,
        'production-schedule': true,
        'daily-report': true,
        'sample-request': true,
        'sample-status': true,
        'comment-mention': true,
        'quality-issue-created': true,
        'announcement': true,
        'work-schedule': true,
        'quality-issue-status': true,
        'jig-request': true,
        'jig-receive': true,
    },
    schedule: {
      enabled: false,
      weekdays: {
        enabled: true,
        startTime: '09:00',
        endTime: '18:00',
      },
      weekends: {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
      },
    },
    sound: true,
    vibration: true,
  },
  profile: {
    displayName: '',
    photoURL: null,
    phoneNumber: null,
    department: null,
  },
  appearance: {
    theme: 'system',
    fontSize: 'medium',
  },
};

