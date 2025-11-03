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
    
    // 날짜 필드를 Date 객체로 변환
    return data.users.map(user => ({
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt as any) : null,
      updatedAt: user.updatedAt ? new Date(user.updatedAt as any) : null,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt as any) : null,
    }));
  } catch (error) {
    console.error('유저 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 유저 정보를 수정합니다
 */
export const updateUserManagementInfo = async (
  uid: string,
  updates: {
    role?: UserRole;
    position?: string;
    department?: string;
  }
): Promise<void> => {
  try {
    await updateUserProfile(uid, updates);
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

