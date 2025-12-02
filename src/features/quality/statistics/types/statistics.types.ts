/**
 * 품질이력 통계 관련 타입 정의
 */

import { InspectionType, InspectionResult, QualityInspection } from '../../types';

// ==================== 기본 통계 ====================

/**
 * 검사 타입별 통계
 */
export interface TypeStatistics {
  incoming: {
    count: number;
    defectCount: number;
    defectRate: number;
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

/**
 * 검사 결과별 통계
 */
export interface ResultStatistics {
  합격: number;
  불합격: number;
  한도대기: number;
  한도승인: number;
  반출: number;
}

// ==================== 차원별 통계 ====================

/**
 * 공급사별 통계
 */
export interface SupplierStatistics {
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
}

/**
 * 제품별 통계
 */
export interface ProductStatistics {
  productName: string;
  partName: string;
  totalCount: number;
  defectCount: number;
  defectRate: number;
  byType: {
    incoming: { count: number; defectRate: number };
    inProcess: { count: number; defectRate: number };
    outgoing: { count: number; defectRate: number };
  };
  suppliers: string[];
}

/**
 * 부품명별 통계
 */
export interface PartStatistics {
  partName: string;
  totalCount: number;
  defectCount: number;
  defectRate: number;
  products: string[];
}

/**
 * 검사자별 통계
 */
export interface InspectorStatistics {
  inspector: string;
  totalCount: number;
  defectCount: number;
  defectRate: number;
  byType: {
    incoming: { count: number; defectRate: number };
    inProcess: { count: number; defectRate: number };
    outgoing: { count: number; defectRate: number };
  };
}

// ==================== 불량 패턴 분석 ====================

/**
 * 키워드 페어 통계
 */
export interface KeywordPairStatistics {
  process: string;
  defect: string;
  frequency: number;
  defectRate: number;
  affectedOrders: string[];
  byType: {
    incoming: number;
    inProcess: number;
    outgoing: number;
  };
}

// ==================== 트렌드 분석 ====================

/**
 * 날짜별 트렌드
 */
export interface DateTrend {
  date: string;
  totalCount: number;
  defectCount: number;
  defectRate: number;
  byType: {
    incoming: number;
    inProcess: number;
    outgoing: number;
  };
}

/**
 * 집계 단위
 */
export type AggregationUnit = 'day' | 'week' | 'month';

// ==================== 타입별 특화 통계 ====================

/**
 * 수입검사 특화 통계
 */
export interface IncomingSpecificStats {
  byConsultationDept: Array<{
    dept: string;
    count: number;
    defectRate: number;
  }>;
  appearanceHistoryAnalysis: {
    hasHistory: number;
    total: number;
  };
  functionHistoryAnalysis: {
    hasHistory: number;
    total: number;
  };
}

/**
 * 공정검사 특화 통계
 */
export interface InProcessSpecificStats {
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
  // 공정검사이력 분석 (중요!)
  inProcessHistoryAnalysis: {
    hasHistory: number;
    total: number;
    averageLength: number;
    defectRateWithHistory: number;
    defectRateWithoutHistory: number;
    commonKeywords: Array<{
      keyword: string;
      frequency: number;
    }>;
  };
}

/**
 * 출하검사 특화 통계
 */
export interface OutgoingSpecificStats {
  byWorker: Array<{
    workerName: string;
    totalInspected: number;
    defectQuantity: number;
    defectRate: number;
  }>;
  reliabilityTestResults: {
    양호: number;
    부분박리: number;
    박리: number;
  };
  colorCheckResults: {
    색상동일: number;
    색상차이: number;
  };
  byWorkLine: Array<{
    workLine: string;
    count: number;
    defectRate: number;
  }>;
}

// ==================== 통합 통계 ====================

/**
 * 품질이력 통계 데이터
 */
export interface QualityHistoryStatistics {
  // 기간 정보
  period: {
    start: string;
    end: string;
  };

  // 기본 통계
  typeStatistics: TypeStatistics;
  resultStatistics: ResultStatistics;

  // 차원별 통계
  bySupplier: SupplierStatistics[];
  byProduct: ProductStatistics[];
  byPart: PartStatistics[];
  byInspector: InspectorStatistics[];

  // 불량 패턴
  keywordPairStatistics: KeywordPairStatistics[];

  // 트렌드
  trends: DateTrend[];

  // 타입별 특화 통계
  incomingSpecific?: IncomingSpecificStats;
  inProcessSpecific?: InProcessSpecificStats;
  outgoingSpecific?: OutgoingSpecificStats;
}

/**
 * 통계 필터 옵션
 */
export interface StatisticsFilterOptions {
  startDate?: string;
  endDate?: string;
  inspectionTypes?: InspectionType[];
  results?: InspectionResult[];
  suppliers?: string[];
  products?: string[];
  partNames?: string[];
}

/**
 * 통계 계산 옵션
 */
export interface StatisticsCalculationOptions {
  includeTypeSpecific?: boolean;
  includeTrends?: boolean;
  trendUnit?: AggregationUnit;
  topN?: number; // 상위 N개만 표시 (공급사, 제품 등)
}

