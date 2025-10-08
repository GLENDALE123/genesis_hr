import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/shared/services/firebase/config';
import { 
  createUserProfile, 
  updateLastLogin
} from '@/shared/services/firebase/userProfile';
import { SignUpData, LoginData, UserProfile } from '@/features/auth/types';
import { 
  validateSignUpForm, 
  validateLoginForm, 
  sanitizeInput, 
  translateFirebaseError,
  formatAuthError 
} from '@/features/auth/utils';
import { AUTH_ERROR_MESSAGES } from '@/features/auth/constants';

// 인증 서비스 클래스
export class AuthService {
  /**
   * 로그인 (이메일로)
   */
  static async signIn(loginData: LoginData): Promise<User> {
    if (!auth) {
      throw new Error(AUTH_ERROR_MESSAGES.FIREBASE_NOT_INITIALIZED);
    }

    try {
      // 폼 검증
      const validation = validateLoginForm(loginData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const { email, password } = loginData;
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 마지막 로그인 시간 업데이트
      await this.updateLastLoginTime(userCredential.user.uid);
      
      return userCredential.user;
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

      const { email, password, name, position, department } = signUpData;
      const sanitizedName = sanitizeInput(name);
      const sanitizedPosition = position ? sanitizeInput(position) : undefined;
      const sanitizedDepartment = department ? sanitizeInput(department) : undefined;
      
      // Firebase Auth에서 이메일 중복을 자동으로 체크하므로 별도 확인 불필요
      
      // Firebase Auth로 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 사용자 프로필 업데이트
      await updateProfile(userCredential.user, { displayName: sanitizedName });
      
      // Firestore에 사용자 프로필 생성
      await createUserProfile({
        ...signUpData,
        name: sanitizedName,
        displayName: sanitizedName,  // displayName 추가
        role: signUpData.role || 'Member',  // 기본값은 Member
        position: sanitizedPosition,
        department: sanitizedDepartment,
      }, userCredential.user.uid);
      
      return userCredential.user;
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
   */
  static async logout(): Promise<void> {
    if (!auth) {
      throw new Error(AUTH_ERROR_MESSAGES.FIREBASE_NOT_INITIALIZED);
    }

    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(formatAuthError(error));
    }
  }

  /**
   * 현재 사용자의 프로필 조회
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    if (!auth?.currentUser) {
      return null;
    }
    
    try {
      const { getUserProfile } = await import('@/shared/services/firebase/userProfile');
      const userProfile = await getUserProfile(auth.currentUser.uid);
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

  /**
   * 마지막 로그인 시간 업데이트
   */
  private static async updateLastLoginTime(uid: string): Promise<void> {
    try {
      await updateLastLogin(uid);
    } catch (error) {
      console.error(AUTH_ERROR_MESSAGES.LAST_LOGIN_UPDATE_FAILED, error);
      // 로그인 시간 업데이트 실패는 로그인을 막지 않음
    }
  }


}
