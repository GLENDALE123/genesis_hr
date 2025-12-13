# product-summary 컬렉션 구조 설계

## 개요
종합관리테이블의 성능 최적화를 위해 사전 집계된 제품 정보를 저장하는 캐시 컬렉션입니다.

## 컬렉션 정보
- **컬렉션명**: `product-summary`
- **문서 ID**: `{supplier}_{productName}_{partName}_{specification}` (기존 `generateProductId`와 동일)
- **업데이트 주체**: Cloud Functions (클라이언트 직접 쓰기 금지)

## 문서 구조

```typescript
interface ProductSummary {
  // 기본 정보
  id: string; // 제품 고유 ID (문서 ID와 동일)
  supplier: string; // 발주처
  productName: string; // 제품명
  partName: string; // 부속명
  specification: string; // 사양
  
  // 집계된 정보
  latestJig?: string; // 최신 사용지그 (쉼표로 구분된 문자열)
  latestJigDate?: string; // 최신 지그 정보의 날짜 (ISO 8601)
  latestUndercoatData?: string; // 최신 하도데이터
  latestTopcoatData?: string; // 최신 상도데이터
  averagePersonnelCount?: number; // 평균작업인원 (소수점 첫째자리까지)
  latestLineRatio?: string; // 최근 비율(스핀들비율)
  averageRPM?: number; // 평균 작업속도(RPM) (소수점 첫째자리까지)
  
  // 메타데이터
  lastUpdated: string; // 마지막 업데이트 시간 (ISO 8601)
  sourceReportIds: string[]; // 참조하는 packaging-reports 문서 ID 배열
  sourceInspectionIds: string[]; // 참조하는 quality-inspections 문서 ID 배열
}
```

## 업데이트 전략

### 1. 증분 업데이트
- 변경된 `packaging-reports` 또는 `quality-inspections` 문서에서 영향받는 제품 ID만 추출
- 해당 제품의 `product-summary`만 재계산 및 업데이트
- 전체 재계산은 초기 마이그레이션 시에만 수행

### 2. 배치 처리
- 짧은 시간 내 여러 변경사항이 발생하면 모아서 한 번에 처리
- Pub/Sub를 사용한 배치 큐 (향후 구현)
- 현재는 Cloud Functions의 기본 debouncing 활용

### 3. 부분 업데이트
- 변경된 필드만 업데이트
- 예: `packaging-reports` 변경 시 `latestUndercoatData`, `latestTopcoatData`만 업데이트
- 예: `quality-inspections` 변경 시 `latestJig`, `averageRPM`만 업데이트

## 인덱스

### 필수 인덱스
```json
{
  "collectionGroup": "product-summary",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "supplier",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "productName",
      "order": "ASCENDING"
    }
  ]
}
```

```json
{
  "collectionGroup": "product-summary",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "lastUpdated",
      "order": "DESCENDING"
    }
  ]
}
```

## 보안 규칙

```javascript
match /product-summary/{productId} {
  // 읽기는 모든 인증된 사용자 허용
  allow read: if request.auth != null;
  
  // 쓰기는 Cloud Functions만 허용 (클라이언트 직접 쓰기 금지)
  allow write: if false;
}
```

## 성능 최적화

### 읽기 최적화
- 필요한 필드만 선택적으로 조회 (`select` 쿼리)
- 검색은 서버 사이드에서 처리 (Firestore 쿼리)

### 쓰기 최적화
- 증분 업데이트로 변경된 제품만 재계산
- 배치 처리로 여러 업데이트를 한 번에 처리
- 부분 업데이트로 변경된 필드만 업데이트

## 마이그레이션

### 초기 구축
1. 기존 `packaging-reports`와 `quality-inspections` 데이터로 전체 제품 목록 추출
2. 각 제품별로 `product-summary` 문서 생성
3. Cloud Functions 트리거 활성화

### 데이터 정합성
- Cloud Functions 실패 시 수동 재계산 스크립트 제공
- 주기적인 전체 재계산 배치 작업 (선택사항)
