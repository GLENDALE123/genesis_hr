import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';

// 일렉트론 환경 감지
const isElectron = typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON__;


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase Cloud Messaging VAPID Key
// Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 생성
export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Firestore 데이터베이스 ID (환경변수로 설정 가능)
// 기본값: tms-production (seoul 리전)
// 주의: default 데이터베이스는 사용하지 않음 (완전 배제)
export const FIREBASE_FIRESTORE_DATABASE_ID = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID;

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
      // 환경변수로 데이터베이스 ID 설정 필수
      const databaseId = FIREBASE_FIRESTORE_DATABASE_ID;
      
      // initializeFirestore를 사용하여 명시적으로 데이터베이스 지정
      // 이 방법이 더 확실하게 특정 데이터베이스에 연결됩니다
      console.log(`🔗 [Firebase Config] Firestore 초기화: 데이터베이스 ID = ${databaseId}`);
      const dbService = initializeFirestore(app, {}, databaseId);
      console.log('✅ [Firebase Config] Firestore 초기화 성공');
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
    const hasMeasurementId = !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
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
