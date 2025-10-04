// Firebase 메시징 서비스 워커
// 이 파일은 Firebase Cloud Messaging (FCM)을 위한 서비스 워커입니다.

// Firebase SDK import (ES6 모듈 방식)
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase 설정 (환경변수 또는 기본값 사용)
const firebaseConfig = {
  apiKey: "AIzaSyAFdnBgl1jlKGUYEvK2zNncm4T_z5t2kBc",
  authDomain: "control-6a11d.firebaseapp.com",
  projectId: "control-6a11d",
  storageBucket: "control-6a11d.firebasestorage.app",
  messagingSenderId: "739974091539",
  appId: "1:739974091539:web:6de6536e2178ed3d0440e6",
  measurementId: "G-YDJBRPW5BY"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// 메시징 서비스 가져오기
const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  console.log('백그라운드 메시지 수신:', payload);
  
  const notificationTitle = payload.notification?.title || '새로운 알림';
  const notificationOptions = {
    body: payload.notification?.body || '새로운 메시지가 도착했습니다.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'firebase-notification',
    requireInteraction: true,
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

  // 알림 표시
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭됨:', event);
  
  event.notification.close();

  if (event.action === 'open') {
    // 앱 열기
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // 알림 닫기 (이미 위에서 닫았음)
    return;
  } else {
    // 기본 동작: 앱 열기
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 서비스 워커 설치
self.addEventListener('install', (event) => {
  console.log('Firebase 메시징 서비스 워커 설치됨');
  self.skipWaiting();
});

// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
  console.log('Firebase 메시징 서비스 워커 활성화됨');
  event.waitUntil(self.clients.claim());
});
