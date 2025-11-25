/**
 * Settings Feature Exports
 */

// Hooks
export { useSettings } from './hooks/useSettings';
export { useNotificationPermission } from './hooks/useNotificationPermission';

// Types
export type {
  UserSettings,
  NotificationSettings,
  ProfileSettings,
  AppearanceSettings,
  NotificationChannelType,
  NotificationChannelSettings,
  NotificationSchedule,
  Platform,
} from '@/shared/types/settings';

export { NOTIFICATION_CHANNELS, DEFAULT_SETTINGS } from '@/shared/types/settings';

// Services
export { settingsService } from '@/shared/services/settings/settingsService';


