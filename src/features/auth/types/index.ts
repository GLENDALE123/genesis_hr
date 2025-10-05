import { User } from 'firebase/auth';

// Firestore에 저장될 사용자 프로필 정보
export interface UserProfile {
  uid: string;              // Firebase Auth UID
  email: string;            // 이메일 (Firebase Auth에서 가져옴)
  name: string;             // 이름
  position?: string;        // 직책 (선택사항)
  department?: string;      // 부서 (선택사항)
  createdAt: Date;          // 계정 생성일
  updatedAt: Date;          // 마지막 업데이트일
  lastLoginAt?: Date;       // 마지막 로그인 시간
}

// 회원가입 시 사용할 데이터
export interface SignUpData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  position?: string;
  department?: string;
}

// 로그인 시 사용할 데이터
export interface LoginData {
  email: string;            // 이메일
  password: string;
}

// 인증 상태 타입
export interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}
