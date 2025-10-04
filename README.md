# HS Next App

Firebase와 Next.js를 사용한 현대적인 웹 애플리케이션입니다.

## 🚀 기술 스택

- **Next.js 15** - React 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 퍼스트 CSS
- **Firebase** - 백엔드 서비스
  - Authentication - 사용자 인증
  - Firestore - NoSQL 데이터베이스
  - Storage - 파일 저장소

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── login/             # 로그인 페이지
│   ├── dashboard/         # 대시보드 페이지
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 홈페이지
├── components/            # 재사용 가능한 컴포넌트
│   └── ProtectedRoute.tsx # 보호된 라우트
├── contexts/              # React Context
│   └── AuthContext.tsx    # 인증 컨텍스트
└── lib/                   # 유틸리티 및 설정
    ├── firebase.ts        # Firebase 초기화
    ├── firebase-auth.ts   # 인증 함수들
    ├── firebase-firestore.ts # Firestore 함수들
    └── firebase-storage.ts   # Storage 함수들
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
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase VAPID 키 (FCM 푸시 알림용)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here

# Firebase 에뮬레이터 사용 여부 (개발 환경에서만 true)
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
```

#### VAPID 키 생성 방법
1. Firebase Console → 프로젝트 설정 → 클라우드 메시징
2. "웹 푸시 인증서" 섹션에서 키 쌍 생성
3. 생성된 키를 `NEXT_PUBLIC_FIREBASE_VAPID_KEY`에 설정

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

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
- 로그아웃 기능

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

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint
```

## 📚 추가 리소스

- [Next.js 문서](https://nextjs.org/docs)
- [Firebase 문서](https://firebase.google.com/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [TypeScript 문서](https://www.typescriptlang.org/docs)

## 🚀 배포

### Vercel 배포
```bash
npm run build
```

Vercel 플랫폼에서 자동 배포가 가능합니다.

### 환경 변수 설정
배포 시 Vercel 대시보드에서 Firebase 환경 변수들을 설정해주세요.
