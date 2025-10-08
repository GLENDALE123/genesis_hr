import { 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from './config';
import { UserProfile, SignUpData } from '@/features/auth/types';

const USERS_COLLECTION = 'users';

// 사용자 프로필 생성 (회원가입 시)
export const createUserProfile = async (userData: SignUpData, uid: string): Promise<UserProfile> => {
  if (!db) throw new Error('Firestore is not initialized');
  
  const userProfile: UserProfile = {
    uid,
    email: userData.email,
    name: userData.name,
    displayName: userData.displayName || userData.name,  // displayName이 없으면 name 사용
    role: userData.role || 'Member',  // 기본값은 Member
    position: userData.position,
    department: userData.department,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), userProfile);
  return userProfile;
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


