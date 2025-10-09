import { User } from 'firebase/auth';
import { auth } from '@/shared/services/firebase/config';
import { 
  signIn as sharedSignIn,
  signUp as sharedSignUp,
  logout as sharedLogout,
  getCurrentUserProfile as sharedGetCurrentUserProfile
} from '@/shared/services/firebase/auth';
import { SignUpData, LoginData, UserProfile } from '@/features/auth/types';
import { 
  validateSignUpForm, 
  sanitizeInput, 
  translateFirebaseError,
  formatAuthError 
} from '@/features/auth/utils';
import { AUTH_ERROR_MESSAGES } from '@/features/auth/constants';

// 인증 서비스 클래스
export class AuthService {
  /**
   * 로그인 (이메일 또는 로그인 ID)
   * ✅ 공통 서비스 사용 + 추가 검증 레이어
   */
  static async signIn(loginData: LoginData): Promise<User> {
    if (!auth) {
      throw new Error(AUTH_ERROR_MESSAGES.FIREBASE_NOT_INITIALIZED);
    }

    try {
      const { emailOrLoginId, password } = loginData;
      
      // 간단한 폼 검증
      if (!emailOrLoginId || !password) {
        throw new Error('이메일 또는 로그인 ID와 비밀번호를 입력해주세요.');
      }
      
      // ✅ 공통 서비스 호출 (로그인 ID 지원 포함)
      const user = await sharedSignIn(loginData);
      
      return user;
    } catch (error) {
      // Firebase 에러를 한국어로 변환
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code && firebaseError.code.startsWith('auth/')) {
        throw new Error(translateFirebaseError(firebaseError.code));
      }
      throw new Error(formatAuthError(error));
    }
  }

  /**
   * 회원가입
   * ✅ 공통 서비스 사용 + 추가 검증 및 sanitization 레이어
   */
  static async signUp(signUpData: SignUpData): Promise<User> {
    if (!auth) {
      throw new Error(AUTH_ERROR_MESSAGES.FIREBASE_NOT_INITIALIZED);
    }

    try {
      // 폼 검증
      const validation = validateSignUpForm(signUpData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // 입력값 sanitization
      const sanitizedData: SignUpData = {
        ...signUpData,
        name: sanitizeInput(signUpData.name),
        displayName: sanitizeInput(signUpData.name),
        position: signUpData.position ? sanitizeInput(signUpData.position) : undefined,
        department: signUpData.department ? sanitizeInput(signUpData.department) : undefined,
        role: signUpData.role || 'Member', // 기본값은 Member
      };
      
      // ✅ 공통 서비스 호출 (로그인 ID 중복 체크 포함)
      const user = await sharedSignUp(sanitizedData);
      
      return user;
    } catch (error) {
      // Firebase 에러를 한국어로 변환
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code && firebaseError.code.startsWith('auth/')) {
        throw new Error(translateFirebaseError(firebaseError.code));
      }
      throw new Error(formatAuthError(error));
    }
  }

  /**
   * 로그아웃
   * ✅ 공통 서비스 사용
   */
  static async logout(): Promise<void> {
    if (!auth) {
      throw new Error(AUTH_ERROR_MESSAGES.FIREBASE_NOT_INITIALIZED);
    }

    try {
      // ✅ 공통 서비스 호출
      await sharedLogout();
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  /**
   * 현재 사용자의 프로필 조회
   * ✅ 공통 서비스 사용
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    if (!auth?.currentUser) {
      return null;
    }
    
    try {
      // ✅ 공통 서비스 호출
      const userProfile = await sharedGetCurrentUserProfile();
      return userProfile;
    } catch (error) {
      // 권한 에러는 조용히 처리 (로그인 전 상태)
      const errorMessage = error instanceof Error ? error.message : '';
      if (!errorMessage.includes('permission') && !errorMessage.includes('insufficient')) {
        console.error(AUTH_ERROR_MESSAGES.USER_PROFILE_LOAD_FAILED, error);
      }
      return null;
    }
  }
}
