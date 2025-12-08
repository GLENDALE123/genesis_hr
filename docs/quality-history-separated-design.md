# 품질이력 분리 표시 설계 (수입/공정/출하 각각)

## 🎯 핵심 요구사항

1. **수입검사, 공정검사, 출하검사를 각각 분리해서 표시**
2. **각 타입별로 중요한 정보를 한눈에 확인**
3. **다음 작업 시 전 이력을 참고할 수 있도록 직관적 표시**

## 📊 분석 데이터 기반 각 타입별 중요 정보

### 1. 수입검사 (Incoming Inspection)

**중요 필드**:
- `appearanceHistory` (외관검사이력) - 중요!
- `functionHistory` (기능검사이력) - 중요!
- `finalConsultationDept/Name/Rank` (최종협의)
- `result` (검사결과)
- `keywordPairs` (불량 패턴)

**표시할 정보**:
- 총 검사 수
- 불량률 (불합격 + 한도대기)
- 최근 검사일 및 결과
- 주요 불량 패턴 (키워드 페어)
- 외관검사이력 요약 (있는 경우)
- 기능검사이력 요약 (있는 경우)

### 2. 공정검사 (In-Process Inspection)

**중요 필드**:
- `inProcessInspectionHistory` (공정검사이력) - **가장 중요!**
- `preInspectionHistory` (사전검사이력)
- `workLine` (작업라인)
- `jigUsed1`, `jigUsed2` (사용지그)
- `result` (검사결과)
- `keywordPairs` (불량 패턴)

**표시할 정보**:
- 총 검사 수
- 불량률
- 최근 검사일 및 결과
- **공정검사이력 요약** (불량률, 불량 유형 추출)
- 사전검사이력 요약 (있는 경우)
- 작업라인별 분포
- 주요 불량 패턴

### 3. 출하검사 (Outgoing Inspection)

**중요 필드**:
- `workers` (작업자별 검사 데이터)
- `reliabilityReview` (신뢰성 검토)
- `workerCount` (작업자 수)
- `result` (검사결과)
- `keywordPairs` (불량 패턴)

**표시할 정보**:
- 총 검사 수
- 불량률
- 최근 검사일 및 결과
- 작업자 수 및 검사 완료 현황
- 주요 불량 패턴

## 🎨 UI 설계

### 구조: 3개 섹션으로 분리

```
┌─────────────────────────────────────────────────────────┐
│ 품질이력 요약                                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 수입검사 (3건)                                     │  │
│ │ ────────────────────────────────────────────────  │  │
│ │ 최근: 2025-10-28 | 한도승인                       │  │
│ │ 불량률: 10% (1건)                                 │  │
│ │ 주요불량: 사출→색상(3) 사출→가스(2)              │  │
│ │ 외관이력: [요약 또는 최근 내용]                  │  │
│ │ 기능이력: [요약 또는 최근 내용]                  │  │
│ │ [▼ 상세보기]                                      │  │
│ └───────────────────────────────────────────────────┘  │
│                                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 공정검사 (5건) ⚠️                                 │  │
│ │ ────────────────────────────────────────────────  │  │
│ │ 최근: 2025-11-24 | 불합격                          │  │
│ │ 불량률: 40% (2건)                                 │  │
│ │ 공정이력: 48개중 11개 불량(22%) - 이물, 기름     │  │
│ │ 사전이력: [요약 또는 최근 내용]                  │  │
│ │ 작업라인: 라인1(3건), 라인2(2건)                 │  │
│ │ 주요불량: 사출→기름(5) 증착→이물(4)              │  │
│ │ [▼ 상세보기]                                      │  │
│ └───────────────────────────────────────────────────┘  │
│                                                          │
│ ┌───────────────────────────────────────────────────┐  │
│ │ 출하검사 (2건)                                     │  │
│ │ ────────────────────────────────────────────────  │  │
│ │ 최근: 2025-11-24 | 합격                           │  │
│ │ 불량률: 0% (0건)                                  │  │
│ │ 작업자: 4명 검사 완료                             │  │
│ │ 주요불량: 없음                                     │  │
│ │ [▼ 상세보기]                                      │  │
│ └───────────────────────────────────────────────────┘  │
│                                                          │
│ 전체 불량률: 20% (3/10건) ⚠️                           │
└─────────────────────────────────────────────────────────┘
```

## 📋 각 섹션별 상세 정보

### 수입검사 섹션
- 헤더: "수입검사 (N건)"
- 최근 검사일 및 결과
- 불량률 (불합격 + 한도대기)
- 주요 불량 패턴 (키워드 페어 상위 3개)
- 외관검사이력 요약 (최근 1건 또는 요약)
- 기능검사이력 요약 (최근 1건 또는 요약)
- 확장 시: 날짜별 상세 목록

### 공정검사 섹션
- 헤더: "공정검사 (N건)" + 경고 아이콘 (불량률 높을 때)
- 최근 검사일 및 결과
- 불량률
- **공정검사이력 요약** (가장 중요!)
  - 불량률 추출
  - 불량 유형 추출
- 사전검사이력 요약 (있는 경우)
- 작업라인별 분포
- 주요 불량 패턴
- 확장 시: 날짜별 상세 목록

### 출하검사 섹션
- 헤더: "출하검사 (N건)"
- 최근 검사일 및 결과
- 불량률
- 작업자 수 및 검사 완료 현황
- 주요 불량 패턴
- 확장 시: 날짜별 상세 목록

## 🔍 데이터 추출 로직

### 수입검사
```typescript
interface IncomingInspectionSummary {
  count: number;
  defectCount: number;
  defectRate: number;
  latestDate: string;
  latestResult: string;
  topDefectPatterns: Array<{ process: string; defect: string; count: number }>;
  latestAppearanceHistory?: string; // 최근 외관검사이력
  latestFunctionHistory?: string; // 최근 기능검사이력
}
```

### 공정검사
```typescript
interface InProcessInspectionSummary {
  count: number;
  defectCount: number;
  defectRate: number;
  latestDate: string;
  latestResult: string;
  inProcessHistorySummary?: string; // 공정검사이력 요약 (중요!)
  preInspectionHistorySummary?: string; // 사전검사이력 요약
  workLineDistribution: Record<string, number>; // 작업라인별 분포
  topDefectPatterns: Array<{ process: string; defect: string; count: number }>;
}
```

### 출하검사
```typescript
interface OutgoingInspectionSummary {
  count: number;
  defectCount: number;
  defectRate: number;
  latestDate: string;
  latestResult: string;
  totalWorkers: number; // 총 작업자 수
  completedInspections: number; // 검사 완료 수
  topDefectPatterns: Array<{ process: string; defect: string; count: number }>;
}
```

## 🎨 색상 코딩

- **수입검사**: 파란색 계열
- **공정검사**: 주황색 계열 (불량률 높을 때 경고)
- **출하검사**: 초록색 계열
- **불량률**: 0-5% 초록, 5-10% 노랑, 10-20% 주황, 20%+ 빨강

## 📱 반응형 고려

- 데스크톱: 3개 섹션을 세로로 나열
- 태블릿/모바일: 각 섹션을 카드 형태로 표시, 확장/축소 가능























