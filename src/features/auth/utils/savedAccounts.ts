/**
 * 로그인 기록 저장/관리 유틸리티
 * 플랫폼별로 독립적으로 하나의 계정만 저장
 * 웹, 일렉트론, 모바일 각각 1개씩 독립적으로 관리
 */

import { isElectron, isMobileApp } from '@/shared/utils/platform';
import { encryptPassword, decryptPassword } from './encryption';
import { getActiveSession } from '../services/sessionService';

export type PlatformType = 'web' | 'electron' | 'mobile';

export interface SavedAccount {
  email: string;
  displayName: string;
  position?: string;
  photoURL?: string; // 프로필 사진 URL (Firebase Storage 또는 Auth photoURL)
  password: string; // 암호화되어 저장
  deviceId: string; // 기기 식별자
  platform: PlatformType;
  savedAt: number; // timestamp
}

// localStorage 키 (플랫폼별 분리)
const getPlatformKey = (platform: PlatformType): string => {
  return `saved-login-account-${platform}`;
};

/**
 * 현재 플랫폼 타입 가져오기
 */
const getCurrentPlatform = (): PlatformType => {
  if (isElectron()) return 'electron';
  if (isMobileApp()) return 'mobile';
  return 'web';
};

/**
 * 기기 식별자 가져오기 또는 생성
 */
export const getDeviceId = (): string => {
  const DEVICE_ID_KEY = 'device-id';
  
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // 고유한 기기 ID 생성 (UUID v4 유사)
      deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('❌ [SavedAccounts] 기기 ID 생성 실패:', error);
    // 폴백: 임시 ID 생성
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
};

/**
 * 계정 저장
 * 현재 플랫폼에 하나의 계정만 저장 (기존 계정 덮어쓰기)
 */
export const saveLoginAccount = async (
  email: string,
  displayName: string,
  position: string | undefined,
  password: string,
  photoURL?: string | null
): Promise<void> => {
  try {
    const platform = getCurrentPlatform();
    const deviceId = getDeviceId();
    
    // 비밀번호 암호화
    const encryptedPassword = encryptPassword(password);
    
    const account: SavedAccount = {
      email,
      displayName,
      position,
      photoURL: photoURL || undefined,
      password: encryptedPassword,
      deviceId,
      platform,
      savedAt: Date.now(),
    };
    
    const key = getPlatformKey(platform);
    localStorage.setItem(key, JSON.stringify(account));
    
    console.log(`✅ [SavedAccounts] 계정 저장 완료: ${platform} (${email})`);
  } catch (error) {
    console.error('❌ [SavedAccounts] 계정 저장 실패:', error);
    throw error;
  }
};

/**
 * 저장된 계정 조회
 * 현재 플랫폼의 저장된 계정 반환
 */
export const getSavedAccount = (): SavedAccount | null => {
  try {
    const platform = getCurrentPlatform();
    const key = getPlatformKey(platform);
    
    const saved = localStorage.getItem(key);
    
    if (!saved) {
      return null;
    }
    
    const account: SavedAccount = JSON.parse(saved);
    
    // 플랫폼 일치 확인
    if (account.platform !== platform) {
      console.warn(`⚠️ [SavedAccounts] 플랫폼 불일치: 저장된 플랫폼(${account.platform}) !== 현재 플랫폼(${platform})`);
      return null;
    }
    
    return account;
  } catch (error) {
    console.error('❌ [SavedAccounts] 계정 조회 실패:', error);
    return null;
  }
};

/**
 * 자동 로그인 가능 여부 확인
 * Firestore 세션과 비교하여 현재 기기가 활성 세션인지 확인
 */
export const canAutoLogin = async (uid: string): Promise<boolean> => {
  try {
    const savedAccount = getSavedAccount();
    
    if (!savedAccount) {
      return false;
    }
    
    // Firestore에서 현재 플랫폼의 활성 세션 조회
    const activeSession = await getActiveSession(uid);
    
    if (!activeSession) {
      // 세션이 없으면 자동 로그인 불가
      return false;
    }
    
    // 저장된 기기 ID와 활성 세션의 기기 ID가 일치하면 자동 로그인 가능
    return savedAccount.deviceId === activeSession.deviceId;
  } catch (error) {
    console.error('❌ [SavedAccounts] 자동 로그인 가능 여부 확인 실패:', error);
    return false;
  }
};

/**
 * 저장된 계정의 비밀번호 복호화
 */
export const getDecryptedPassword = (savedAccount: SavedAccount): string => {
  try {
    return decryptPassword(savedAccount.password);
  } catch (error) {
    console.error('❌ [SavedAccounts] 비밀번호 복호화 실패:', error);
    throw error;
  }
};

/**
 * 저장된 계정 삭제
 * 현재 플랫폼의 저장된 계정 삭제
 */
export const clearSavedAccount = (): void => {
  try {
    const platform = getCurrentPlatform();
    const key = getPlatformKey(platform);
    localStorage.removeItem(key);
    
    console.log(`✅ [SavedAccounts] 계정 삭제 완료: ${platform}`);
  } catch (error) {
    console.error('❌ [SavedAccounts] 계정 삭제 실패:', error);
  }
};
