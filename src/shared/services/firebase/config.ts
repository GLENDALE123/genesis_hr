import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';

// 일렉트론 환경 감지
const isElectron = typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON__;


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'hs-jig-b2093.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'hs-jig-b2093',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'hs-jig-b2093.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '117861579792',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:117861579792:web:93de9aeca7771940745e95',
};

// Firebase Cloud Messaging VAPID Key
// Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 생성
export const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BCiXh2gG9sI7meQzRYxF6cm1gLDY94KPb_IV3tChfzW1nVQLjw7IAxCb253nNarOYpaqmVz5t0SEHY83P8DFph8';

// Firestore 데이터베이스 ID (환경변수로 설정 가능)
// 기본값: tms-production (seoul 리전)
// 주의: default 데이터베이스는 사용하지 않음 (완전 배제)
export const FIREBASE_FIRESTORE_DATABASE_ID = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production';

// Firestore 캐시 크기 설정 (메모리 관리)
// 기본값: 100MB (40MB 기본값보다 크지만 무제한은 아님)
// 환경변수로 조정 가능 (바이트 단위, 예: 104857600 = 100MB)
// 무제한을 원하면 CACHE_SIZE_UNLIMITED 사용 (권장하지 않음)
const FIREBASE_CACHE_SIZE = import.meta.env.VITE_FIREBASE_CACHE_SIZE 
  ? parseInt(import.meta.env.VITE_FIREBASE_CACHE_SIZE, 10)
  : 100 * 1024 * 1024; // 100MB 기본값

// Firebase 앱이 이미 초기화되어 있는지 확인
let app: FirebaseApp;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
} catch (error) {
  console.error('❌ [Firebase Config] Firebase 초기화 실패:', error);
  console.warn('⚠️ [Firebase Config] 폴백으로 빌드용 앱 생성 시도...');
  // 빌드 시에는 더미 앱 생성
  app = getApps()[0] || initializeApp(firebaseConfig);
}

// Firebase 서비스들 초기화 (일렉트론 환경 포함)
export const auth = (() => {
  try {
    if (typeof window !== 'undefined') {
      const authService = getAuth(app);
      return authService;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ [Firebase Config] Auth 서비스 초기화 실패:', error);
    return null;
  }
})();

export const db = (() => {
  try {
    if (typeof window !== 'undefined') {
      // tms-production 데이터베이스만 사용 (default 데이터베이스 완전 배제)
      // 환경변수로 데이터베이스 ID 설정 가능, 없으면 tms-production 사용
      const databaseId = FIREBASE_FIRESTORE_DATABASE_ID;
      
      // initializeFirestore를 사용하여 명시적으로 데이터베이스 지정
      // 적절한 캐시 크기 설정으로 메모리 사용량 관리
      console.log(`🔗 [Firebase Config] Firestore 초기화: 데이터베이스 ID = ${databaseId}`);
      console.log(`💾 [Firebase Config] 캐시 크기: ${(FIREBASE_CACHE_SIZE / 1024 / 1024).toFixed(0)}MB`);
      const dbService = initializeFirestore(app, {
        cacheSizeBytes: FIREBASE_CACHE_SIZE, // 적절한 캐시 크기 제한 (기본 100MB)
      }, databaseId);
      console.log('✅ [Firebase Config] Firestore 초기화 성공');
      
      // IndexedDB Persistence 활성화 (오프라인 캐싱 및 빠른 데이터 로드)
      // 여러 탭에서 동시에 사용할 수 있도록 multi-tab 지원
      enableIndexedDbPersistence(dbService).catch((err) => {
        // 이미 다른 탭에서 활성화된 경우 무시
        if (err.code === 'failed-precondition') {
          console.warn('⚠️ [Firebase Config] Persistence는 다른 탭에서 이미 활성화되어 있습니다.');
        } else if (err.code === 'unimplemented') {
          console.warn('⚠️ [Firebase Config] 현재 브라우저는 Persistence를 지원하지 않습니다.');
        } else {
          console.error('❌ [Firebase Config] Persistence 활성화 실패:', err);
        }
      });
      
      return dbService;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ [Firebase Config] Firestore 서비스 초기화 실패:', error);
    console.error('Error details:', error);
    return null;
  }
})();

export const storage = (() => {
  try {
    if (typeof window !== 'undefined') {
      const storageService = getStorage(app);
      return storageService;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ [Firebase Config] Storage 서비스 초기화 실패:', error);
    return null;
  }
})();

export const analytics = (() => {
  try {
    const hasMeasurementId = !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
    if (typeof window !== 'undefined' && !isElectron && hasMeasurementId) {
      const analyticsService = getAnalytics(app);
      return analyticsService;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ [Firebase Config] Analytics 서비스 초기화 실패:', error);
    return null;
  }
})();

export const functions = (() => {
  try {
    if (typeof window !== 'undefined') {
      const functionsService = getFunctions(app, 'asia-northeast3');
      return functionsService;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ [Firebase Config] Functions 서비스 초기화 실패:', error);
    return null;
  }
})();
// Firebase 초기화 대기 유틸리티
export const waitForFirebaseInit = (maxWaitTime: number = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (db) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (db) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > maxWaitTime) {
        clearInterval(checkInterval);
        console.error('Firebase 초기화 타임아웃');
        resolve(false);
      }
    }, 100);
  });
};

export default app;
