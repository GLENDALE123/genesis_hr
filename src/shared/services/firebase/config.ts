import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Electron 환경 감지 함수
const isElectronEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  return '__ELECTRON__' in window;
};

// 개발 환경 감지 함수
const isDevEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

// 에뮬레이터 사용 여부 확인
// 1. 환경 변수로 명시적으로 설정
// 2. Tauri 개발 환경 (localhost:3000)
// 3. 웹 개발 환경 (localhost)
const useEmulator = 
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
  (isElectronEnv() && isDevEnvironment()) ||
  (isDevEnvironment() && process.env.NODE_ENV === 'development');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAFdnBgl1jlKGUYEvK2zNncm4T_z5t2kBc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'control-6a11d.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'control-6a11d',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'control-6a11d.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '739974091539',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:739974091539:web:6de6536e2178ed3d0440e6',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-YDJBRPW5BY',
};

// Firebase Cloud Messaging VAPID Key
// Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 생성
export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BJJPTFCxIgh2ddhl1vUAzQ-Cj_0RvUCx9xuxRdM9pb061G9YkCWqe9561VQDTnrPVm8j4SldzEl_2h0NPNlh_tE';

// Firebase 앱이 이미 초기화되어 있는지 확인
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
  console.warn('Firebase initialization failed:', error);
  // 빌드 시에는 더미 앱 생성
  app = getApps()[0] || initializeApp(firebaseConfig);
}

// Firebase 서비스들 초기화 (빌드 시에는 더미 서비스)
export const auth = typeof window !== 'undefined' ? getAuth(app) : null;
export const db = typeof window !== 'undefined' ? getFirestore(app) : null;
export const storage = typeof window !== 'undefined' ? getStorage(app) : null;
export const analytics = typeof window !== 'undefined' && !useEmulator ? getAnalytics(app) : null;

// 에뮬레이터 연결 (개발 환경에서만)
if (typeof window !== 'undefined' && useEmulator) {
  try {
    // 현재 호스트 정보 가져오기
    const currentHost = window.location.hostname;
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
    const isElectron = isElectronEnv();
    
    console.log('🔥 Firebase 에뮬레이터 연결 시도:', {
      환경: isElectron ? 'Electron' : 'Web',
      호스트: currentHost,
      포트: window.location.port,
      에뮬레이터_사용: useEmulator,
    });
    
    // Auth 에뮬레이터 연결
    if (auth) {
      try {
        const authHost = isLocalhost ? 'localhost' : currentHost;
        connectAuthEmulator(auth, `http://${authHost}:9099`, { 
          disableWarnings: true 
        });
        console.log(`✅ Auth 에뮬레이터 연결 완료 (${authHost}:9099)`);
      } catch (authError) {
        console.warn('Auth 에뮬레이터 이미 연결됨 또는 연결 실패:', authError);
      }
    }
    
    // Firestore 에뮬레이터 연결
    if (db) {
      try {
        // 에뮬레이터 연결 상태 확인을 더 안전하게 처리
        const dbDelegate = db as unknown as { _delegate?: { _databaseId?: { database?: string } } };
        const isAlreadyConnected = dbDelegate._delegate?._databaseId?.database?.includes(currentHost);
        if (!isAlreadyConnected) {
          const firestoreHost = isLocalhost ? 'localhost' : currentHost;
          connectFirestoreEmulator(db, firestoreHost, 8080);
          console.log(`✅ Firestore 에뮬레이터 연결 완료 (${firestoreHost}:8080)`);
        } else {
          console.log('✅ Firestore 에뮬레이터 이미 연결됨');
        }
      } catch (firestoreError) {
        console.warn('Firestore 에뮬레이터 연결 실패:', firestoreError);
      }
    }
    
    // Storage 에뮬레이터 연결
    if (storage) {
      try {
        const storageHost = storage as unknown as { _host?: string };
        const isAlreadyConnected = storageHost._host?.includes(currentHost);
        if (!isAlreadyConnected) {
          const host = isLocalhost ? 'localhost' : currentHost;
          connectStorageEmulator(storage, host, 9199);
          console.log(`✅ Storage 에뮬레이터 연결 완료 (${host}:9199)`);
        } else {
          console.log('✅ Storage 에뮬레이터 이미 연결됨');
        }
      } catch (storageError) {
        console.warn('Storage 에뮬레이터 연결 실패:', storageError);
      }
    }
    
    console.log('🔥 Firebase 에뮬레이터 설정 완료');
  } catch (error) {
    console.warn('Firebase 에뮬레이터 연결 실패:', error);
  }
}

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
