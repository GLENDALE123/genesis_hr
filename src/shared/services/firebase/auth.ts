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
  getUserProfileByLoginId, 
  getUserProfileByEmail, 
  updateLastLogin,
  checkLoginIdExists,
  checkEmailExists
} from './userProfile';
import { SignUpData, LoginData, UserProfile } from '@/features/auth/types';

// 로그인 함수 (이메일 또는 로그인 아이디로 로그인)
export const signIn = async (loginData: LoginData) => {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const { emailOrLoginId, password } = loginData;
    
    // 이메일 형식인지 확인
    const isEmail = emailOrLoginId.includes('@');
    let email = emailOrLoginId;
    
    if (!isEmail) {
      // 로그인 아이디인 경우, 로그인 아이디로 이메일 찾기
      const userProfile = await getUserProfileByLoginId(emailOrLoginId);
      if (!userProfile) {
        throw new Error('존재하지 않는 로그인 아이디입니다.');
      }
      email = userProfile.email;
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 마지막 로그인 시간 업데이트
    await updateLastLogin(userCredential.user.uid);
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// 회원가입 함수 (로그인 아이디 포함)
export const signUp = async (signUpData: SignUpData) => {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const { email, password, loginId, displayName } = signUpData;
    
    // 로그인 아이디 중복 확인
    const loginIdExists = await checkLoginIdExists(loginId);
    if (loginIdExists) {
      throw new Error('이미 사용 중인 로그인 아이디입니다.');
    }
    
    // 이메일 중복 확인
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      throw new Error('이미 사용 중인 이메일입니다.');
    }
    
    // Firebase Auth로 계정 생성
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 사용자 프로필 업데이트
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    // Firestore에 사용자 프로필 생성
    await createUserProfile(signUpData, userCredential.user.uid);
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// 로그아웃 함수
export const logout = async () => {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    await signOut(auth);
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
    console.error('사용자 프로필 조회 실패:', error);
    return null;
  }
};
