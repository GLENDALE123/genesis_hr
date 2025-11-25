// Auth 피처 진입점

// Components
export { AuthProvider } from './components/AuthProvider';
export { ProtectedRoute } from './components/ProtectedRoute';
export { LoginForm } from './components/LoginForm';
export { PermissionSettingsButton } from './components/PermissionSettingsButton';

// Hooks
// useAuth는 삭제됨 - useAuthStore를 직접 사용하세요
export { useUserRole, useHasRole, useIsAdmin, useIsManager } from './hooks/useUserRole';
export { usePagePermissions, useHasPermission, useHasCustomPermission } from './hooks/usePagePermissions';

// Services
export { AuthService } from './services';
export { PermissionsService } from './services/permissionsService';

// Store
export { useAuthStore } from './store';

// Types
export type { UserProfile, SignUpData, LoginData, AuthState, UserRole } from './types';
export type { 
  UserPermissions, 
  PagePermissions, 
  PageIdentifier, 
  CrudPermission,
  CustomPermissions,
  PermissionCheck 
} from './types/permissions';

// Constants
export { 
  AUTH_ERROR_MESSAGES,
  AUTH_VALIDATION_RULES,
  FORM_PLACEHOLDERS,
  FORM_LABELS,
  BUTTON_TEXTS,
  CARD_TEXTS
} from './constants';

// Utils
export {
  validateEmail,
  validatePassword,
  validateName,
  validatePosition,
  validateDepartment,
  validateConfirmPassword,
  validateSignUpForm,
  validateLoginForm,
  sanitizeInput,
  formatAuthError,
  translateFirebaseError
} from './utils';

// Permissions
export {
  isAdmin,
  isManager,
  hasRole,
  canManageData,
  canCreateData,
  canViewData
} from './utils/permissions';
