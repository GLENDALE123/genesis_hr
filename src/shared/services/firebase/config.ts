import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';


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
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
  console.warn('Firebase initialization failed:', error);
  // 빌드 시에는 더미 앱 생성
  app = getApps()[0] || initializeApp(firebaseConfig);
}

// Firebase 서비스들 초기화
export const auth = typeof window !== 'undefined' ? getAuth(app) : null;
export const db = typeof window !== 'undefined' ? getFirestore(app) : null;
export const storage = typeof window !== 'undefined' ? getStorage(app) : null;
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

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
