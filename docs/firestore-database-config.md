# Firestore 데이터베이스 설정 가이드

## 개요

프로젝트는 환경변수를 통해 Firestore 데이터베이스 ID를 설정할 수 있습니다. 모든 코드가 이 환경변수를 통해 데이터베이스를 참조합니다.

## 환경변수 설정

### 클라이언트 (웹 애플리케이션)
```env
NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID=tms-production
```

### 서버 (Firebase Functions)
```env
FIREBASE_FIRESTORE_DATABASE_ID=tms-production
```

## 설정 값

- **`tms-production`**: seoul 리전의 tms-production 데이터베이스 사용 (기본값)
- **`(default)`** 또는 **빈 값**: 기본 데이터베이스 사용

## 코드에서 사용

### 클라이언트 코드
```typescript
// src/shared/services/firebase/config.ts
import { FIREBASE_FIRESTORE_DATABASE_ID } from './config';

// 자동으로 설정된 데이터베이스 사용
const db = getFirestore(app, { databaseId: FIREBASE_FIRESTORE_DATABASE_ID });
```

### Functions 코드
```javascript
// functions/lib/utils.js
const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || 'tms-production';
const db = getFirestore(admin.app(), databaseId);
```

## 현재 설정된 위치

### ✅ 환경변수로 관리
1. **클라이언트**: `src/shared/services/firebase/config.ts`
   - `NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID` 환경변수 사용
   - 기본값: `tms-production`

2. **Functions**: `functions/lib/utils.js`
   - `FIREBASE_FIRESTORE_DATABASE_ID` 환경변수 사용
   - 기본값: `tms-production`

3. **Functions (이미지 처리)**: `functions/lib/imageProcessing.js`
   - `FIREBASE_FIRESTORE_DATABASE_ID` 환경변수 사용
   - 기본값: `tms-production`

### ⚠️ 하드코딩 필요
1. **Storage 규칙**: `storage.rules`
   - Storage 규칙은 환경변수를 직접 사용할 수 없음
   - 데이터베이스 ID 변경 시 파일 수정 및 재배포 필요
   - 현재: `tms-production` 하드코딩

## 데이터베이스 변경 방법

### 1. 환경변수 업데이트
`.env.local` 파일에 추가 또는 수정:
```env
NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID=새로운데이터베이스ID
```

### 2. Functions 환경변수 설정
Firebase Functions에 환경변수 설정:
```bash
firebase functions:config:set firestore.database_id="새로운데이터베이스ID"
```

또는 Firebase Console에서:
1. Firebase Console → Functions → 설정
2. 환경변수 탭에서 `FIREBASE_FIRESTORE_DATABASE_ID` 설정

### 3. Storage 규칙 업데이트 (필요 시)
`storage.rules` 파일에서 데이터베이스 경로 수정 후 재배포:
```bash
firebase deploy --only storage:rules
```

## 주의사항

1. **환경변수 미설정 시**: 기본값 `tms-production` 사용
2. **Storage 규칙**: 환경변수 불가능, 하드코딩 필요
3. **Firestore 규칙**: Firebase Console에서 데이터베이스별로 배포 필요

## 확인 방법

현재 사용 중인 데이터베이스 확인:
```bash
# 프로젝트의 모든 데이터베이스 목록
gcloud firestore databases list --project=hs-jig-b2093
```

애플리케이션 로그에서 확인:
- 브라우저 콘솔 또는 서버 로그에서 Firestore 초기화 메시지 확인

