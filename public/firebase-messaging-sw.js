// Firebase 메시징 서비스 워커
// 이 파일은 Firebase Cloud Messaging (FCM)을 위한 서비스 워커입니다.

console.log('🔥 Firebase 메시징 서비스 워커 로딩 시작...');

// Firebase SDK import (최신 버전 사용)
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
  console.log('✅ Firebase App SDK 로드 완료');
} catch (error) {
  console.error('❌ Firebase App SDK 로드 실패:', error);
}

try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');
  console.log('✅ Firebase Messaging SDK 로드 완료');
} catch (error) {
  console.error('❌ Firebase Messaging SDK 로드 실패:', error);
}

// Firebase 설정 (환경변수 또는 기본값 사용)
const firebaseConfig = {
  apiKey: "AIzaSyB4nSpGhucC0NR57Zpu_syg86sjdFtLtaU",
  authDomain: "hs-jig-b2093.firebaseapp.com",
  projectId: "hs-jig-b2093",
  storageBucket: "hs-jig-b2093",
  messagingSenderId: "117861579792",
  appId: "1:117861579792:web:93de9aeca7771940745e95",
};

// Firebase 초기화
try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase 앱 초기화 완료');
} catch (error) {
  console.error('❌ Firebase 앱 초기화 실패:', error);
}

// 메시징 서비스 가져오기
let messaging;
try {
  messaging = firebase.messaging();
  console.log('✅ Firebase 메시징 서비스 초기화 완료');
} catch (error) {
  console.error('❌ Firebase 메시징 서비스 초기화 실패:', error);
}

// 백그라운드 메시지 처리
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('📨 백그라운드 메시지 수신:', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || '새로운 알림';
    const notificationBody = payload.notification?.body || payload.data?.body || '새로운 메시지가 도착했습니다.';
    
    const notificationOptions = {
      body: notificationBody,
      icon: '/tms-logo.png',
      badge: '/tms-logo.png',
      tag: 'firebase-notification',
      requireInteraction: true,
      data: payload.data || {},
      actions: [
        {
          action: 'open',
          title: '열기'
        },
        {
          action: 'close',
          title: '닫기'
        }
      ]
    };

    console.log('🔔 알림 표시:', { title: notificationTitle, options: notificationOptions });

    // 알림 표시
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('✅ 알림 표시 성공');
      })
      .catch((error) => {
        console.error('❌ 알림 표시 실패:', error);
      });
  });
} else {
  console.error('❌ Firebase 메시징 서비스가 초기화되지 않았습니다.');
}

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭됨:', event);
  
  event.notification.close();

  // 알림 데이터에서 딥링크 URL 가져오기
  const notificationData = event.notification.data || {};
  const deepLinkUrl = notificationData.url || '/';
  
  console.log('딥링크 URL:', deepLinkUrl);

  if (event.action === 'open') {
    // 앱 열기 (딥링크 URL 사용)
    event.waitUntil(
      clients.openWindow(deepLinkUrl)
    );
  } else if (event.action === 'close') {
    // 알림 닫기 (이미 위에서 닫았음)
    return;
  } else {
    // 기본 동작: 딥링크 URL로 이동
    event.waitUntil(
      clients.openWindow(deepLinkUrl)
    );
  }
});

// 서비스 워커 설치
self.addEventListener('install', () => {
  console.log('Firebase 메시징 서비스 워커 설치됨');
  self.skipWaiting();
});

// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
  console.log('Firebase 메시징 서비스 워커 활성화됨');
  event.waitUntil(self.clients.claim());
});
