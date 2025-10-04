// 인증 관련 상수들

// 에러 메시지
export const AUTH_ERROR_MESSAGES = {
  // 로그인 관련
  LOGIN_FAILED: '로그인에 실패했습니다.',
  INVALID_LOGIN_ID: '존재하지 않는 로그인 아이디입니다.',
  INVALID_EMAIL: '존재하지 않는 이메일입니다.',
  WRONG_PASSWORD: '비밀번호가 올바르지 않습니다.',
  
  // 회원가입 관련
  SIGNUP_FAILED: '회원가입에 실패했습니다.',
  LOGIN_ID_EXISTS: '이미 사용 중인 로그인 아이디입니다.',
  EMAIL_EXISTS: '이미 사용 중인 이메일입니다.',
  EMAIL_REQUIRED: '회원가입 시에는 이메일을 입력해주세요.',
  LOGIN_ID_REQUIRED: '로그인 아이디를 입력해주세요.',
  
  // 로그아웃 관련
  LOGOUT_FAILED: '로그아웃에 실패했습니다.',
  
  // 일반 에러
  FIREBASE_NOT_INITIALIZED: 'Firebase Auth is not initialized',
  USER_PROFILE_LOAD_FAILED: '사용자 프로필 로드 실패',
  USER_PROFILE_CREATE_FAILED: '사용자 프로필 생성 실패',
  LAST_LOGIN_UPDATE_FAILED: '마지막 로그인 시간 업데이트 실패',
  LOGIN_ID_CHECK_FAILED: '로그인 아이디 중복 확인 실패',
  EMAIL_CHECK_FAILED: '이메일 중복 확인 실패',
} as const;

// 폼 검증 규칙
export const AUTH_VALIDATION_RULES = {
  // 로그인 아이디 규칙
  LOGIN_ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_]+$/, // 영문, 숫자, 언더스코어만 허용
  },
  
  // 비밀번호 규칙
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 50,
  },
  
  // 이메일 규칙
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  
  // 표시 이름 규칙
  DISPLAY_NAME: {
    MAX_LENGTH: 30,
  },
} as const;

// Firestore 컬렉션 이름
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
} as const;

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  AUTH_STORE: 'auth-store',
} as const;

// 폼 플레이스홀더 텍스트
export const FORM_PLACEHOLDERS = {
  EMAIL: 'm@example.com',
  EMAIL_OR_LOGIN_ID: '이메일 또는 로그인 아이디',
  LOGIN_ID: '로그인 아이디를 입력하세요',
  DISPLAY_NAME: '표시할 이름을 입력하세요',
  PASSWORD: '비밀번호를 입력하세요',
} as const;

// 폼 라벨 텍스트
export const FORM_LABELS = {
  EMAIL: '이메일',
  EMAIL_OR_LOGIN_ID: '이메일 또는 로그인 아이디',
  LOGIN_ID: '로그인 아이디',
  DISPLAY_NAME: '표시 이름 (선택사항)',
  PASSWORD: '비밀번호',
} as const;

// 버튼 텍스트
export const BUTTON_TEXTS = {
  LOGIN: '로그인',
  SIGNUP: '회원가입',
  LOGOUT: '로그아웃',
  PROCESSING: '처리 중...',
  SWITCH_TO_SIGNUP: '계정이 없으신가요? 회원가입',
  SWITCH_TO_LOGIN: '이미 계정이 있으신가요? 로그인',
} as const;

// 카드 제목 및 설명
export const CARD_TEXTS = {
  LOGIN_TITLE: '로그인',
  SIGNUP_TITLE: '회원가입',
  LOGIN_DESCRIPTION: '계정에 로그인하세요',
  SIGNUP_DESCRIPTION: '새 계정을 만들어 시작하세요',
} as const;
