/**
 * 지그센터 상수 정의
 */

import { JigStatus } from '../types';

export const JIG_COLLECTIONS = {
  REQUESTS: 'jig-requests',
  MASTER: 'jig-masters',
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
  [JigStatus.Request]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  [JigStatus.Hold]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  [JigStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  [JigStatus.Receiving]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
  [JigStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  [JigStatus.Completed]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
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