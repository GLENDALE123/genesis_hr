# 품질이력 통계 기능 최종 설계 문서

## 📊 실제 데이터 분석 결과 요약

### 분석된 데이터
- **수입검사**: 10건 (2025-09-18 ~ 2025-11-19)
- **공정검사**: 10건 (2025-09-04 ~ 2025-11-27)
- **출하검사**: 10건 (2025-09-15 ~ 2025-11-28)

### 주요 발견 사항

#### 1. 검사 결과 필드 사용 패턴
- **수입검사**: result 필드가 잘 채워져 있음 (합격 60%, 한도승인 30%, 한도대기 10%)
- **공정검사**: result 필드가 비어있는 경우가 많음 (미지정 50%, 합격 50%)
- **출하검사**: result 필드가 비어있는 경우가 많음 (미지정 60%, 합격 40%)

**대응 방안**: 
- result가 없는 경우를 별도로 집계하거나 "미등록"으로 표시
- 통계 계산 시 result가 있는 데이터만 사용하거나, 전체 데이터를 포함하되 별도 표시

#### 2. 키워드 페어 사용 패턴
- **수입검사**: 키워드 페어가 잘 사용됨 (주요 패턴: 사출→색상, 사출→가스, 사출→형상)
- **공정검사**: 키워드 페어가 잘 사용됨 (주요 패턴: 사출→기름, 증착→이물, 코팅→얼룩)
- **출하검사**: 키워드 페어 사용률이 낮음 (미지정→미지정 4회)

**대응 방안**:
- 키워드 페어가 있는 검사만 불량 패턴 분석에 포함
- 키워드 페어가 없는 경우 별도 표시

#### 3. 이미지 사용 패턴
- **수입검사**: 50% (5/10건)
- **공정검사**: 70% (7/10건)
- **출하검사**: 40% (4/10건)

**대응 방안**:
- 이미지 포함 여부를 통계 항목으로 추가
- 이미지가 있는 검사의 불량률과 없는 검사의 불량률 비교

#### 4. 필드 사용률
- 모든 검사 타입에서 기본 필드(orderNumber, supplier, productName, partName 등)는 100% 사용
- 타입별 특화 필드는 사용률이 다양함

## 🎯 통계 기능 설계 (실제 데이터 반영)

### 1. 기본 통계

#### 1.1 검사 타입별 통계
```typescript
interface TypeStatistics {
  incoming: {
    count: number;
    defectCount: number;      // 불합격 + 한도대기
    defectRate: number;
    withResult: number;        // result 필드가 있는 검사 수
    withoutResult: number;     // result 필드가 없는 검사 수
  };
  inProcess: {
    count: number;
    defectCount: number;
    defectRate: number;
    withResult: number;
    withoutResult: number;
  };
  outgoing: {
    count: number;
    defectCount: number;
    defectRate: number;
    withResult: number;
    withoutResult: number;
  };
  total: {
    count: number;
    defectCount: number;
    defectRate: number;
  };
}
```

**특징**:
- result 필드가 없는 경우를 별도로 집계
- 불량률은 result가 있는 검사만 대상으로 계산

#### 1.2 검사 결과별 통계
```typescript
interface ResultStatistics {
  합격: number;
  불합격: number;
  한도대기: number;
  한도승인: number;
  반출: number;
  미등록: number;  // result 필드가 없는 경우
}
```

### 2. 불량 패턴 분석 (실제 데이터 기반)

#### 2.1 키워드 페어 분석
실제 데이터에서 발견된 주요 패턴:

**수입검사**:
- 사출 → 색상 (3회)
- 사출 → 가스 (2회)
- 사출 → 형상 (2회)
- 사출 → 이물 (1회)
- 사출 → 파팅단차 (1회)

**공정검사**:
- 사출 → 기름 (5회)
- 증착 → 이물 (4회)
- 코팅 → 얼룩 (2회)
- 사출 → 가스 (2회)
- 코팅 → 이물 (1회)

**설계**:
```typescript
interface KeywordPairStatistics {
  process: string;
  defect: string;
  frequency: number;
  defectRate: number;
  byType: {
    incoming: number;
    inProcess: number;
    outgoing: number;
  };
  affectedOrders: string[];
  // 실제 데이터에서 발견된 패턴
  examples: Array<{
    orderNumber: string;
    date: string;
    result: string;
  }>;
}
```

### 3. 차원별 통계 (실제 데이터 기반)

#### 3.1 공급사별 통계
실제 데이터에서 발견된 공급사:
- 수입검사: 닥터코비(2건), 제담씨앤디, 창희인터내셔널, 카이코퍼레이션, 토니모리 등
- 공정검사: 승보(2건), 로쎄앙, 피씨엠, 코이즈, HNG화장품 등
- 출하검사: 승보(4건), 뷰티솔루션, 코스맥스, 에이치엠제이코리아 등

**설계**:
```typescript
interface SupplierStatistics {
  supplier: string;
  totalCount: number;
  defectCount: number;
  defectRate: number;
  byType: {
    incoming: { count: number; defectRate: number };
    inProcess: { count: number; defectRate: number };
    outgoing: { count: number; defectRate: number };
  };
  topDefects: Array<{
    defect: string;
    count: number;
    process?: string;
  }>;
  // 실제 데이터에서 발견된 패턴
  recentInspections: Array<{
    date: string;
    type: InspectionType;
    result: string;
  }>;
}
```

### 4. 타입별 특화 통계 (실제 데이터 기반)

#### 4.1 수입검사 특화
실제 데이터에서 발견:
- `appearanceHistory`: 모든 검사에서 사용됨 (100%)
- `functionHistory`: 대부분의 검사에서 사용됨
- `finalConsultationDept`: 일부 검사에서 사용됨

**설계**:
```typescript
interface IncomingSpecificStats {
  byConsultationDept: Array<{
    dept: string;
    count: number;
    defectRate: number;
  }>;
  appearanceHistoryAnalysis: {
    hasHistory: number;
    total: number;
    averageLength: number;  // 평균 이력 길이
  };
  functionHistoryAnalysis: {
    hasHistory: number;
    total: number;
    averageLength: number;
  };
  // 실제 데이터에서 발견된 패턴
  commonAppearanceIssues: string[];  // 외관이력에서 자주 언급되는 문제
  commonFunctionIssues: string[];   // 기능이력에서 자주 언급되는 문제
}
```

#### 4.2 공정검사 특화
실제 데이터에서 발견:
- `workLine`: 대부분의 검사에서 사용됨
- `jigUsed`: 일부 검사에서 사용됨
- `dryerUsed`, `flameTreatment`: 일부 검사에서 사용됨

**설계**:
```typescript
interface InProcessSpecificStats {
  byWorkLine: Array<{
    workLine: string;
    count: number;
    defectRate: number;
  }>;
  byJigUsed: Array<{
    jig: string;
    count: number;
    defectRate: number;
  }>;
  dryerUsage: {
    used: number;
    notUsed: number;
    defectRateByUsage: {
      used: number;
      notUsed: number;
    };
  };
  flameTreatment: {
    used: number;
    notUsed: number;
    defectRateByUsage: {
      used: number;
      notUsed: number;
    };
  };
  // 실제 데이터에서 발견된 패턴
  processLineAnalysis: {
    averageLineSpeed: number;
    commonLineConditions: Array<{
      type: '하도' | '상도';
      averageValue: number;
    }>;
  };
}
```

#### 4.3 출하검사 특화
실제 데이터에서 발견:
- `workers`: 대부분의 검사에서 사용됨 (작업자 수: 1~4명)
- `reliabilityReview`: 일부 검사에서 사용됨
- `colorCheckResult`: 일부 검사에서 사용됨

**설계**:
```typescript
interface OutgoingSpecificStats {
  byWorker: Array<{
    workerName: string;
    totalInspected: number;
    defectQuantity: number;
    defectRate: number;
    averageDefectRate: number;  // 작업자별 평균 불량률
  }>;
  reliabilityTestResults: {
    양호: number;
    부분박리: number;
    박리: number;
    notTested: number;  // 테스트하지 않은 경우
  };
  colorCheckResults: {
    색상동일: number;
    색상차이: number;
    notChecked: number;  // 검사하지 않은 경우
  };
  byWorkLine: Array<{
    workLine: string;
    count: number;
    defectRate: number;
  }>;
  // 실제 데이터에서 발견된 패턴
  workerPerformance: {
    topPerformers: Array<{ workerName: string; defectRate: number }>;
    needsAttention: Array<{ workerName: string; defectRate: number }>;
  };
}
```

### 5. 이미지 분석 통계

실제 데이터에서 이미지 사용률이 타입별로 다르므로:

```typescript
interface ImageAnalysis {
  byType: {
    incoming: {
      withImages: number;
      withoutImages: number;
      defectRateWithImages: number;
      defectRateWithoutImages: number;
    };
    inProcess: {
      withImages: number;
      withoutImages: number;
      defectRateWithImages: number;
      defectRateWithoutImages: number;
    };
    outgoing: {
      withImages: number;
      withoutImages: number;
      defectRateWithImages: number;
      defectRateWithoutImages: number;
    };
  };
  averageImagesPerInspection: {
    incoming: number;
    inProcess: number;
    outgoing: number;
  };
}
```

## 🔧 통계 계산 로직 개선

### 불량률 계산 개선
```typescript
function calculateDefectRate(inspections: QualityInspection[]): {
  defectRate: number;
  withResult: number;
  withoutResult: number;
  defectRateWithResult: number;
} {
  const withResult = inspections.filter(i => i.result && i.result !== '미지정');
  const withoutResult = inspections.filter(i => !i.result || i.result === '미지정');
  
  const defectCount = withResult.filter(i => 
    DEFECT_RESULTS.includes(i.result as InspectionResult)
  ).length;
  
  return {
    defectRate: inspections.length > 0 
      ? (defectCount / inspections.length) * 100 
      : 0,
    withResult: withResult.length,
    withoutResult: withoutResult.length,
    defectRateWithResult: withResult.length > 0
      ? (defectCount / withResult.length) * 100
      : 0
  };
}
```

### 키워드 페어 분석 개선
```typescript
function analyzeKeywordPairs(inspections: QualityInspection[]): KeywordPairStatistics[] {
  // 키워드 페어가 있는 검사만 분석
  const withKeywordPairs = inspections.filter(
    i => i.keywordPairs && i.keywordPairs.length > 0
  );
  
  // 키워드 페어가 없는 검사는 별도 집계
  const withoutKeywordPairs = inspections.length - withKeywordPairs.length;
  
  // 기존 키워드 페어 분석 로직...
  
  return {
    statistics: [...],
    metadata: {
      withKeywordPairs: withKeywordPairs.length,
      withoutKeywordPairs,
      coverageRate: (withKeywordPairs.length / inspections.length) * 100
    }
  };
}
```

## 📊 UI 구성 제안 (실제 데이터 반영)

### 1. 대시보드 뷰
- **주요 지표 카드**:
  - 전체 검사 수 (타입별 분리)
  - 전체 불량률 (result가 있는 검사만)
  - result 미등록 검사 수 (경고 표시)
  - 키워드 페어 커버리지 (%)

- **차트**:
  - 검사 결과 분포 (파이 차트, 미등록 포함)
  - 타입별 불량률 비교 (바 차트)
  - 날짜별 트렌드 (라인 차트)
  - 키워드 페어 빈도 (워드 클라우드 또는 바 차트)

### 2. 상세 통계 뷰
- **탭 구성**:
  1. 기본 통계 (타입별, 결과별)
  2. 불량 패턴 (키워드 페어 분석)
  3. 공급사별 통계
  4. 제품별 통계
  5. 타입별 특화 통계
  6. 이미지 분석

### 3. 필터 옵션
- 날짜 범위
- 검사 타입 (다중 선택)
- 검사 결과 (미등록 포함)
- 공급사
- 제품명
- 키워드 페어 유무 (있음/없음/전체)

## 🚀 구현 우선순위 (실제 데이터 반영)

### Phase 1: 기본 통계 (필수)
1. ✅ 검사 타입별 통계 (result 미등록 포함)
2. ✅ 검사 결과별 통계 (미등록 포함)
3. ✅ 불량률 계산 (result가 있는 검사만)
4. ✅ 날짜 범위 필터링

### Phase 2: 불량 패턴 분석 (중요)
1. ✅ 키워드 페어 분석 (실제 데이터에서 발견된 패턴 반영)
2. ✅ 키워드 페어 커버리지 표시
3. ✅ 공정-불량 조합 빈도 분석

### Phase 3: 차원별 통계 (중요)
1. ✅ 공급사별 통계 (실제 데이터에서 발견된 공급사 반영)
2. ✅ 제품별 통계
3. ✅ 검사자별 통계

### Phase 4: 타입별 특화 통계 (선택)
1. ✅ 수입검사: 외관/기능이력 분석
2. ✅ 공정검사: 작업라인, 지그 사용 분석
3. ✅ 출하검사: 작업자별 성과 분석

### Phase 5: 고급 분석 (선택)
1. 이미지 분석 통계
2. 트렌드 분석 (주별/월별)
3. 예측 분석 (불량 패턴 예측)

## 📝 주의사항

1. **result 필드가 없는 경우 처리**
   - 통계에서 별도로 표시
   - 불량률 계산 시 제외하거나 별도 집계

2. **키워드 페어가 없는 경우 처리**
   - 출하검사에서 키워드 페어 사용률이 낮음
   - 키워드 페어가 없는 검사는 별도 집계

3. **데이터 품질 개선**
   - result 필드 미입력 경고
   - 키워드 페어 입력 유도

4. **성능 최적화**
   - 대량 데이터 처리 시 클라이언트 측 집계 최소화
   - 필요한 경우 Firestore 쿼리 최적화

## ✅ 완료된 작업

1. ✅ 실제 데이터 분석 (각 타입별 10개씩)
2. ✅ 데이터 구조 파악
3. ✅ 통계 항목 도출
4. ✅ 통계 기능 설계 문서 작성
5. ✅ 타입 정의 및 서비스 구현

## 📦 다음 단계

1. 통계 대시보드 컴포넌트 구현
2. 차트 컴포넌트 구현 (Recharts 활용)
3. 필터 컴포넌트 구현
4. 실제 데이터로 테스트 및 검증




