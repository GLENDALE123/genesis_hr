import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import app from './config';

// VAPID 키 (Firebase Console에서 생성)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

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

    // 알림 권한 요청
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('알림 권한이 거부되었습니다.');
      return null;
    }

    // FCM 토큰 가져오기
    const token = await getToken(messagingService, {
      vapidKey: VAPID_KEY,
    });

    if (token) {
      console.log('FCM 토큰:', token);
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
    console.error('FCM 토큰 가져오기 실패:', error);
    return null;
  }
};

// 포그라운드 메시지 리스너
export const onForegroundMessage = (callback: (payload: MessagePayload) => void) => {
  if (typeof window === 'undefined') return;

  getMessagingService().then((messagingService) => {
    if (messagingService) {
      onMessage(messagingService, (payload) => {
        console.log('포그라운드 메시지 수신:', payload);
        callback(payload as MessagePayload);
      });
    }
  });
};

// 알림 권한 확인
export const checkNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined') return 'denied';
  return Notification.permission;
};

// 알림 권한 요청
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  try {
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

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('서비스 워커 등록 성공:', registration);
      return registration;
    } else {
      console.warn('이 브라우저는 서비스 워커를 지원하지 않습니다.');
      return null;
    }
  } catch (error) {
    console.error('서비스 워커 등록 실패:', error);
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
