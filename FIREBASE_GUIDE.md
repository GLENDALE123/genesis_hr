# 🔥 Firebase 에뮬레이터 사용 가이드

## 📋 개요

이 프로젝트는 Firebase 에뮬레이터를 사용하여 로컬 개발 환경에서 Firebase 서비스를 테스트할 수 있도록 구성되어 있습니다.

## 🚀 빠른 시작

### 1. 에뮬레이터 시작
```bash
# 모든 에뮬레이터 시작
npm run firebase:emulators

# 특정 서비스만 시작
npm run firebase:emulators:auth      # Auth만
npm run firebase:emulators:firestore # Firestore만
npm run firebase:emulators:storage   # Storage만
npm run firebase:emulators:functions # Functions만
```

### 2. 개발 서버 시작 (에뮬레이터 모드)
```bash
npm run dev:emulator
```

### 3. 에뮬레이터 UI 접근
- **에뮬레이터 UI**: http://localhost:4000
- **Firestore 데이터 뷰어**: http://localhost:4000/firestore
- **Auth 사용자 관리**: http://localhost:4000/auth
- **Storage 파일 관리**: http://localhost:4000/storage

## 🛠️ 설정 파일

### firebase.json
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "functions": { "port": 5001 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### 환경변수 (.env.local)
```env
# 에뮬레이터 사용 여부
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# Firebase 프로젝트 설정
NEXT_PUBLIC_FIREBASE_PROJECT_ID=control-6a11d
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
# ... 기타 설정
```

## 📁 파일 구조

```
hs-next/
├── .firebase/                    # Firebase 설정 파일들
│   ├── firestore.rules          # Firestore 보안 규칙
│   ├── firestore.indexes.json   # Firestore 인덱스
│   ├── storage.rules            # Storage 보안 규칙
│   └── README.md                # 설정 파일 설명
├── functions/                    # Cloud Functions
│   ├── src/
│   │   └── index.ts             # Functions 코드
│   ├── package.json
│   └── tsconfig.json
├── firebase.json                 # Firebase 프로젝트 설정
└── FIREBASE_GUIDE.md            # 이 파일
```

## 🔧 개발 워크플로우

### 1. 개발 시작
```bash
# 터미널 1: 에뮬레이터 시작
npm run firebase:emulators

# 터미널 2: 개발 서버 시작
npm run dev:emulator
```

### 2. 데이터 테스트
- 에뮬레이터 UI에서 직접 데이터 추가/수정
- Auth에서 테스트 사용자 생성
- Storage에서 파일 업로드 테스트

### 3. Functions 테스트
```typescript
// 클라이언트에서 Functions 호출
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const calculatePayroll = httpsCallable(functions, 'calculatePayroll');

const result = await calculatePayroll({
  employeeId: 'emp001',
  baseSalary: 3000000,
  overtimeHours: 10,
  bonus: 500000
});
```

## 🛡️ 보안 규칙

### Firestore 규칙
- 인증된 사용자만 데이터 접근 가능
- 사용자별 데이터는 본인만 접근 가능
- 관리자만 급여 데이터 접근 가능

### Storage 규칙
- 인증된 사용자만 파일 업로드/다운로드 가능
- 사용자별 폴더는 본인만 접근 가능
- 공개 파일은 모든 사용자 읽기 가능

## 🚨 문제 해결

### 에뮬레이터 연결 실패
```bash
# 포트 충돌 확인
netstat -ano | findstr :9099
netstat -ano | findstr :8080
netstat -ano | findstr :9199

# 프로세스 종료
taskkill /PID <PID> /F
```

### 데이터 초기화
```bash
# 에뮬레이터 데이터 삭제
firebase emulators:export ./emulator-data
firebase emulators:start --import ./emulator-data
```

### Functions 빌드 오류
```bash
cd functions
npm install
npm run build
```

## 📊 모니터링

### 로그 확인
- 에뮬레이터 콘솔에서 실시간 로그 확인
- Functions 로그는 에뮬레이터 UI에서 확인

### 성능 테스트
- Firestore 쿼리 성능 확인
- Functions 실행 시간 모니터링
- Storage 업로드/다운로드 속도 테스트

## 🔄 배포

### 프로덕션 배포
```bash
# 에뮬레이터 모드 해제
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false

# Firebase 프로젝트에 배포
firebase deploy
```

### Functions 배포
```bash
cd functions
npm run build
firebase deploy --only functions
```

## 📚 추가 리소스

- [Firebase 에뮬레이터 공식 문서](https://firebase.google.com/docs/emulator-suite)
- [Firestore 보안 규칙](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions 가이드](https://firebase.google.com/docs/functions)
- [Firebase Storage 보안 규칙](https://firebase.google.com/docs/storage/security/get-started)
