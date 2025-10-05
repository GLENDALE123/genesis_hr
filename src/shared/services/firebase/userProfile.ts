import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
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
  const userProfile: UserProfile = {
    uid,
    email: userData.email,
    name: userData.name,
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
    console.error('사용자 프로필 조회 실패:', error);
    return null;
  }
};


// 이메일로 사용자 프로필 조회 (로그인 시 사용)
export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', email)
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
    console.error('이메일로 사용자 프로필 조회 실패:', error);
    return null;
  }
};

// 마지막 로그인 시간 업데이트
export const updateLastLogin = async (uid: string): Promise<void> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('마지막 로그인 시간 업데이트 실패:', error);
  }
};


