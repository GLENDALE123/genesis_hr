import { User } from 'firebase/auth';

// 사용자 역할 타입
export type UserRole = 'Admin' | 'Manager' | 'Member';

// Firestore에 저장될 사용자 프로필 정보
// uid, email, displayName, phoneNumber, photoURL, name은 Firebase Auth에서 가져옴
// Firestore에는 추가 정보(role, position, department)만 저장
export interface UserProfile {
  role: UserRole;           // 역할 (Admin/Manager/Member) - Firestore에만 저장
  position?: string;        // 직책 (선택사항) - Firestore에만 저장
  department?: string;      // 부서 (선택사항) - Firestore에만 저장
  createdAt: Date;          // 계정 생성일
  updatedAt: Date;          // 마지막 업데이트일
  lastLoginAt?: Date;       // 마지막 로그인 시간
  // uid, email, displayName, phoneNumber, photoURL, name 제거 (Firebase Auth에서 가져옴)
  // uid는 Firestore 문서 ID로만 사용 (users/{uid})
}

// 회원가입 시 사용할 데이터
export interface SignUpData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  displayName: string;
  role?: UserRole;          // 회원가입 시 역할 (기본값: Member)
  position?: string;
  department?: string;
  phoneNumber?: string;     // 전화번호
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
