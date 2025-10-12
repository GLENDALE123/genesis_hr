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
import { db } from './config';
import { UserProfile, SignUpData } from '@/features/auth/types';
import { toDate } from '@/shared/utils/dateUtils';

const USERS_COLLECTION = 'users';

// 사용자 프로필 생성 (회원가입 시)
export const createUserProfile = async (userData: SignUpData, uid: string): Promise<UserProfile> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  // 기본 필수 필드
  const userProfile: any = {
    uid,
    email: userData.email,
    name: userData.name,
    displayName: userData.displayName || userData.name,
    role: userData.role || 'Member',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // 선택 필드는 값이 있을 때만 추가 (undefined 제거)
  if (userData.position) {
    userProfile.position = userData.position;
  }
  if (userData.department) {
    userProfile.department = userData.department;
  }
  if (userData.contact) {
    userProfile.contact = userData.contact;
  }
  
  await setDoc(doc(db, USERS_COLLECTION, uid), userProfile);
  
  return userProfile as UserProfile;
};

// 사용자 프로필 조회
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate(),
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
export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', email)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // 여러 문서가 있을 경우 가장 최근에 업데이트된 문서 반환 (마이그레이션 대응)
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      
      // updatedAt 기준 내림차순 정렬
      docs.sort((a, b) => {
        const aTime = a.data.updatedAt?.toDate?.()?.getTime() || 0;
        const bTime = b.data.updatedAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      
      const latestDoc = docs[0];
      const data = latestDoc.data;
      
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate(),
      } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('이메일로 사용자 프로필 조회 실패:', error);
    return null;
  }
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
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate(),
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
export const checkEmailExists = async (email: string): Promise<boolean> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', email)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('이메일 중복 확인 실패:', error);
    return false;
  }
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

// 사용자 프로필 업데이트
export const updateUserProfile = async (
  uid: string, 
  data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: new Date(),
    });
    console.log('✅ 사용자 프로필 업데이트 완료:', uid);
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
      const toDate = (field: any): Date => {
        if (!field) return new Date();
        if (field instanceof Date) return field;
        if (typeof field.toDate === 'function') return field.toDate();
        if (typeof field === 'string') return new Date(field);
        return new Date();
      };
      
      return {
        ...data,
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
          ...data,
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
