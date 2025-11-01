import { AUTH_VALIDATION_RULES } from '@/features/auth/constants';

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

// 이름 검증
export const validateName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: '이름을 입력해주세요.' };
  }
  
  if (name.trim().length > AUTH_VALIDATION_RULES.NAME.MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `이름은 최대 ${AUTH_VALIDATION_RULES.NAME.MAX_LENGTH}자까지 가능합니다.` 
    };
  }
  
  return { isValid: true };
};

// 직책 검증
export const validatePosition = (position: string): ValidationResult => {
  if (!position.trim()) {
    return { isValid: true }; // 선택사항이므로 빈 값도 허용
  }
  
  if (position.trim().length > AUTH_VALIDATION_RULES.POSITION.MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `직책은 최대 ${AUTH_VALIDATION_RULES.POSITION.MAX_LENGTH}자까지 가능합니다.` 
    };
  }
  
  return { isValid: true };
};

// 부서 검증
export const validateDepartment = (department: string): ValidationResult => {
  if (!department.trim()) {
    return { isValid: true }; // 선택사항이므로 빈 값도 허용
  }
  
  if (department.trim().length > AUTH_VALIDATION_RULES.DEPARTMENT.MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `부서는 최대 ${AUTH_VALIDATION_RULES.DEPARTMENT.MAX_LENGTH}자까지 가능합니다.` 
    };
  }
  
  return { isValid: true };
};

// 전화번호 검증 (선택사항)
export const validateContact = (contact: string): ValidationResult => {
  if (!contact.trim()) {
    return { isValid: true }; // 선택사항이므로 빈 값도 허용
  }
  
  const cleaned = contact.replace(/[\s\-()]/g, '');
  
  // 11자리 모바일 번호만 허용 (010, 011, 016, 017, 018, 019)
  if (!/^01[0-69]\d{8}$/.test(cleaned)) {
    return { 
      isValid: false, 
      error: '올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)' 
    };
  }
  
  return { isValid: true };
};

// 이메일 또는 로그인 아이디 형식 판단
export const isEmailFormat = (input: string): boolean => {
  return input.includes('@');
};

// 비밀번호 확인 검증
export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: '비밀번호 확인을 입력해주세요.' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: '비밀번호가 일치하지 않습니다.' };
  }
  
  return { isValid: true };
};

// 회원가입 폼 전체 검증
export const validateSignUpForm = (formData: {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  position?: string;
  department?: string;
}): ValidationResult => {
  // 이메일 검증
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }
  
  // 비밀번호 검증
  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }
  
  // 비밀번호 확인 검증
  const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    return confirmPasswordValidation;
  }
  
  // 이름 검증
  const nameValidation = validateName(formData.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  // 직책 검증 (선택사항)
  if (formData.position) {
    const positionValidation = validatePosition(formData.position);
    if (!positionValidation.isValid) {
      return positionValidation;
    }
  }
  
  // 부서 검증 (선택사항)
  if (formData.department) {
    const departmentValidation = validateDepartment(formData.department);
    if (!departmentValidation.isValid) {
      return departmentValidation;
    }
  }
  
  return { isValid: true };
};

// 로그인 폼 검증
export const validateLoginForm = (formData: {
  email: string;
  password: string;
}): ValidationResult => {
  if (!formData.email.trim()) {
    return { isValid: false, error: '이메일을 입력해주세요.' };
  }
  
  if (!formData.password) {
    return { isValid: false, error: '비밀번호를 입력해주세요.' };
  }
  
  // 이메일 검증
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    return emailValidation;
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
    // 로그인 관련 에러
    'auth/user-not-found': '존재하지 않는 계정입니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/invalid-login-credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    
    // 회원가입 관련 에러
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/weak-password': '비밀번호가 너무 약합니다. (최소 6자 이상)',
    'auth/invalid-email': '올바르지 않은 이메일 형식입니다.',
    
    // 계정 상태 에러
    'auth/user-disabled': '비활성화된 계정입니다.',
    
    // 네트워크 및 기타 에러
    'auth/too-many-requests': '너무 많은 로그인 시도로 인해 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.',
    'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
    'auth/operation-not-allowed': '허용되지 않는 작업입니다.',
  };
  
  return errorMap[errorCode] || '인증 중 오류가 발생했습니다.';
};
