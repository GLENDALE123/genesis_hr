import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// 에뮬레이터 사용 여부 확인
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAFdnBgl1jlKGUYEvK2zNncm4T_z5t2kBc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'control-6a11d.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'control-6a11d',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'control-6a11d.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '739974091539',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:739974091539:web:6de6536e2178ed3d0440e6',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-YDJBRPW5BY',
};

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
    // Auth 에뮬레이터 연결
    if (auth && !auth.config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }
    
    // Firestore 에뮬레이터 연결
    if (db && !db._delegate._databaseId.database.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    
    // Storage 에뮬레이터 연결
    if (storage && !storage._host.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
    
    console.log('🔥 Firebase 에뮬레이터에 연결되었습니다.');
  } catch (error) {
    console.warn('Firebase 에뮬레이터 연결 실패:', error);
  }
}

export default app;
