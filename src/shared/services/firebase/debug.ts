/**
 * Firebase 연결 상태 디버그 및 테스트 유틸리티
 */

import { auth, db, storage, analytics, functions } from './config';

/**
 * Firebase 연결 상태 종합 체크
 */
export const checkFirebaseConnection = async () => {
  console.log('🔍 [Firebase Debug] Firebase 연결 상태 체크 시작...');
  
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

  console.log('📊 [Firebase Debug] 연결 상태 요약:', connectionStatus);

  // Auth 서비스 테스트
  if (auth) {
    try {
      console.log('🔐 [Firebase Debug] Auth 서비스 테스트 중...');
      console.log('   - Auth 인스턴스:', !!auth);
      console.log('   - 현재 사용자:', auth.currentUser?.email || 'none');
      console.log('   - Auth 도메인:', auth.app.options.authDomain);
      console.log('✅ [Firebase Debug] Auth 서비스 정상');
    } catch (error) {
      console.error('❌ [Firebase Debug] Auth 서비스 오류:', error);
    }
  } else {
    console.warn('⚠️ [Firebase Debug] Auth 서비스 사용 불가');
  }

  // Firestore 서비스 테스트
  if (db) {
    try {
      console.log('🔥 [Firebase Debug] Firestore 서비스 테스트 중...');
      console.log('   - Firestore 인스턴스:', !!db);
      console.log('   - 프로젝트 ID:', db.app.options.projectId);
      console.log('✅ [Firebase Debug] Firestore 서비스 정상');
    } catch (error) {
      console.error('❌ [Firebase Debug] Firestore 서비스 오류:', error);
    }
  } else {
    console.warn('⚠️ [Firebase Debug] Firestore 서비스 사용 불가');
  }

  // 일렉트론 환경 정보
  if (connectionStatus.environment.isElectron) {
    console.log('🖥️ [Firebase Debug] 일렉트론 환경 감지됨');
    console.log('   - 클라이언트 SDK 사용 중');
    console.log('   - Admin SDK 불필요 (클라이언트 SDK로 충분)');
  }

  console.log('🎯 [Firebase Debug] Firebase 연결 상태 체크 완료');
  return connectionStatus;
};

/**
 * 네트워크 연결 테스트
 */
export const testNetworkConnection = async () => {
  console.log('🌐 [Firebase Debug] 네트워크 연결 테스트 시작...');
  
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

    console.log('📡 [Firebase Debug] 네트워크 응답:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok || response.status === 400) {
      console.log('✅ [Firebase Debug] 네트워크 연결 정상 (Firebase API 접근 가능)');
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
  console.log('🔧 [Firebase Debug] Firebase 설정 검증 시작...');
  
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  console.log('📋 [Firebase Debug] 환경 변수 상태:', {
    apiKey: config.apiKey ? '✅ 설정됨' : '❌ 누락',
    authDomain: config.authDomain ? '✅ 설정됨' : '❌ 누락',
    projectId: config.projectId ? '✅ 설정됨' : '❌ 누락',
    storageBucket: config.storageBucket ? '✅ 설정됨' : '❌ 누락',
    messagingSenderId: config.messagingSenderId ? '✅ 설정됨' : '❌ 누락',
    appId: config.appId ? '✅ 설정됨' : '❌ 누락',
  });

  const missingConfigs = Object.entries(config)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingConfigs.length > 0) {
    console.error('❌ [Firebase Debug] 누락된 설정:', missingConfigs);
    return false;
  } else {
    console.log('✅ [Firebase Debug] 모든 Firebase 설정 완료');
    return true;
  }
};

/**
 * 전체 Firebase 디버그 실행
 */
export const runFirebaseDebug = async () => {
  console.log('🚀 [Firebase Debug] 전체 Firebase 디버그 시작...');
  console.log('='.repeat(60));
  
  // 1. 설정 검증
  const configValid = validateFirebaseConfig();
  
  // 2. 연결 상태 체크
  const connectionStatus = await checkFirebaseConnection();
  
  // 3. 네트워크 테스트
  const networkOk = await testNetworkConnection();
  
  console.log('='.repeat(60));
  console.log('📊 [Firebase Debug] 최종 결과:', {
    configValid,
    connectionStatus,
    networkOk,
    overall: configValid && connectionStatus.clientSDK.auth && networkOk
  });
  
  if (configValid && connectionStatus.clientSDK.auth && networkOk) {
    console.log('🎉 [Firebase Debug] Firebase 연결 정상!');
  } else {
    console.log('⚠️ [Firebase Debug] Firebase 연결에 문제가 있습니다.');
  }
  
  return {
    configValid,
    connectionStatus,
    networkOk,
    overall: configValid && connectionStatus.clientSDK.auth && networkOk
  };
};
