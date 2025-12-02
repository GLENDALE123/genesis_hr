// 제품관리 관련 타입 정의

import { QualityInspection } from '@/features/quality/types';

// 제품 기본 정보 (중복 제거용 고유 ID 생성)
export interface Product {
  id: string; // supplier+productName+partName+specification 조합
  supplier: string;
  productName: string;
  partName: string;
  specification: string;
  // 최신 정보 (테이블 표시용)
  latestJig?: string; // 최신 사용지그
  latestUndercoatData?: string; // 최신 하도데이터
  latestTopcoatData?: string; // 최신 상도데이터
  averagePersonnelCount?: number; // 평균작업인원
  latestLineRatio?: string; // 최근 비율(스핀들비율)
  averageRPM?: number; // 평균 작업속도(RPM)
}

// 제품 상세 정보
export interface ProductDetail extends Product {
  // 생산이력
  productionHistory: ProductionHistoryItem[];
  // 도료사용이력
  coatingHistory: CoatingHistoryItem[];
  // 생산일보 메모
  memos: MemoItem[];
  // 부족분 진행 이력
  shortageHistory: ShortageHistoryItem[];
  // 품질이슈
  qualityIssues: QualityIssueItem[];
  // 품질이력
  qualityInspections: QualityInspectionItem[];
  // 전체 품질이력 데이터 (공정검사이력 추출용)
  fullQualityInspections?: QualityInspection[];
  // 지그사용이력 (품질이력에서 추출)
  jigHistory: JigHistoryItem[];
  // 생산추이 데이터
  productionTrend: ProductionTrendData[];
}

// 생산이력 항목
export interface ProductionHistoryItem {
  id: string;
  orderNumber: string;
  workDate: string;
  productionLine: string;
  orderQuantity: number;
  inputQuantity?: number;
  goodQuantity?: number;
  defectQuantity?: number;
  status: string;
  personnelCount?: number; // 생산인원
  lineRatio?: string; // 스핀들 비율 (라인 비율)
  startTime?: string; // 시작시간
  endTime?: string; // 종료시간
}

// 도료사용이력 항목
export interface CoatingHistoryItem {
  id: string;
  workDate: string;
  orderNumber: string;
  productionLine?: string; // 생산라인
  coatingType: 'undercoat' | 'topcoat' | 'both'; // 'both'는 하도와 상도가 모두 있을 때
  coatingData: {
    coatingCompany?: string;
    coatingMaterial?: string;
    coatingColor?: string;
    coatingThickness?: string;
    conditions?: string;
    remarks?: string;
    // 하도와 상도가 모두 있을 때
    undercoat?: {
      conditions?: string;
      remarks?: string;
    };
    topcoat?: {
      conditions?: string;
      remarks?: string;
    };
  };
}

// 생산일보 메모 항목
export interface MemoItem {
  id: string;
  workDate: string;
  orderNumber: string;
  memo: string;
  author: {
    uid: string;
    displayName: string;
  };
}

// 부족분 진행 이력 항목
export interface ShortageHistoryItem {
  id: string;
  createdAt: string;
  requestedShortageQuantity: number;
  shortageReason: string;
  status: 'requested' | 'completed';
  orderNumber: string;
}

// 품질이슈 항목
export interface QualityIssueItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  issues: Array<{ content: string }>;
  keywordPairs?: Array<{ process: string; defect: string }>;
}

// 품질이력 항목
export interface QualityInspectionItem {
  id: string;
  orderNumber: string;
  inspectionType: 'incoming' | 'inProcess' | 'outgoing';
  inspectionDate: string;
  result: string;
  keywordPairs?: Array<{ process: string; defect: string }>;
}

// 지그사용이력 항목 (품질이력에서 추출)
export interface JigHistoryItem {
  id: string;
  orderNumber: string;
  inspectionDate: string;
  inspectionType: 'incoming' | 'inProcess' | 'outgoing';
  jigUsed?: string;
  jigUsed1?: string;
  jigUsed2?: string;
  internalJigLower?: string;
  internalJigUpper?: string;
  workLine?: string;
}

// 생산추이 데이터
export interface ProductionTrendData {
  date: string; // YYYY-MM-DD
  uph: number; // 해당 날짜의 평균 시간당생산량 (Units Per Hour)
}

// AI 종합보고서
export interface AIReport {
  id: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  warnings: string[];
  report: string;
  qualityIssues?: Array<{
    orderNumber?: string;
    issue: string;
    action?: string;
    status?: string;
    date?: string;
  }>;
  defectStats?: {
    defectTypes: Array<{ name: string; count: number }>;
    defectRates: Array<{ type: string; rate: number; failed: number; total: number }>;
  };
}

