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
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-YDJBRPW5BY',
};

// Firebase Cloud Messaging VAPID Key
// Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 생성
export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BJJPTFCxIgh2ddhl1vUAzQ-Cj_0RvUCx9xuxRdM9pb061G9YkCWqe9561VQDTnrPVm8j4SldzEl_2h0NPNlh_tE';

// Firebase 앱이 이미 초기화되어 있는지 확인
let app: FirebaseApp;
console.log('🔥 [Firebase Config] 초기화 시작...');
console.log('🔧 [Firebase Config] 환경 정보:', {
  isElectron,
  hasWindow: typeof window !== 'undefined',
  nodeEnv: process.env.NODE_ENV,
  platform: process.platform
});

try {
  if (getApps().length === 0) {
    console.log('🚀 [Firebase Config] 새로운 Firebase 앱 초기화 중...');
    app = initializeApp(firebaseConfig);
    console.log('✅ [Firebase Config] Firebase 앱 초기화 성공');
  } else {
    app = getApps()[0];
    console.log('♻️ [Firebase Config] 기존 Firebase 앱 사용');
  }
  
  console.log('📋 [Firebase Config] 앱 설정 정보:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId?.substring(0, 10) + '...'
  });
} catch (error) {
  console.error('❌ [Firebase Config] Firebase 초기화 실패:', error);
  console.warn('⚠️ [Firebase Config] 폴백으로 빌드용 앱 생성 시도...');
  // 빌드 시에는 더미 앱 생성
  app = getApps()[0] || initializeApp(firebaseConfig);
  console.log('🔄 [Firebase Config] 폴백 앱 생성 완료');
}

// Firebase 서비스들 초기화 (일렉트론 환경 포함)
console.log('🔧 [Firebase Config] 서비스 초기화 시작...');

export const auth = (() => {
  try {
    if (typeof window !== 'undefined') {
      const authService = getAuth(app);
      console.log('✅ [Firebase Config] Auth 서비스 초기화 성공');
      return authService;
    } else {
      console.log('⏭️ [Firebase Config] Auth 서비스 초기화 스킵 (브라우저 환경 아님)');
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
      console.log('✅ [Firebase Config] Firestore 서비스 초기화 성공');
      return dbService;
    } else {
      console.log('⏭️ [Firebase Config] Firestore 서비스 초기화 스킵 (브라우저 환경 아님)');
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
      console.log('✅ [Firebase Config] Storage 서비스 초기화 성공');
      return storageService;
    } else {
      console.log('⏭️ [Firebase Config] Storage 서비스 초기화 스킵 (브라우저 환경 아님)');
      return null;
    }
  } catch (error) {
    console.error('❌ [Firebase Config] Storage 서비스 초기화 실패:', error);
    return null;
  }
})();

export const analytics = (() => {
  try {
    if (typeof window !== 'undefined' && !isElectron) {
      const analyticsService = getAnalytics(app);
      console.log('✅ [Firebase Config] Analytics 서비스 초기화 성공');
      return analyticsService;
    } else {
      console.log('⏭️ [Firebase Config] Analytics 서비스 초기화 스킵 (일렉트론 환경 또는 브라우저 아님)');
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
      const functionsService = getFunctions(app);
      console.log('✅ [Firebase Config] Functions 서비스 초기화 성공');
      return functionsService;
    } else {
      console.log('⏭️ [Firebase Config] Functions 서비스 초기화 스킵 (브라우저 환경 아님)');
      return null;
    }
  } catch (error) {
    console.error('❌ [Firebase Config] Functions 서비스 초기화 실패:', error);
    return null;
  }
})();

console.log('🎯 [Firebase Config] 모든 서비스 초기화 완료:', {
  auth: !!auth,
  db: !!db,
  storage: !!storage,
  analytics: !!analytics,
  functions: !!functions
});

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
