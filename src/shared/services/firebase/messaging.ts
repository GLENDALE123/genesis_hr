import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import app from './config';

// VAPID 키 (Firebase Console에서 생성)
// Firebase Console > Project Settings > Cloud Messaging > Web Push certificates에서 생성
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

// Electron 환경 감지
const isElectronEnv = typeof window !== 'undefined' && (window as any).__ELECTRON__;

// 중복 경고 방지 플래그
let hasWarnedMissingVapid = false;
let hasWarnedInsecureContext = false;

const warnMissingVapidOnce = () => {
  if (hasWarnedMissingVapid) return;
  hasWarnedMissingVapid = true;
  console.error('❌ VAPID 키가 설정되지 않았습니다. FCM 토큰을 가져올 수 없습니다.');
  console.error('Firebase Console에서 Web Push 인증서를 생성하고 .env.local에 추가하세요.');
};

// 초기 경고 (웹 환경에서만, 1회)
if (!VAPID_KEY && typeof window !== 'undefined' && !isElectronEnv) {
  warnMissingVapidOnce();
}

// 보안 컨텍스트 여부 확인 (HTTPS 또는 localhost/127.0.0.1 허용)
const isLocalhost = (host: string | undefined) => host === 'localhost' || host === '127.0.0.1';
const isSecureWebContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    if ((window as any).isSecureContext) return true;
    var host = window.location && window.location.hostname;
    return isLocalhost(host);
  } catch (e) {
    return false;
  }
};

const warnInsecureOnce = () => {
  if (hasWarnedInsecureContext) return;
  hasWarnedInsecureContext = true;
  console.warn('알림 권한은 보안 컨텍스트(HTTPS 또는 localhost)에서만 요청할 수 있습니다.');
};

interface MessagePayload {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: Record<string, string>;
}

// 메시징 서비스 초기화
let messaging: Messaging | null = null;

// 메시징 서비스 가져오기 (클라이언트 사이드에서만)
export const getMessagingService = async () => {
  if (typeof window === 'undefined') return null;
  // Electron에서는 FCM 사용 안 함 (Firestore + Electron 알림 사용)
  if (isElectronEnv) return null;
  
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('이 브라우저는 Firebase 메시징을 지원하지 않습니다.');
      return null;
    }
    
    if (!messaging) {
      messaging = getMessaging(app);
    }
    
    return messaging;
  } catch (error) {
    console.error('Firebase 메시징 초기화 실패:', error);
    return null;
  }
};

// FCM 토큰 가져오기
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messagingService = await getMessagingService();
    if (!messagingService) return null;

    // VAPID 키 확인
    if (!VAPID_KEY) {
      warnMissingVapidOnce();
      return null;
    }

    // 알림 권한이 허용된 경우에만 토큰 요청 (자동 요청 금지)
    if (typeof window === 'undefined' || !('Notification' in window)) return null;
    if (Notification.permission !== 'granted') return null;

    // FCM 토큰 가져오기
    const token = await getToken(messagingService, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      return token;
    } else {
      console.warn('FCM 토큰을 가져올 수 없습니다.');
      return null;
    }
  } catch (error) {
    // NotAllowedError는 조용히 처리 (사용자가 권한을 거부함)
    if (error instanceof Error && error.name === 'NotAllowedError') {
      // 권한 거부 에러는 로그 출력 안 함
      return null;
    }
    console.error('❌ FCM 토큰 가져오기 실패:', error);
    return null;
  }
};

// 포그라운드 메시지 리스너
export const onForegroundMessage = (callback: (payload: MessagePayload) => void): (() => void) | void => {
  if (typeof window === 'undefined') return;
  if (isElectronEnv) return;

  let unsubscribe: (() => void) | undefined;
  getMessagingService().then((messagingService) => {
    if (messagingService) {
      unsubscribe = onMessage(messagingService, (payload) => {
        callback(payload as MessagePayload);
      });
    }
  });
  return () => {
    if (unsubscribe) {
      try { unsubscribe(); } catch {}
    }
  };
};

// 알림 권한 확인
export const checkNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined') return 'denied';
  if (!('Notification' in window)) return 'denied';
  // 비보안 컨텍스트에서는 요청이 불가하므로 허용된 경우만 유지, 그 외는 denied 처리
  if (!isSecureWebContext()) {
    return Notification.permission === 'granted' ? 'granted' : 'denied';
  }
  return Notification.permission;
};

// 알림 권한 요청
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (isElectronEnv) return false;
  if (!('Notification' in window)) return false;
  if (!isSecureWebContext()) {
    warnInsecureOnce();
    return false;
  }

  try {
    // 이미 결정된 상태면 재요청하지 않음
    if (Notification.permission !== 'default') {
      return Notification.permission === 'granted';
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('알림 권한 요청 실패:', error);
    return false;
  }
};

// 서비스 워커 등록
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined') return null;
  if (isElectronEnv) return null;
  if (!isSecureWebContext()) return null;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      // 서비스 워커가 활성화될 때까지 대기
      if (registration.installing) {
        await new Promise((resolve) => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', (e) => {
              if ((e.target as ServiceWorker).state === 'activated') {
                resolve(true);
              }
            });
          } else {
            resolve(true);
          }
        });
      }
      return registration;
    } else {
      console.warn('이 브라우저는 서비스 워커를 지원하지 않습니다.');
      return null;
    }
  } catch (error) {
    console.error('서비스 워커 등록 실패:', error);
    // Electron 환경에서 Service Worker 등록 실패 시 null 반환 (FCM 토큰은 여전히 시도)
    if (typeof window !== 'undefined' && window.__ELECTRON__) {
      return null;
    }
    return null;
  }
};

// FCM 초기화 (앱 시작 시 호출)
export const initializeFCM = async (): Promise<{
  token: string | null;
  permission: NotificationPermission;
  registration: ServiceWorkerRegistration | null;
}> => {
  try {
    if (isElectronEnv) {
      // Electron에서는 FCM을 사용하지 않음
      return {
        token: null,
        permission: 'denied',
        registration: null,
      };
    }

    // 서비스 워커 등록
    const registration = await registerServiceWorker();
    
    // 알림 권한 확인
    const permission = checkNotificationPermission();
    
    // FCM 토큰 가져오기
    const token = permission === 'granted' ? await getFCMToken() : null;

    return {
      token,
      permission,
      registration,
    };
  } catch (error) {
    console.error('FCM 초기화 실패:', error);
    return {
      token: null,
      permission: 'denied',
      registration: null,
    };
  }
};

const messagingService = {
  getMessagingService,
  getFCMToken,
  onForegroundMessage,
  checkNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  initializeFCM,
};

export default messagingService;
export type { MessagePayload };
