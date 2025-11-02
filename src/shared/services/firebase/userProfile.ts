import { 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, db } from './config';
import { UserProfile, SignUpData, LoginData } from '@/features/auth/types';
import { toDate } from '@/shared/utils/dateUtils';
import { settingsService } from '../settings/settingsService';
import { normalizeToFirebaseAuthPhone } from '@/shared/utils/phoneUtils';

const USERS_COLLECTION = 'users';

// ============================================================================
// Firebase Authentication 함수들
// ============================================================================

// 로그인 함수 (이메일로 로그인)
export const signIn = async (loginData: LoginData) => {
  if (!auth) {
    console.error('❌ [Firebase Auth] Auth 서비스가 초기화되지 않음');
    throw new Error('Firebase Auth is not initialized');
  }
  
  try {
    const { email, password } = loginData;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // 마지막 로그인 시간 업데이트
    await updateLastLogin(userCredential.user.uid);
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
    const { email, password, displayName, phoneNumber } = signUpData;
    
    // Firebase Auth로 계정 생성 (이메일 중복은 Firebase Auth가 자동으로 체크)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Firebase Auth 프로필 업데이트 (displayName, phoneNumber)
    const authProfileUpdates: { displayName?: string; phoneNumber?: string } = {};
    
    if (displayName) {
      authProfileUpdates.displayName = displayName;
    }
    
    // 전화번호를 Firebase Auth 형식으로 변환해서 저장
    if (phoneNumber) {
      const normalizedPhone = normalizeToFirebaseAuthPhone(phoneNumber);
      if (normalizedPhone) {
        authProfileUpdates.phoneNumber = normalizedPhone;
      }
    }
    
    // Firebase Auth 프로필 업데이트
    if (Object.keys(authProfileUpdates).length > 0) {
      await updateProfile(userCredential.user, authProfileUpdates);
    }
    
    // Firestore에 사용자 프로필 생성 (role, position, department만 저장)
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
  } catch (error) {
    throw error;
  }
};

// 인증 상태 변경 감지
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    console.error('❌ [Firebase Auth] Auth 서비스가 초기화되지 않음');
    throw new Error('Firebase Auth is not initialized');
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// Firebase Auth 프로필 업데이트 (displayName, phoneNumber, photoURL)
export const updateAuthProfile = async (
  updates: { displayName?: string; phoneNumber?: string; photoURL?: string }
): Promise<void> => {
  if (!auth?.currentUser) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    const authUpdates: { displayName?: string; phoneNumber?: string; photoURL?: string } = {};
    
    if (updates.displayName !== undefined) {
      authUpdates.displayName = updates.displayName;
    }
    
    if (updates.phoneNumber !== undefined) {
      if (updates.phoneNumber) {
        const normalizedPhone = normalizeToFirebaseAuthPhone(updates.phoneNumber);
        if (normalizedPhone) {
          authUpdates.phoneNumber = normalizedPhone;
        }
      } else {
        // null이면 제거는 불가능하므로 경고
        console.warn('⚠️ Firebase Auth에서는 phoneNumber를 null로 설정할 수 없습니다.');
      }
    }
    
    if (updates.photoURL !== undefined) {
      authUpdates.photoURL = updates.photoURL || null;
    }
    
    if (Object.keys(authUpdates).length > 0) {
      await updateProfile(auth.currentUser, authUpdates);
    }
  } catch (error) {
    console.error('❌ Firebase Auth 프로필 업데이트 실패:', error);
    throw error;
  }
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

// ============================================================================
// Firestore 사용자 프로필 함수들
// ============================================================================

// 사용자 프로필 생성 (회원가입 시)
// Firestore에는 role, position, department만 저장 (uid는 문서 ID)
export const createUserProfile = async (userData: SignUpData, uid: string): Promise<UserProfile> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  // Firestore에 저장할 필드만 (uid, email, name, displayName, phoneNumber 제외)
  const userProfile: Record<string, unknown> = {
    role: userData.role || 'Member',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // 선택 필드는 값이 있을 때만 추가
  if (userData.position) {
    userProfile.position = userData.position;
  }
  if (userData.department) {
    userProfile.department = userData.department;
  }
  
  await setDoc(doc(db, USERS_COLLECTION, uid), userProfile);
  
  return userProfile as unknown as UserProfile;
};

// 사용자 프로필 조회
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      
      // 필요한 필드만 추출 (uid, email, name, displayName, phoneNumber, photoURL 제외)
      return {
        role: data.role || 'Member',
        position: data.position || undefined,
        department: data.department || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate() || undefined,
      } as UserProfile;
    }
    
    return null;
  } catch (error) {
    // 권한 에러는 조용히 처리 (로그인 전 상태)
    const errorMessage = error instanceof Error ? error.message : '';
    if (!errorMessage.includes('permission') && !errorMessage.includes('insufficient')) {
      console.error('사용자 프로필 조회 실패:', error);
    }
    return null;
  }
};

// 이메일로 사용자 프로필 조회 (로그인 시 사용)
// 주의: 이제 email 필드가 Firestore에 없으므로, Firebase Auth를 통해 uid를 찾아야 함
// 하지만 기존 코드 호환성을 위해 유지 (email로 검색하되 결과는 빈 배열일 가능성 높음)
export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  // 이메일로는 더 이상 검색할 수 없음 (Firestore에 email 필드가 없음)
  // Firebase Auth를 통해 email로 사용자를 찾아야 하는데, 
  // 이는 Admin SDK가 필요하므로 클라이언트에서는 불가능
  // 따라서 이 함수는 사용하지 않도록 권장하거나, 로그인 시에는 signIn 후 getCurrentUserProfile 사용
  console.warn('⚠️ getUserProfileByEmail은 더 이상 지원되지 않습니다. signIn 후 getCurrentUserProfile을 사용하세요.');
    return null;
};

// 로그인 아이디로 사용자 프로필 조회
export const getUserProfileByLoginId = async (loginId: string): Promise<UserProfile | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('loginId', '==', loginId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        role: data.role || 'Member',
        position: data.position || undefined,
        department: data.department || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate() || undefined,
      } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('로그인 아이디로 사용자 프로필 조회 실패:', error);
    return null;
  }
};

// 로그인 아이디 중복 확인
export const checkLoginIdExists = async (loginId: string): Promise<boolean> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('loginId', '==', loginId)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('로그인 아이디 중복 확인 실패:', error);
    return false;
  }
};

// 이메일 중복 확인
// 주의: 이제 Firestore에 email 필드가 없으므로 Firebase Auth를 통해 확인해야 함
// 하지만 클라이언트에서는 직접 확인 불가능 (signUp 시 Firebase Auth가 자동으로 체크)
export const checkEmailExists = async (email: string): Promise<boolean> => {
  console.warn('⚠️ checkEmailExists는 더 이상 지원되지 않습니다. signUp 시 Firebase Auth가 자동으로 체크합니다.');
    return false;
};

// 마지막 로그인 시간 업데이트 (문서가 없으면 생성)
export const updateLastLogin = async (uid: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    await setDoc(
      doc(db, USERS_COLLECTION, uid), 
      {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }  // 문서가 없으면 생성, 있으면 병합
    );
  } catch (error) {
    console.error('마지막 로그인 시간 업데이트 실패:', error);
  }
};

// 사용자 프로필 업데이트 (Firestore만 - position, department만 업데이트)
export const updateUserProfile = async (
  uid: string, 
  data: Partial<Pick<UserProfile, 'role' | 'position' | 'department'>>
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    // role, position, department만 업데이트
    if (data.role !== undefined) {
      updates.role = data.role;
    }
    if (data.position !== undefined) {
      updates.position = data.position || null;
    }
    if (data.department !== undefined) {
      updates.department = data.department || null;
    }
    
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('❌ 사용자 프로필 업데이트 실패:', error);
    throw error;
  }
};

// 모든 사용자 목록 조회
export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // 날짜 필드 안전하게 변환
      const toDate = (field: unknown): Date => {
        if (!field) return new Date();
        if (field instanceof Date) return field;
        if (typeof (field as { toDate?: () => Date }).toDate === 'function') return (field as { toDate: () => Date }).toDate();
        if (typeof field === 'string') return new Date(field);
        return new Date();
      };
      
      return {
        role: data.role || 'Member',
        position: data.position || undefined,
        department: data.department || undefined,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        lastLoginAt: data.lastLoginAt ? toDate(data.lastLoginAt) : undefined,
      } as UserProfile;
    });
  } catch (error) {
    console.error('사용자 목록 조회 실패:', error);
    return [];
  }
};

// 사용자 목록 실시간 구독
export const subscribeToUsers = (
  callback: (users: UserProfile[]) => void,
  onError?: (error: Error) => void
) => {
  if (!db) throw new Error('Firestore is not initialized');

  return onSnapshot(
    collection(db, USERS_COLLECTION),
    (snapshot) => {
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          role: data.role || 'Member',
          position: data.position || undefined,
          department: data.department || undefined,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
          lastLoginAt: data.lastLoginAt ? toDate(data.lastLoginAt) : undefined,
        } as UserProfile;
      });
      callback(users);
    },
    (error) => {
      console.error('사용자 목록 구독 실패:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  );
};
