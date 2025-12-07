import type { UserRole } from '@/features/auth/types';
import syncPermissions from '../../config/syncPermissions.json';

type RoleLike = {
  role?: UserRole | null;
};

type SyncPermissionKey = keyof typeof syncPermissions;

const hasPermission = (user: RoleLike | null | undefined, key: SyncPermissionKey): boolean => {
  const allowedRoles = syncPermissions[key] || [];
  const userRole = user?.role;

  if (!userRole) {
    return false;
  }

  return allowedRoles.includes(userRole);
};

export const canSyncDailyReports = (user: RoleLike | null | undefined): boolean => {
  return hasPermission(user, 'syncDailyReports');
};

export const canSyncProductionSchedules = (user: RoleLike | null | undefined): boolean => {
  return hasPermission(user, 'syncProductionSchedules');
};

