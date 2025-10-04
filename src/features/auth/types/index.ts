import { User } from 'firebase/auth';

// Firestore에 저장될 사용자 프로필 정보
export interface UserProfile {
  uid: string;              // Firebase Auth UID
  email: string;            // 이메일 (Firebase Auth에서 가져옴)
  loginId: string;          // 로그인 아이디 (새로 추가)
  displayName?: string;     // 표시 이름
  createdAt: Date;          // 계정 생성일
  updatedAt: Date;          // 마지막 업데이트일
  lastLoginAt?: Date;       // 마지막 로그인 시간
}

// 회원가입 시 사용할 데이터
export interface SignUpData {
  email: string;
  password: string;
  loginId: string;
  displayName?: string;
}

// 로그인 시 사용할 데이터 (이메일 또는 아이디)
export interface LoginData {
  emailOrLoginId: string;   // 이메일 또는 로그인 아이디
  password: string;
}

// 인증 상태 타입
export interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}
