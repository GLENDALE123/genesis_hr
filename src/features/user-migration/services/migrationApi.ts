/**
 * 사용자 동기화 마이그레이션 API
 * Firebase Functions 호출 래퍼
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/shared/services/firebase/config';
import { auth } from '@/shared/services/firebase/config';
import type {
  AnalyzeUserSyncResponse,
  MigrateUserSyncResponse,
  DeleteAuthUsersResponse,
  GetUserAuthInfoResponse,
  RemovePhoneNumberResponse,
} from '../types';

/**
 * 분석 함수 호출
 */
export async function analyzeUserSync(): Promise<AnalyzeUserSyncResponse> {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }
  
  if (!auth?.currentUser) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    // 현재 사용자의 ID 토큰 가져오기
    const token = await auth.currentUser.getIdToken();
    
    // 직접 HTTP 호출 (httpsCallable은 Admin 권한 체크를 위해 토큰을 전달하기 어려움)
    const functionUrl = `https://asia-northeast3-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hs-jig-b2093'}.cloudfunctions.net/analyzeUserSync`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '분석 중 오류가 발생했습니다.');
    }
    
    return data as AnalyzeUserSyncResponse;
  } catch (error) {
    console.error('analyzeUserSync error:', error);
    throw error;
  }
}

/**
 * 마이그레이션 실행 함수 호출
 */
export async function migrateUserSync(dryRun: boolean = false): Promise<MigrateUserSyncResponse> {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }
  
  if (!auth?.currentUser) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    // 현재 사용자의 ID 토큰 가져오기
    const token = await auth.currentUser.getIdToken();
    
    // 직접 HTTP 호출
    const functionUrl = `https://asia-northeast3-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hs-jig-b2093'}.cloudfunctions.net/migrateUserSync`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ dryRun }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '마이그레이션 중 오류가 발생했습니다.');
    }
    
    return data as MigrateUserSyncResponse;
  } catch (error) {
    console.error('migrateUserSync error:', error);
    throw error;
  }
}

/**
 * Firebase Auth 사용자 삭제 함수 호출
 */
export async function deleteAuthUsers(uids: string[], dryRun: boolean = false): Promise<DeleteAuthUsersResponse> {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }
  
  if (!auth?.currentUser) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    // 현재 사용자의 ID 토큰 가져오기
    const token = await auth.currentUser.getIdToken();
    
    // 직접 HTTP 호출
    const functionUrl = `https://asia-northeast3-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hs-jig-b2093'}.cloudfunctions.net/deleteAuthUsers`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ uids, dryRun }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '삭제 중 오류가 발생했습니다.');
    }
    
    return data as DeleteAuthUsersResponse;
  } catch (error) {
    console.error('deleteAuthUsers error:', error);
    throw error;
  }
}

/**
 * Firebase Auth 사용자 정보 조회
 */
export async function getUserAuthInfo(uid?: string, email?: string): Promise<GetUserAuthInfoResponse> {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }
  
  if (!auth?.currentUser) {
    throw new Error('로그인이 필요합니다.');
  }
  
  if (!uid && !email) {
    throw new Error('uid 또는 email이 필요합니다.');
  }
  
  try {
    const token = await auth.currentUser.getIdToken();
    const functionUrl = `https://asia-northeast3-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hs-jig-b2093'}.cloudfunctions.net/getUserAuthInfo`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ uid, email }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '조회 중 오류가 발생했습니다.');
    }
    
    return data as GetUserAuthInfoResponse;
  } catch (error) {
    console.error('getUserAuthInfo error:', error);
    throw error;
  }
}

/**
 * Firestore에서 phoneNumber 필드 일괄 삭제
 */
export async function removePhoneNumberFromFirestore(dryRun: boolean = false): Promise<RemovePhoneNumberResponse> {
  if (!functions) {
    throw new Error('Firebase Functions가 초기화되지 않았습니다.');
  }
  
  if (!auth?.currentUser) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    const token = await auth.currentUser.getIdToken();
    const functionUrl = `https://asia-northeast3-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hs-jig-b2093'}.cloudfunctions.net/removePhoneNumberFromFirestore`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ dryRun }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '삭제 중 오류가 발생했습니다.');
    }
    
    return data as RemovePhoneNumberResponse;
  } catch (error) {
    console.error('removePhoneNumberFromFirestore error:', error);
    throw error;
  }
}

