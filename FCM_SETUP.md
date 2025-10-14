# Firebase 알림 설정 가이드

## 🎯 환경별 알림 시스템

### **Electron 환경** 🖥️
- ✅ **Firestore 실시간 리스너** 사용 (FCM 미사용)
- ✅ `users/{userId}/inbox` 컬렉션 감지
- ✅ 네이티브 Electron 알림창 표시
- ✅ 1-2초 지연 (실시간 동기화)
- ✅ 100% 안정적 (에뮬레이터 지원)

### **웹 환경** 🌐
- ✅ **FCM (Firebase Cloud Messaging)** 사용
- ✅ Service Worker 백그라운드 알림
- ✅ 브라우저 네이티브 알림
- ✅ 즉시 푸시 (실시간)
- ⚠️ **VAPID 키 필요** (Firebase Console에서 생성)

---

## ⚠️ 중요: Firebase 에뮬레이터 제한사항

**Firebase 에뮬레이터는 FCM을 지원하지 않습니다!**

- ✅ **지원**: Auth, Firestore, Storage, Functions (HTTP)
- ❌ **미지원**: FCM 푸시 알림

### 해결 방법:
1. **웹 FCM 테스트**: 에뮬레이터 모드 끄기 (실제 Firebase 서버 사용)
2. **Electron 테스트**: Firestore 리스너 사용 (에뮬레이터 지원)

---

## 🔑 VAPID 키 생성 및 설정 (웹 환경만 필요)

### 1단계: Firebase Console에서 VAPID 키 생성

1. **Firebase Console 접속**: https://console.firebase.google.com
2. **프로젝트 선택**: `hs-jig-b2093`
3. **프로젝트 설정 > Cloud Messaging** 탭 이동
4. **Web Push certificates** 섹션 찾기
5. **키 페어 생성** 버튼 클릭
6. 생성된 **키 문자열 복사** (예: `BHsD...xyz`)

### 2단계: .env.local 파일 생성

프로젝트 루트 (`hs-next/` 폴더)에 `.env.local` 파일 생성:

```bash
# Firebase Cloud Messaging VAPID Key
NEXT_PUBLIC_FIREBASE_VAPID_KEY=여기에_복사한_키_붙여넣기
```

**예시:**
```bash
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BHsDfG3kl2mNoPqRsTuVwXyZ1234567890aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

### 3단계: 개발 서버 재시작

**웹 브라우저:**
```bash
npm run dev
```

**Electron (FCM 미사용):**
```bash
npm run electron:dev
```

---

## 📱 알림 동작 확인

### **Electron 환경** 
콘솔 메시지:
```
🖥️ Electron 환경 감지 → Firestore 실시간 리스너 알림 사용
✅ [Electron] Firestore 실시간 알림 시스템 사용
```

### **웹 환경**
콘솔 메시지:
```
🌐 웹 환경 감지 → FCM 푸시 알림 사용
✅ FCM 토큰 발급 완료: dYourToken...
✅ FCM 토큰 Firestore에 저장 완료: dYourToken...
✅ 서비스 워커 등록 성공 (웹 환경)
✅ FCM 초기화 완료 (웹 환경)
```

---

## 🔔 푸시 알림 테스트

### 방법 1: Firebase Console에서 테스트

1. Firebase Console > Cloud Messaging > **새 알림 보내기**
2. 알림 제목/내용 입력
3. **테스트 메시지 전송**
4. 위에서 얻은 **FCM 토큰 입력**
5. **테스트** 버튼 클릭

### 방법 2: 서버에서 발송 (Node.js)

```javascript
// functions/https/notifications.js 사용
const admin = require('firebase-admin');

await admin.messaging().send({
  token: 'dYourFCMToken...',
  notification: {
    title: '테스트 알림',
    body: 'Electron FCM 작동 확인'
  },
  data: {
    type: 'test',
    link: '/dashboard'
  }
});
```

---

## ⚠️ 중요 사항

### **Electron 환경**
- ✅ Firestore 실시간 리스너 방식
- ✅ 앱이 실행 중일 때만 알림 수신
- ✅ 완전 종료 시 알림 수신 불가 (디자인 상 정상)
- ✅ **해결책**: 시스템 트레이에 최소화로 백그라운드 유지
- ✅ 에뮬레이터 지원 (FCM 미사용)

### **웹 환경**
- ✅ FCM 푸시 알림 방식
- **포그라운드** (앱 사용 중): 브라우저 네이티브 알림 + Toast
- **백그라운드** (다른 탭): Service Worker → 네이티브 알림
- ⚠️ **실제 Firebase 서버 필요** (에뮬레이터 미지원)
- ⚠️ Service Worker 경로: `/firebase-messaging-sw.js` (오리진 루트)

---

## 🐛 문제 해결

### FCM 토큰 발급 실패
```
❌ VAPID 키가 설정되지 않았습니다
```
→ `.env.local` 파일에 `NEXT_PUBLIC_FIREBASE_VAPID_KEY` 추가 및 서버 재시작

### Service Worker 등록 실패
```
DOMException: Failed to register a ServiceWorker
```
→ `file://` 프로토콜 사용 중. `localhost` 또는 `app://` 스킴 사용 필요

### 알림 수신 안 됨
1. **토큰 확인**: 콘솔에서 FCM 토큰 로그 확인
2. **권한 확인**: `Notification.permission === 'granted'` 확인
3. **앱 상태**: 앱이 실행 중인지 확인
4. **VAPID 키**: 올바른 키가 설정되었는지 확인

---

## 📚 관련 파일

- `electron/main.js`: Electron 메인 프로세스 (Service Worker 활성화)
- `src/shared/services/firebase/messaging.ts`: FCM 초기화 및 토큰 관리
- `src/shared/components/common/FCMProvider.tsx`: FCM Context Provider
- `public/firebase-messaging-sw.js`: Service Worker (백그라운드 메시지)
- `functions/https/notifications.js`: 서버 측 푸시 발송

---

## 🎯 요약

### **Electron 개발 & 배포**
- ✅ FCM 제거됨 (Firestore 리스너만 사용)
- ✅ 에뮬레이터 완벽 지원
- ✅ 별도 설정 불필요
- ✅ 실시간 알림 (1-2초 지연)

### **웹 개발 & 배포**
1. ✅ VAPID 키 생성 및 `.env.local` 설정
2. ✅ 에뮬레이터 모드 끄기 (실제 Firebase 사용)
3. ✅ FCM 토큰 Firestore 저장 확인
4. ✅ 브라우저 알림 권한 허용
5. ✅ Firebase Console에서 테스트 알림 발송

---

**문제가 있으면 콘솔 로그나 에러 메시지를 공유해 주세요!**

