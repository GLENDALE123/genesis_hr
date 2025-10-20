/**
 * 지그센터 상수 정의
 */

import { JigStatus } from '../types';

export const JIG_COLLECTIONS = {
  REQUESTS: 'jig-requests',
  MASTER: 'jig-master',
  MASTER_DATA: 'jig-master-data',
} as const;

export const JIG_STORAGE_PATHS = {
  IMAGES: 'jig-images',
} as const;

export const STATUS_FILTERS: JigStatus[] = [
  JigStatus.Request,
  JigStatus.Hold,
  JigStatus.InProgress,
  JigStatus.Receiving,
  JigStatus.Rejected,
  JigStatus.Completed,
];

export const PRODUCTION_TYPES = ['증착용', '코팅용', '내부코팅용'] as const;

export const STATUS_COLORS: Record<JigStatus, string> = {
  [JigStatus.Request]: '#3b82f6', // 파란색
  [JigStatus.Hold]: '#f97316', // 주황색
  [JigStatus.InProgress]: '#f59e0b', // 노란색
  [JigStatus.Receiving]: '#06b6d4', // 하늘색
  [JigStatus.Rejected]: '#ef4444', // 빨간색
  [JigStatus.Completed]: '#22c55e', // 초록색
};

export const STATUS_BADGE_VARIANTS: Record<JigStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [JigStatus.Request]: 'default',
  [JigStatus.Hold]: 'outline',
  [JigStatus.InProgress]: 'secondary',
  [JigStatus.Receiving]: 'secondary',
  [JigStatus.Rejected]: 'destructive',
  [JigStatus.Completed]: 'default',
};

export const DEFAULT_MASTER_DATA = {
  requesters: [],
  destinations: [],
  approvers: [],
  requestTypes: [...PRODUCTION_TYPES],
};