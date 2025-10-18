// Shared 모듈 진입점
export * from './components';
export * from './services/firebase';
export * from './services/comments';
export * from './utils';
export * from './hooks';

// Store exports (중앙 집중식 관리)
export { useGlobalStore } from '@/app/store';
export { useAuthStore } from '@/features/auth';
export { useDashboardStore } from '@/features/dashboard';