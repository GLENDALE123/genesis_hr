import { useAuthStore } from '@/features/auth/store/authStore';
import { canSyncDailyReports, canSyncProductionSchedules } from '@/shared/utils/permissions';

export const useCanSyncDailyReports = (): boolean => {
  const { userProfile } = useAuthStore();
  return canSyncDailyReports(userProfile);
};

export const useCanSyncProductionSchedules = (): boolean => {
  const { userProfile } = useAuthStore();
  return canSyncProductionSchedules(userProfile);
};





