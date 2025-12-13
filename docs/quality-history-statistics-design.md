# 품질이력 통계 기능 설계 문서

## 📊 개요

품질검사 데이터(수입검사, 공정검사, 출하검사)를 기반으로 통계를 생성하고 분석하는 기능을 설계합니다.

## 🎯 설계 목표

1. **검사 타입별 통계**: 수입/공정/출하 검사별 검사 수, 불량률 등
2. **차원별 통계**: 공급사, 제품, 부품명, 검사자별 통계
3. **불량 패턴 분석**: 공정-불량 키워드 페어 분석
4. **트렌드 분석**: 시간대별, 날짜별 검사 및 불량률 추이
5. **타입별 특화 통계**: 각 검사 타입의 특화 필드 활용

## 📋 데이터 구조 분석

### 공통 필드
- `inspectionType`: 'incoming' | 'inProcess' | 'outgoing'
- `orderNumber`: 발주번호
- `supplier`: 공급사
- `productName`: 제품명
- `partName`: 부품명
- `result`: '합격' | '불합격' | '한도대기' | '한도승인' | '반출'
- `keywordPairs`: 공정-불량 키워드 페어 배열
- `inspectionDate`: 검사일 (없으면 createdAt 사용)
- `inspector`: 검사자 정보

### 타입별 특화 필드

#### 수입검사 (incoming)
- `appearanceHistory`: 외관이력
- `functionHistory`: 기능이력
- `finalConsultationDept`: 최종협의부서

#### 공정검사 (inProcess)
- `workLine`: 작업라인
- `preInspectionHistory`: 사전검사이력
- `inProcessInspectionHistory`: 공정검사이력
- `processLines`: 공정라인 데이터
- `jigUsed`, `jigUsed1`, `jigUsed2`: 지그 사용 정보
- `dryerUsed`: 건조기 사용 여부
- `flameTreatment`: 화염처리 여부

#### 출하검사 (outgoing)
- `workLine`: 작업라인
- `workerCount`: 작업자 수
- `workers`: 작업자별 검사 데이터 배열
- `reliabilityReview`: 신뢰성 테스트 결과
- `reliabilityTestResult`: 신뢰성 테스트 상세
- `colorCheckResult`: 색상 검사 결과
- `defectResultPairs`: 불량-결과 페어 배열

## 📊 통계 항목 설계

### 1. 기본 통계

#### 1.1 검사 타입별 통계
```typescript
interface TypeStatistics {
  incoming: {
    count: number;           // 수입검사 총 건수
    defectCount: number;    // 불량 건수 (불합격 + 한도대기)
    defectRate: number;     // 불량률 (%)
  };
  inProcess: {
    count: number;
    defectCount: number;
    defectRate: number;
  };
  outgoing: {
    count: number;
    defectCount: number;
    defectRate: number;
  };
  total: {
    count: number;
    defectCount: number;
    defectRate: number;
  };
}
```

#### 1.2 검사 결과별 통계
```typescript
interface ResultStatistics {
  합격: number;
  불합격: number;
  한도대기: number;
  한도승인: number;
  반출: number;
}
```

#### 1.3 불량률 계산 규칙
- **불량으로 간주**: '불합격', '한도대기'
- **불량률 공식**: (불량 건수 / 전체 검사 건수) × 100
- **타입별 불량률**: 각 검사 타입별로 별도 계산

### 2. 차원별 통계

#### 2.1 공급사별 통계
```typescript
interface SupplierStatistics {
  supplier: string;
  totalCount: number;           // 총 검사 건수
  defectCount: number;         // 불량 건수
  defectRate: number;          // 불량률 (%)
  byType: {
    incoming: { count: number; defectRate: number };
    inProcess: { count: number; defectRate: number };
    outgoing: { count: number; defectRate: number };
  };
  topDefects: Array<{         // 주요 불량 유형 (상위 5개)
    defect: string;
    count: number;
    process?: string;         // 공정 정보 (키워드 페어에서 추출)
  }>;
}
```

#### 2.2 제품별 통계
```typescript
interface ProductStatistics {
  productName: string;
  partName: string;            // 부품명도 함께 표시
  totalCount: number;
  defectCount: number;
  defectRate: number;
  byType: {
    incoming: { count: number; defectRate: number };
    inProcess: { count: number; defectRate: number };
    outgoing: { count: number; defectRate: number };
  };
  suppliers: string[];         // 관련 공급사 목록
}
```

#### 2.3 부품명별 통계
```typescript
interface PartStatistics {
  partName: string;
  totalCount: number;
  defectCount: number;
  defectRate: number;
  products: string[];          // 관련 제품명 목록
}
```

#### 2.4 검사자별 통계
```typescript
interface InspectorStatistics {
  inspector: string;           // 검사자 이름 또는 이메일
  totalCount: number;
  defectCount: number;
  defectRate: number;
  byType: {
    incoming: { count: number; defectRate: number };
    inProcess: { count: number; defectRate: number };
    outgoing: { count: number; defectRate: number };
  };
}
```

### 3. 불량 패턴 분석

#### 3.1 키워드 페어 분석
```typescript
interface KeywordPairStatistics {
  process: string;             // 공정명
  defect: string;             // 불량명
  frequency: number;          // 발생 빈도
  defectRate: number;        // 해당 페어의 불량률
  affectedOrders: string[];   // 영향받은 발주번호 (상위 10개)
  byType: {
    incoming: number;
    inProcess: number;
    outgoing: number;
  };
}
```

#### 3.2 불량 패턴 추출
- 공정-불량 조합의 빈도순 정렬
- 불량률이 높은 패턴 우선 표시
- 타입별 발생 빈도 분석

### 4. 트렌드 분석

#### 4.1 날짜별 트렌드
```typescript
interface DateTrend {
  date: string;               // YYYY-MM-DD
  totalCount: number;
  defectCount: number;
  defectRate: number;
  byType: {
    incoming: number;
    inProcess: number;
    outgoing: number;
  };
}
```

#### 4.2 주별/월별 집계
- 주별 집계: 주 시작일(월요일) 기준
- 월별 집계: 년-월 기준
- 선택 가능한 집계 단위 제공

### 5. 타입별 특화 통계

#### 5.1 수입검사 특화
```typescript
interface IncomingSpecificStats {
  byConsultationDept: {       // 최종협의부서별 통계
    dept: string;
    count: number;
    defectRate: number;
  }[];
  appearanceHistoryAnalysis: { // 외관이력 분석
    hasHistory: number;
    total: number;
  };
  functionHistoryAnalysis: {  // 기능이력 분석
    hasHistory: number;
    total: number;
  };
}
```

#### 5.2 공정검사 특화
```typescript
interface InProcessSpecificStats {
  byWorkLine: {               // 작업라인별 통계
    workLine: string;
    count: number;
    defectRate: number;
  }[];
  byJigUsed: {                // 지그 사용별 통계
    jig: string;
    count: number;
    defectRate: number;
  }[];
  dryerUsage: {               // 건조기 사용 통계
    used: number;
    notUsed: number;
    defectRateByUsage: {
      used: number;
      notUsed: number;
    };
  };
  flameTreatment: {           // 화염처리 통계
    used: number;
    notUsed: number;
    defectRateByUsage: {
      used: number;
      notUsed: number;
    };
  };
}
```

#### 5.3 출하검사 특화
```typescript
interface OutgoingSpecificStats {
  byWorker: {                 // 작업자별 통계
    workerName: string;
    totalInspected: number;
    defectQuantity: number;
    defectRate: number;
  }[];
  reliabilityTestResults: {   // 신뢰성 테스트 결과 통계
    양호: number;
    부분박리: number;
    박리: number;
  };
  colorCheckResults: {        // 색상 검사 결과 통계
    색상동일: number;
    색상차이: number;
  };
  byWorkLine: {               // 작업라인별 통계
    workLine: string;
    count: number;
    defectRate: number;
  }[];
}
```

## 🔧 통계 계산 로직

### 불량률 계산
```typescript
function calculateDefectRate(inspections: QualityInspection[]): number {
  if (inspections.length === 0) return 0;
  
  const defectCount = inspections.filter(inspection => 
    inspection.result === '불합격' || inspection.result === '한도대기'
  ).length;
  
  return (defectCount / inspections.length) * 100;
}
```

### 키워드 페어 집계
```typescript
function aggregateKeywordPairs(inspections: QualityInspection[]): KeywordPairStatistics[] {
  const pairMap = new Map<string, {
    count: number;
    defectCount: number;
    orders: Set<string>;
    byType: { incoming: number; inProcess: number; outgoing: number };
  }>();

  inspections.forEach(inspection => {
    if (!inspection.keywordPairs || inspection.keywordPairs.length === 0) return;

    inspection.keywordPairs.forEach(pair => {
      const key = `${pair.process}|${pair.defect}`;
      
      if (!pairMap.has(key)) {
        pairMap.set(key, {
          count: 0,
          defectCount: 0,
          orders: new Set(),
          byType: { incoming: 0, inProcess: 0, outgoing: 0 }
        });
      }

      const entry = pairMap.get(key)!;
      entry.count++;
      entry.byType[inspection.inspectionType]++;
      
      if (inspection.result === '불합격' || inspection.result === '한도대기') {
        entry.defectCount++;
      }
      
      if (inspection.orderNumber) {
        entry.orders.add(inspection.orderNumber);
      }
    });
  });

  return Array.from(pairMap.entries()).map(([key, value]) => {
    const [process, defect] = key.split('|');
    return {
      process,
      defect,
      frequency: value.count,
      defectRate: (value.defectCount / value.count) * 100,
      affectedOrders: Array.from(value.orders).slice(0, 10),
      byType: value.byType
    };
  }).sort((a, b) => b.frequency - a.frequency);
}
```

## 📅 날짜 필터링

### 날짜 필드 우선순위
1. `inspectionDate` (있는 경우)
2. `createdAt`에서 날짜 부분 추출 (YYYY-MM-DD)

### 날짜 범위 필터링
- 시작일 ~ 종료일 범위 지정
- 기본값: 최근 30일 또는 전체 기간

## 🎨 UI 구성 제안

### 1. 대시보드 뷰
- 카드 형태의 주요 지표 표시
  - 전체 검사 수
  - 전체 불량률
  - 타입별 검사 수 및 불량률
- 차트로 시각화
  - 검사 결과 분포 (파이 차트)
  - 타입별 불량률 비교 (바 차트)
  - 날짜별 트렌드 (라인 차트)

### 2. 상세 통계 뷰
- 탭으로 구분
  - 기본 통계
  - 공급사별 통계
  - 제품별 통계
  - 불량 패턴
  - 트렌드 분석
  - 타입별 특화 통계

### 3. 필터 옵션
- 날짜 범위 선택
- 검사 타입 선택 (다중 선택)
- 검사 결과 필터
- 공급사 필터
- 제품명 필터

## 📦 구현 파일 구조

```
src/features/quality/
├── statistics/
│   ├── types/
│   │   └── statistics.types.ts        # 통계 관련 타입 정의
│   ├── services/
│   │   └── qualityStatisticsService.ts # 통계 계산 로직
│   ├── hooks/
│   │   └── useQualityStatistics.ts    # 통계 데이터 훅
│   └── components/
│       ├── QualityStatisticsDashboard.tsx  # 대시보드 컴포넌트
│       ├── StatisticsCard.tsx              # 통계 카드 컴포넌트
│       ├── DefectPatternChart.tsx          # 불량 패턴 차트
│       └── TrendChart.tsx                  # 트렌드 차트
```

## 🚀 구현 우선순위

### Phase 1: 기본 통계 (필수)
1. 검사 타입별 통계
2. 검사 결과별 통계
3. 불량률 계산
4. 날짜 범위 필터링

### Phase 2: 차원별 통계 (중요)
1. 공급사별 통계
2. 제품별 통계
3. 키워드 페어 분석

### Phase 3: 고급 분석 (선택)
1. 트렌드 분석
2. 타입별 특화 통계
3. 검사자별 통계

## 📝 참고사항

1. **성능 최적화**
   - 대량 데이터 처리 시 클라이언트 측 집계 최소화
   - 필요한 경우 Firestore 쿼리 최적화
   - 페이지네이션 또는 가상 스크롤 고려

2. **데이터 정확성**
   - `inspectionDate`가 없으면 `createdAt` 사용
   - 키워드 페어가 없는 경우도 고려
   - 검사자 정보가 객체인 경우 처리

3. **사용자 경험**
   - 로딩 상태 표시
   - 빈 데이터 처리
   - 에러 처리 및 재시도

4. **확장성**
   - 새로운 통계 항목 추가 용이
   - 타입별 특화 통계 확장 가능
   - 차트 라이브러리 활용 (Recharts)






























