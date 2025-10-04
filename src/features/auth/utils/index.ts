import { AUTH_VALIDATION_RULES, AUTH_ERROR_MESSAGES } from '@/features/auth/constants';

// 유효성 검증 결과 타입
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// 이메일 형식 검증
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: '이메일을 입력해주세요.' };
  }
  
  if (!AUTH_VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return { isValid: false, error: '올바른 이메일 형식을 입력해주세요.' };
  }
  
  return { isValid: true };
};

// 로그인 아이디 검증
export const validateLoginId = (loginId: string): ValidationResult => {
  if (!loginId.trim()) {
    return { isValid: false, error: AUTH_ERROR_MESSAGES.LOGIN_ID_REQUIRED };
  }
  
  const trimmedLoginId = loginId.trim();
  
  if (trimmedLoginId.length < AUTH_VALIDATION_RULES.LOGIN_ID.MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `로그인 아이디는 최소 ${AUTH_VALIDATION_RULES.LOGIN_ID.MIN_LENGTH}자 이상이어야 합니다.` 
    };
  }
  
  if (trimmedLoginId.length > AUTH_VALIDATION_RULES.LOGIN_ID.MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `로그인 아이디는 최대 ${AUTH_VALIDATION_RULES.LOGIN_ID.MAX_LENGTH}자까지 가능합니다.` 
    };
  }
  
  if (!AUTH_VALIDATION_RULES.LOGIN_ID.PATTERN.test(trimmedLoginId)) {
    return { 
      isValid: false, 
      error: '로그인 아이디는 영문, 숫자, 언더스코어(_)만 사용할 수 있습니다.' 
    };
  }
  
  return { isValid: true };
};

// 비밀번호 검증
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: '비밀번호를 입력해주세요.' };
  }
  
  if (password.length < AUTH_VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `비밀번호는 최소 ${AUTH_VALIDATION_RULES.PASSWORD.MIN_LENGTH}자 이상이어야 합니다.` 
    };
  }
  
  if (password.length > AUTH_VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `비밀번호는 최대 ${AUTH_VALIDATION_RULES.PASSWORD.MAX_LENGTH}자까지 가능합니다.` 
    };
  }
  
  return { isValid: true };
};

// 표시 이름 검증
export const validateDisplayName = (displayName: string): ValidationResult => {
  if (!displayName.trim()) {
    return { isValid: true }; // 선택사항이므로 빈 값도 허용
  }
  
  if (displayName.trim().length > AUTH_VALIDATION_RULES.DISPLAY_NAME.MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `표시 이름은 최대 ${AUTH_VALIDATION_RULES.DISPLAY_NAME.MAX_LENGTH}자까지 가능합니다.` 
    };
  }
  
  return { isValid: true };
};

// 이메일 또는 로그인 아이디 형식 판단
export const isEmailFormat = (input: string): boolean => {
  return input.includes('@');
};

// 회원가입 폼 전체 검증
export const validateSignUpForm = (formData: {
  email: string;
  password: string;
  loginId: string;
  displayName?: string;
}): ValidationResult => {
  // 이메일 검증
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }
  
  // 로그인 아이디 검증
  const loginIdValidation = validateLoginId(formData.loginId);
  if (!loginIdValidation.isValid) {
    return loginIdValidation;
  }
  
  // 비밀번호 검증
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }
  
  // 표시 이름 검증 (선택사항)
  if (formData.displayName) {
    const displayNameValidation = validateDisplayName(formData.displayName);
    if (!displayNameValidation.isValid) {
      return displayNameValidation;
    }
  }
  
  return { isValid: true };
};

// 로그인 폼 검증
export const validateLoginForm = (formData: {
  emailOrLoginId: string;
  password: string;
}): ValidationResult => {
  if (!formData.emailOrLoginId.trim()) {
    return { isValid: false, error: '이메일 또는 로그인 아이디를 입력해주세요.' };
  }
  
  if (!formData.password) {
    return { isValid: false, error: '비밀번호를 입력해주세요.' };
  }
  
  // 이메일 형식인 경우 이메일 검증
  if (isEmailFormat(formData.emailOrLoginId)) {
    const emailValidation = validateEmail(formData.emailOrLoginId);
    if (!emailValidation.isValid) {
      return emailValidation;
    }
  } else {
    // 로그인 아이디 형식인 경우 로그인 아이디 검증
    const loginIdValidation = validateLoginId(formData.emailOrLoginId);
    if (!loginIdValidation.isValid) {
      return loginIdValidation;
    }
  }
  
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }
  
  return { isValid: true };
};

// 입력값 정리 (앞뒤 공백 제거)
export const sanitizeInput = (input: string): string => {
  return input.trim();
};

// 에러 메시지 포맷팅
export const formatAuthError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '알 수 없는 오류가 발생했습니다.';
};

// Firebase 에러 메시지를 한국어로 변환
export const translateFirebaseError = (errorCode: string): string => {
  const errorMap: Record<string, string> = {
    'auth/user-not-found': '존재하지 않는 계정입니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password': '비밀번호가 너무 약합니다.',
    'auth/invalid-email': '올바르지 않은 이메일 형식입니다.',
    'auth/user-disabled': '비활성화된 계정입니다.',
    'auth/too-many-requests': '너무 많은 요청으로 인해 일시적으로 차단되었습니다.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
  };
  
  return errorMap[errorCode] || '인증 중 오류가 발생했습니다.';
};
