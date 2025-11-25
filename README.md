# TMS 통합관리시스템

Firebase와 Vite + React를 사용한 현대적인 웹 애플리케이션입니다.

## 🚀 기술 스택

- **Vite 7.2.2** - 빠른 빌드 도구 및 개발 서버
- **React 19.2.0** - UI 라이브러리
- **TypeScript 5.7.2** - 타입 안전성
- **React Router v7** - 클라이언트 사이드 라우팅
- **Tailwind CSS 3.4.18** - 유틸리티 퍼스트 CSS
- **Firebase 12.3.0** - 백엔드 서비스
  - Authentication - 사용자 인증
  - Firestore - NoSQL 데이터베이스
  - Storage - 파일 저장소
  - Cloud Messaging - 푸시 알림

## 📁 프로젝트 구조

```
src/
├── app/                    # 앱 레벨 설정
│   ├── routes/            # 중앙 집중식 라우트 정의
│   ├── pages/             # 페이지 컴포넌트
│   ├── providers/         # 전역 Provider 컴포넌트
│   └── store/             # 전역 상태 관리
├── features/               # 피처별 모듈
│   ├── auth/              # 인증 피처
│   ├── dashboard/         # 대시보드 피처
│   └── ...
├── shared/                 # 공유 모듈
│   ├── components/        # 공통 UI 컴포넌트
│   ├── hooks/             # 공통 훅
│   ├── utils/             # 공통 유틸리티
│   └── types/             # 공통 타입
└── lib/                   # 라이브러리 설정
    └── utils.ts           # 유틸리티 함수
```

## 🛠️ 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. Firebase 설정
자세한 설정 방법은 [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)를 참조하세요.

### 3. 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 Firebase 설정 값을 추가하세요:

```env
# Firebase 설정
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase VAPID 키 (FCM 푸시 알림용)
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

#### VAPID 키 생성 방법
1. Firebase Console → 프로젝트 설정 → 클라우드 메시징
2. "웹 푸시 인증서" 섹션에서 키 쌍 생성
3. 생성된 키를 `VITE_FIREBASE_VAPID_KEY`에 설정

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173)을 열어 확인하세요.

## 🎯 주요 기능

### ✅ 인증 시스템
- 이메일/비밀번호 로그인
- 회원가입
- 로그아웃
- 인증 상태 관리

### ✅ 보호된 라우트
- 인증되지 않은 사용자 자동 리다이렉트
- 로딩 상태 처리

### ✅ Firestore 연동
- 실시간 데이터베이스
- CRUD 작업
- 쿼리 기능

### ✅ 파일 업로드
- Firebase Storage 연동
- 파일 메타데이터 관리

### ✅ 푸시 알림 (FCM)
- Firebase Cloud Messaging 연동
- 포그라운드/백그라운드 알림 처리
- 서비스 워커 기반 알림 관리
- 토큰 기반 디바이스 식별

## 📱 페이지 구성

### 홈페이지 (`/`)
- 사용자 정보 표시
- Firebase 서비스 상태 확인
- 로그인 상태에 따라 자동 리다이렉트

### 로그인 페이지 (`/login`)
- 로그인/회원가입 폼
- 에러 처리
- 자동 리다이렉트

### 대시보드 (`/dashboard`)
- 할 일 관리 (Firestore 연동)
- 실시간 데이터 업데이트
- 보호된 라우트

## 🔧 개발 스크립트

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 빌드 미리보기
npm run preview

# 린트 검사
npm run lint

# 코드 포맷팅
npm run format
```

## 📚 추가 리소스

- [Vite 문서](https://vitejs.dev/)
- [React 문서](https://react.dev/)
- [React Router 문서](https://reactrouter.com/)
- [Firebase 문서](https://firebase.google.com/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [TypeScript 문서](https://www.typescriptlang.org/docs)

## 🚀 배포

### Vite 빌드
```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

### 환경 변수 설정
배포 시 Firebase 환경 변수들을 설정해주세요. Vite는 `VITE_` 접두사가 붙은 환경 변수만 클라이언트에 노출됩니다.
