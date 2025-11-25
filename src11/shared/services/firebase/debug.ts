/**
 * Firebase 연결 상태 디버그 및 테스트 유틸리티
 */

import { auth, db, storage, analytics, functions } from './config';

/**
 * Firebase 연결 상태 종합 체크
 */
export const checkFirebaseConnection = async () => {
  const connectionStatus = {
    environment: {
      isElectron: typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON__,
      isBrowser: typeof window !== 'undefined',
      platform: typeof process !== 'undefined' ? process.platform : 'browser',
      nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'browser'
    },
    clientSDK: {
      auth: !!auth,
      firestore: !!db,
      storage: !!storage,
      analytics: !!analytics,
      functions: !!functions
    }
  };
  // Auth 서비스 테스트
  if (auth) {
    try {
    } catch (error) {
      console.error('❌ [Firebase Debug] Auth 서비스 오류:', error);
    }
  } else {
    console.warn('⚠️ [Firebase Debug] Auth 서비스 사용 불가');
  }

  // Firestore 서비스 테스트
  if (db) {
    try {
    } catch (error) {
      console.error('❌ [Firebase Debug] Firestore 서비스 오류:', error);
    }
  } else {
    console.warn('⚠️ [Firebase Debug] Firestore 서비스 사용 불가');
  }

  // 일렉트론 환경 정보
  if (connectionStatus.environment.isElectron) {
  }
  return connectionStatus;
};

/**
 * 네트워크 연결 테스트
 */
export const testNetworkConnection = async () => {
  try {
    // Firebase API 엔드포인트 연결 테스트
    const testUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123',
        returnSecureToken: true
      })
    });
    if (response.ok || response.status === 400) {
      return true;
    } else {
      console.warn('⚠️ [Firebase Debug] 네트워크 응답 이상:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ [Firebase Debug] 네트워크 연결 실패:', error);
    return false;
  }
};

/**
 * Firebase 프로젝트 설정 검증
 */
export const validateFirebaseConfig = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const missingConfigs = Object.entries(config)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingConfigs.length > 0) {
    console.error('❌ [Firebase Debug] 누락된 설정:', missingConfigs);
    return false;
  } else {
    return true;
  }
};

/**
 * 전체 Firebase 디버그 실행
 */
export const runFirebaseDebug = async () => {
  // 1. 설정 검증
  const configValid = validateFirebaseConfig();
  
  // 2. 연결 상태 체크
  const connectionStatus = await checkFirebaseConnection();
  
  // 3. 네트워크 테스트
  const networkOk = await testNetworkConnection();
  if (configValid && connectionStatus.clientSDK.auth && networkOk) {
  } else {
  }
  
  return {
    configValid,
    connectionStatus,
    networkOk,
    overall: configValid && connectionStatus.clientSDK.auth && networkOk
  };
};
