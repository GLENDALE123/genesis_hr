import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';

// 일렉트론 환경 감지
const isElectron = typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON__;


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'hs-jig-b2093.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hs-jig-b2093',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'hs-jig-b2093.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '117861579792',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:117861579792:web:93de9aeca7771940745e95',
};

// Firebase Cloud Messaging VAPID Key
// Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 생성
export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BJJPTFCxIgh2ddhl1vUAzQ-Cj_0RvUCx9xuxRdM9pb061G9YkCWqe9561VQDTnrPVm8j4SldzEl_2h0NPNlh_tE';

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
      const dbService = getFirestore(app);
      return dbService;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ [Firebase Config] Firestore 서비스 초기화 실패:', error);
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
