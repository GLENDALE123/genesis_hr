import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from './config';
import { 
  createUserProfile, 
  getUserProfile,
  updateLastLogin
} from './userProfile';
import { SignUpData, LoginData, UserProfile } from '@/features/auth/types';
import { settingsService } from '../settings/settingsService';

// 로그인 함수 (이메일로 로그인)
export const signIn = async (loginData: LoginData) => {
  console.log('🔐 [Firebase Auth] 로그인 시도 시작...');
  console.log('🔧 [Firebase Auth] Auth 서비스 상태:', {
    authInitialized: !!auth,
    authCurrentUser: auth?.currentUser?.email || 'none',
    environment: typeof window !== 'undefined' ? 'browser' : 'server'
  });
  
  if (!auth) {
    console.error('❌ [Firebase Auth] Auth 서비스가 초기화되지 않음');
    throw new Error('Firebase Auth is not initialized');
  }
  
  try {
    const { email, password } = loginData;
    console.log('📧 [Firebase Auth] 로그인 정보:', {
      email: email,
      passwordLength: password?.length || 0,
      hasPassword: !!password
    });
    
    console.log('🚀 [Firebase Auth] signInWithEmailAndPassword 호출 중...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ [Firebase Auth] 로그인 성공:', {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      emailVerified: userCredential.user.emailVerified
    });
    
    // 마지막 로그인 시간 업데이트
    console.log('⏰ [Firebase Auth] 마지막 로그인 시간 업데이트 중...');
    await updateLastLogin(userCredential.user.uid);
    console.log('✅ [Firebase Auth] 마지막 로그인 시간 업데이트 완료');
    
    return userCredential.user;
  } catch (error: unknown) {
    console.error('❌ [Firebase Auth] 로그인 실패:', {
      code: (error as { code?: string }).code,
      message: (error as { message?: string }).message,
      email: loginData.email
    });
    
    // 상세한 에러 정보 로깅
    if ((error as { code?: string }).code) {
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': '사용자를 찾을 수 없음',
        'auth/wrong-password': '잘못된 비밀번호',
        'auth/invalid-email': '잘못된 이메일 형식',
        'auth/invalid-credential': '잘못된 이메일 또는 비밀번호',
        'auth/user-disabled': '비활성화된 사용자',
        'auth/too-many-requests': '너무 많은 요청',
        'auth/network-request-failed': '네트워크 오류'
      };
      console.error('🔍 [Firebase Auth] 에러 코드 분석:', errorMessages[(error as { code?: string }).code || ''] || '알 수 없는 오류');
    }
    
    throw error;
  }
};

// 회원가입 함수 (이메일 기반)
export const signUp = async (signUpData: SignUpData) => {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const { email, password, displayName } = signUpData;
    
    // Firebase Auth로 계정 생성 (이메일 중복은 Firebase Auth가 자동으로 체크)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 사용자 프로필 업데이트
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    // Firestore에 사용자 프로필 생성
    await createUserProfile(signUpData, userCredential.user.uid);
    
    // 기본 설정값 초기화
    await settingsService.initializeSettings(userCredential.user.uid, {
      profile: {
        displayName: displayName || '',
        photoURL: null,
        phoneNumber: null,
        department: null,
      },
    });
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// 로그아웃 함수
export const logout = async () => {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    // Firebase Auth 로그아웃
    // 리스너는 각 컴포넌트의 useEffect cleanup에서 자동으로 정리됨
    await signOut(auth);
    console.log('✅ 로그아웃 완료');
  } catch (error) {
    throw error;
  }
};

// 인증 상태 변경 감지
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  console.log('👁️ [Firebase Auth] 인증 상태 변경 리스너 설정 중...');
  
  if (!auth) {
    console.error('❌ [Firebase Auth] Auth 서비스가 초기화되지 않음');
    throw new Error('Firebase Auth is not initialized');
  }
  
  console.log('✅ [Firebase Auth] 인증 상태 변경 리스너 설정 완료');
  return onAuthStateChanged(auth, (user) => {
    console.log('🔄 [Firebase Auth] 인증 상태 변경 감지:', {
      user: user ? {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName
      } : null,
      timestamp: new Date().toISOString()
    });
    callback(user);
  });
};

// 현재 사용자의 프로필 조회
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  if (!auth?.currentUser) return null;
  
  try {
    const userProfile = await getUserProfile(auth.currentUser.uid);
    return userProfile;
  } catch (error) {
    // 권한 에러는 조용히 처리 (로그인 전 상태)
    const errorMessage = error instanceof Error ? error.message : '';
    if (!errorMessage.includes('permission') && !errorMessage.includes('insufficient')) {
      console.error('사용자 프로필 조회 실패:', error);
    }
    return null;
  }
};
