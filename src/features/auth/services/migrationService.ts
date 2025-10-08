import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/shared/services/firebase/config';
import { getUserProfileByEmail } from '@/shared/services/firebase/userProfile';
import { UserProfile } from '../types';

/**
 * Firestore에 존재하는 유저를 Firebase Auth에 생성
 * (데이터 마이그레이션 또는 불일치 해결용)
 */
export class MigrationService {
  /**
   * 기존 Firestore 프로필로 Auth 계정 생성 및 UID 동기화
   */
  static async createAuthFromFirestoreProfile(
    email: string, 
    password: string
  ): Promise<{ success: boolean; profile: UserProfile | null; error?: string }> {
    try {
      // 1. Firestore에서 기존 프로필 확인
      const existingProfile = await getUserProfileByEmail(email);
      
      if (!existingProfile) {
        return {
          success: false,
          profile: null,
          error: '해당 이메일로 등록된 프로필이 없습니다.'
        };
      }

      // 2. Firebase Auth 계정 생성 (새 UID 생성됨)
      if (!auth || !db) {
        throw new Error('Firebase is not initialized');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUid = userCredential.user.uid;  // 새로 생성된 UID
      const oldUid = existingProfile.uid;       // 기존 UID
      
      // 3. displayName 업데이트
      await updateProfile(userCredential.user, { 
        displayName: existingProfile.displayName || existingProfile.name 
      });

      // 4. 새 프로필 먼저 생성 (데이터 손실 방지)
      const updatedProfile: UserProfile = {
        ...existingProfile,
        uid: newUid,  // 새 UID로 변경
        updatedAt: new Date()
      };

      // 5. 새 UID로 프로필 저장
      await setDoc(doc(db, 'users', newUid), updatedProfile);
      console.log(`✅ 새 프로필 생성 완료: ${newUid} (새 UID)`);

      // 6. 새 프로필 생성 성공 후 기존 UID의 프로필 삭제
      if (oldUid !== newUid) {
        try {
          await deleteDoc(doc(db, 'users', oldUid));
          console.log(`✅ 기존 프로필 삭제 완료: ${oldUid} (구 UID)`);
        } catch (error) {
          console.warn('⚠️ 기존 프로필 삭제 실패 (무시):', error);
        }
      }

      return {
        success: true,
        profile: updatedProfile
      };
    } catch (error: any) {
      // Auth 계정이 이미 존재하는 경우
      if (error.code === 'auth/email-already-in-use') {
        return {
          success: false,
          profile: null,
          error: '이미 등록된 이메일입니다. 로그인을 시도해주세요.'
        };
      }

      return {
        success: false,
        profile: null,
        error: error.message || '계정 생성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * Firestore 프로필 존재 여부 확인
   */
  static async checkFirestoreProfileExists(email: string): Promise<boolean> {
    const profile = await getUserProfileByEmail(email);
    return !!profile;
  }

  /**
   * 이메일로 Firestore 프로필 조회
   */
  static async getFirestoreProfile(email: string): Promise<UserProfile | null> {
    return await getUserProfileByEmail(email);
  }

  /**
   * 현재 로그인한 사용자의 프로필이 없을 경우 생성
   * (Auth는 있는데 Firestore 프로필이 없는 경우)
   */
  static async createMissingProfile(user: any): Promise<UserProfile | null> {
    try {
      if (!db || !user) {
        throw new Error('Firebase or User not initialized');
      }

      // 기존 이메일의 프로필 찾기
      const existingProfile = await getUserProfileByEmail(user.email);
      
      if (existingProfile && existingProfile.uid !== user.uid) {
        // 기존 프로필이 다른 UID로 있으면 복사
        const newProfile: UserProfile = {
          ...existingProfile,
          uid: user.uid,
          updatedAt: new Date(),
          lastLoginAt: new Date() // lastLoginAt 강제 설정
        };
        
        // undefined 필드 제거
        Object.keys(newProfile).forEach(key => {
          if ((newProfile as any)[key] === undefined) {
            delete (newProfile as any)[key];
          }
        });
        
        await setDoc(doc(db, 'users', user.uid), newProfile);
        console.log(`✅ 프로필 복사 완료: ${user.uid}`);
        
        // 기존 프로필 삭제
        try {
          await deleteDoc(doc(db, 'users', existingProfile.uid));
          console.log(`✅ 기존 프로필 삭제: ${existingProfile.uid}`);
        } catch (error) {
          console.warn('기존 프로필 삭제 실패:', error);
        }
        
        return newProfile;
      } else if (!existingProfile) {
        // 프로필이 전혀 없으면 새로 생성
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          displayName: user.displayName || user.email.split('@')[0],
          role: 'Member',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        };
        
        await setDoc(doc(db, 'users', user.uid), newProfile);
        console.log(`✅ 새 프로필 생성 완료: ${user.uid}`);
        
        return newProfile;
      }
      
      return existingProfile;
    } catch (error) {
      console.error('프로필 생성 실패:', error);
      return null;
    }
  }

  /**
   * 중복된 이메일의 기존 UID 문서들 정리
   * (마이그레이션 후 남은 중복 문서 제거)
   */
  static async cleanupDuplicateProfiles(email: string): Promise<number> {
    try {
      if (!db) {
        throw new Error('Firebase is not initialized');
      }

      const q = query(
        collection(db, 'users'),
        where('email', '==', email)
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.size <= 1) {
        console.log('중복 문서 없음');
        return 0;
      }

      // 문서들을 updatedAt 기준 정렬
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data(),
        ref: doc.ref
      }));

      docs.sort((a, b) => {
        const aTime = a.data.updatedAt?.toDate?.()?.getTime() || 0;
        const bTime = b.data.updatedAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });

      // 가장 최신 문서를 제외한 나머지 삭제
      const docsToDelete = docs.slice(1);
      let deletedCount = 0;

      for (const doc of docsToDelete) {
        try {
          await deleteDoc(doc.ref);
          console.log(`✅ 중복 문서 삭제: ${doc.id}`);
          deletedCount++;
        } catch (error) {
          console.warn(`⚠️ 문서 삭제 실패: ${doc.id}`, error);
        }
      }

      console.log(`총 ${deletedCount}개 중복 문서 삭제 완료`);
      return deletedCount;
    } catch (error) {
      console.error('중복 문서 정리 실패:', error);
      return 0;
    }
  }
}


