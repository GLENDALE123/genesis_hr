// Auth 피처 진입점

// Components
export { AuthProvider } from './components/AuthProvider';
export { ProtectedRoute } from './components/ProtectedRoute';
export { LoginForm } from './components/LoginForm';

// Hooks
export { useAuth } from './hooks/useAuth';

// Services
export { AuthService } from './services';

// Store
export { useAuthStore } from './store';

// Types
export type { UserProfile, SignUpData, LoginData, AuthState } from './types';

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
