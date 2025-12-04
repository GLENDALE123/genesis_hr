import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './config';
import { updateUserProfile } from './userProfile';
import type { UserRole } from '@/features/auth/types';

/**
 * 유저 관리 서비스
 */

// Firestore 정보를 포함한 유저 정보
export interface UserManagementInfo {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  name?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  role: UserRole;
  position?: string | null;
  department?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  lastLoginAt?: Date | null;
}

/**
 * 모든 유저 목록을 Firestore에서 직접 가져옵니다
 * Firebase Functions를 사용하지 않고 Firestore에서만 조회합니다.
 */
export const getAllUsersWithAuthInfo = async (): Promise<UserManagementInfo[]> => {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    
    // 날짜 필드 안전하게 변환
    const toDate = (field: unknown): Date | null => {
      if (!field) return null;
      if (field instanceof Date) return field;
      if (typeof (field as { toDate?: () => Date }).toDate === 'function') {
        return (field as { toDate: () => Date }).toDate();
      }
      if (typeof field === 'string') {
        const date = new Date(field);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    };
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        uid: doc.id,
        email: data.email || null,
        displayName: data.displayName || null,
        name: data.name || null,
        photoURL: data.photoURL || null,
        phoneNumber: data.phoneNumber || null,
        role: (data.role || 'Member') as UserRole,
        position: data.position || null,
        department: data.department || null,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        lastLoginAt: toDate(data.lastLoginAt),
      } as UserManagementInfo;
    });
  } catch (error: unknown) {
    console.error('유저 목록 조회 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    throw new Error(`유저 목록 조회 실패: ${errorMessage}`);
  }
};

/**
 * 유저 정보를 수정합니다 (Firebase Auth 정보 포함)
 */
export const updateUserManagementInfo = async (
  uid: string,
  updates: {
    displayName?: string;
    phoneNumber?: string;
    role?: UserRole;
    position?: string;
    department?: string;
  }
): Promise<void> => {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }

  try {
    // Firebase Auth 정보 업데이트 (이름, 전화번호)
    const authUpdates: { displayName?: string; phoneNumber?: string } = {};
    if (updates.displayName !== undefined) {
      authUpdates.displayName = updates.displayName;
    }
    if (updates.phoneNumber !== undefined) {
      authUpdates.phoneNumber = updates.phoneNumber;
    }
    
    // Auth 정보가 있으면 Functions를 통해 업데이트
    if (Object.keys(authUpdates).length > 0) {
      const updateAuthInfo = httpsCallable(functions, 'updateUserAuthInfo');
      await updateAuthInfo({ uid, updates: authUpdates });
    }
    
    // Firestore 정보 업데이트 (role, position, department)
    const firestoreUpdates: { role?: UserRole; position?: string; department?: string } = {};
    if (updates.role !== undefined) {
      firestoreUpdates.role = updates.role;
    }
    if (updates.position !== undefined) {
      firestoreUpdates.position = updates.position;
    }
    if (updates.department !== undefined) {
      firestoreUpdates.department = updates.department;
    }
    
    if (Object.keys(firestoreUpdates).length > 0) {
      await updateUserProfile(uid, firestoreUpdates);
    }
  } catch (error) {
    console.error('유저 정보 수정 실패:', error);
    throw error;
  }
};

/**
 * 유저를 삭제합니다 (Firebase Auth 계정과 Firestore 문서 모두 삭제)
 */
export const deleteUserAccount = async (uid: string): Promise<void> => {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }

  try {
    const deleteUser = httpsCallable(functions, 'deleteUser');
    await deleteUser({ uid });
  } catch (error) {
    console.error('유저 삭제 실패:', error);
    throw error;
  }
};

