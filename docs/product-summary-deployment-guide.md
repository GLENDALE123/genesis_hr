# Product Summary 캐시 컬렉션 배포 가이드

## 개요

이 가이드는 `product-summary` 캐시 컬렉션을 배포하고 초기 구축하는 방법을 설명합니다.

## 사전 준비사항

1. Firebase CLI 설치 및 로그인
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. 프로젝트 선택
   ```bash
   firebase use [project-id]
   ```

## 배포 단계

### 1. Firestore 인덱스 배포

`product-summary` 컬렉션을 위한 인덱스가 이미 `firestore.indexes.json`에 정의되어 있습니다.

```bash
firebase deploy --only firestore:indexes
```

**중요**: 인덱스 생성에는 몇 분에서 몇 시간이 걸릴 수 있습니다. 인덱스가 완전히 생성될 때까지 기다려야 합니다.

인덱스 생성 상태 확인:
```bash
firebase firestore:indexes
```

### 2. Firestore 보안 규칙 배포

`product-summary` 컬렉션에 대한 보안 규칙이 이미 `firestore.rules`에 정의되어 있습니다.

```bash
firebase deploy --only firestore:rules
```

### 3. Cloud Functions 배포

Product Summary 관련 함수들을 배포합니다.

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

배포되는 함수들:
- `onPackagingReportChange`: packaging-reports 변경 시 자동 업데이트
- `onQualityInspectionChange`: quality-inspections 변경 시 자동 업데이트
- `initializeProductSummary`: 초기 구축용 HTTPS 함수

### 4. 초기 구축 실행

배포가 완료되면 초기 구축을 실행합니다.

#### 방법 1: HTTPS 함수 사용 (권장)

```bash
# 함수 URL 확인
firebase functions:config:get

# HTTP 요청으로 초기 구축 실행
curl -X POST https://asia-northeast3-[project-id].cloudfunctions.net/initializeProductSummary \
  -H "Content-Type: application/json" \
  -d '{}'
```

또는 브라우저에서 직접 호출:
```
POST https://asia-northeast3-[project-id].cloudfunctions.net/initializeProductSummary
```

#### 방법 2: 로컬 스크립트 실행

```bash
cd functions
node scripts/initializeProductSummary.js
```

**주의**: 로컬 스크립트는 Firebase Admin SDK가 올바르게 설정되어 있어야 합니다.

### 5. 클라이언트 사이드 배포

클라이언트 사이드 코드가 이미 캐시 컬렉션을 사용하도록 구현되어 있습니다.

```bash
npm run build
firebase deploy --only hosting
```

## 검증

### 1. 캐시 컬렉션 데이터 확인

Firebase Console에서 `product-summary` 컬렉션을 확인합니다.

1. Firebase Console → Firestore Database
2. `product-summary` 컬렉션 선택
3. 문서 수와 데이터 구조 확인

### 2. 실시간 업데이트 테스트

1. `packaging-reports` 컬렉션에 새 문서 추가
2. 몇 초 후 `product-summary` 컬렉션에서 해당 제품의 `lastUpdated` 필드 확인
3. `quality-inspections` 컬렉션에 새 문서 추가
4. 몇 초 후 `product-summary` 컬렉션에서 해당 제품의 `lastUpdated` 필드 확인

### 3. 클라이언트 사이드 동작 확인

1. 애플리케이션 실행
2. 종합관리테이블 페이지 접속
3. 제품 목록이 빠르게 로드되는지 확인
4. 브라우저 콘솔에서 에러 확인

## 문제 해결

### 인덱스 생성 실패

**증상**: 쿼리 실행 시 인덱스 오류 발생

**해결**:
1. `firestore.indexes.json` 확인
2. Firebase Console에서 인덱스 생성 상태 확인
3. 필요한 경우 수동으로 인덱스 생성

### Cloud Functions 배포 실패

**증상**: Functions 배포 중 오류 발생

**해결**:
1. `functions/package.json` 확인
2. `functions/node_modules` 삭제 후 재설치
3. Firebase CLI 버전 확인 및 업데이트

### 초기 구축 실패

**증상**: 초기 구축 함수 실행 시 타임아웃 또는 오류

**해결**:
1. Functions 로그 확인: `firebase functions:log`
2. 타임아웃 시간 증가 (현재 540초)
3. 메모리 증가 (현재 1GiB)
4. 배치 크기 조정 (`functions/scripts/initializeProductSummary.js`)

### 캐시 데이터가 업데이트되지 않음

**증상**: 원본 데이터 변경 후 캐시가 업데이트되지 않음

**해결**:
1. Cloud Functions 로그 확인
2. 트리거가 정상적으로 등록되었는지 확인
3. 수동으로 재계산: `initializeProductSummary` 함수 재실행

## 성능 모니터링

### Cloud Functions 로그 확인

```bash
firebase functions:log --only onPackagingReportChange
firebase functions:log --only onQualityInspectionChange
```

### Firestore 사용량 확인

Firebase Console → Firestore Database → Usage 탭에서 읽기/쓰기 사용량 확인

### 클라이언트 사이드 성능

브라우저 개발자 도구 → Network 탭에서:
- `product-summary` 컬렉션 조회 시간 확인
- 문서 수 확인 (기존 4000개 → 100-500개로 감소)

## 롤백 계획

문제가 발생하면 다음 단계로 롤백할 수 있습니다:

1. 클라이언트 사이드에서 `useProducts` 훅이 자동으로 fallback 사용
2. Cloud Functions 트리거 비활성화 (선택사항)
3. `product-summary` 컬렉션 삭제 (선택사항)

## 추가 최적화

기본 구현이 완료되면 다음 최적화를 적용할 수 있습니다:

1. 필드 선택적 조회 (`select` 쿼리)
2. 서버 사이드 검색 및 필터링
3. 로컬 캐싱 (IndexedDB)
4. 배치 처리 및 Debouncing

자세한 내용은 `.cursor/plans/종합관리테이블_캐시_컬렉션_최적화_0e53e38f.plan.md`를 참조하세요.





