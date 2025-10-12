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
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const { email, password } = loginData;
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 마지막 로그인 시간 업데이트
    await updateLastLogin(userCredential.user.uid);
    
    return userCredential.user;
  } catch (error) {
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
  if (!auth) throw new Error('Firebase Auth is not initialized');
  return onAuthStateChanged(auth, callback);
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
