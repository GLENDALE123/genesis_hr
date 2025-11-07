import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import { updateUserProfile } from './userProfile';
import type { UserRole } from '@/features/auth/types';

/**
 * 유저 관리 서비스
 */

// Firebase Auth와 Firestore 정보를 병합한 유저 정보
export interface UserManagementInfo {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  phoneNumber?: string | null;
  role: UserRole;
  position?: string | null;
  department?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  lastLoginAt?: Date | null;
}

/**
 * 모든 유저 목록을 가져옵니다 (Firebase Auth 정보 포함)
 * Firebase Functions를 통해 Firebase Auth에서 displayName, phoneNumber 등을 가져옵니다.
 */
export const getAllUsersWithAuthInfo = async (): Promise<UserManagementInfo[]> => {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }

  try {
    const getAllUsers = httpsCallable(functions, 'getAllUsersWithAuthInfo');
    const result = await getAllUsers();
    
    const data = result.data as { users: UserManagementInfo[] };
    
    // 날짜 필드를 Date 객체로 변환 (ISO 문자열로 받아서 변환)
    return data.users.map(user => ({
      ...user,
      createdAt: user.createdAt && typeof user.createdAt === 'string' ? (() => {
        const date = new Date(user.createdAt);
        return isNaN(date.getTime()) ? null : date;
      })() : null,
      updatedAt: user.updatedAt && typeof user.updatedAt === 'string' ? (() => {
        const date = new Date(user.updatedAt);
        return isNaN(date.getTime()) ? null : date;
      })() : null,
      lastLoginAt: user.lastLoginAt && typeof user.lastLoginAt === 'string' ? (() => {
        const date = new Date(user.lastLoginAt);
        return isNaN(date.getTime()) ? null : date;
      })() : null,
    }));
  } catch (error: unknown) {
    console.error('유저 목록 조회 실패:', error);
    
    // Firebase Functions 에러 처리
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message?: string; details?: unknown };
      
      // INTERNAL 에러 (500)인 경우
      if (firebaseError.code === 'functions/internal' || 
          firebaseError.code === 'internal' ||
          firebaseError.message?.includes('INTERNAL')) {
        const errorMessage = firebaseError.message || '서버 내부 오류가 발생했습니다.';
        console.error('Firebase Functions INTERNAL 에러:', {
          code: firebaseError.code,
          message: firebaseError.message,
          details: firebaseError.details
        });
        throw new Error(`유저 목록 조회 실패: ${errorMessage} 잠시 후 다시 시도해주세요.`);
      }
      
      // 권한 관련 에러인 경우 더 명확한 메시지 제공
      if (firebaseError.code === 'functions/permission-denied' || 
          firebaseError.code === 'unauthenticated' ||
          (firebaseError.message?.includes('Unauthorized') || firebaseError.message?.includes('not found'))) {
        const errorMessage = firebaseError.message || '권한이 없거나 사용자 프로필을 찾을 수 없습니다.';
        throw new Error(`유저 목록 조회 실패: ${errorMessage} 계정 설정을 확인해주세요.`);
      }
      
      // 기타 에러
      throw new Error(`유저 목록 조회 실패: ${firebaseError.message || firebaseError.code}`);
    }
    
    // 일반 에러
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

