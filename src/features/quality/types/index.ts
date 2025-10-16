// 품질이슈 관련 타입 정의

export interface IssueItem {
  content: string;
  createdAt: string;
  status?: string;
}

export interface QualityIssue {
  id: string;
  department: string;
  registrationKeyword: string;
  orderNumber: string;
  supplier: string;
  productName: string;
  partName: string;
  issues: string[] | IssueItem[]; // 기존 호환성을 위해 union type
  keywordPairs: KeywordPair[];
  imageUrls?: string[];
  createdAt: Date | string;
  author: string | { uid: string; displayName: string; email: string };
  status: 'open' | 'in-progress' | 'resolved' | 'closed' | '미해결' | '진행중' | '해결완료';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface KeywordPair {
  process: string;
  defect: string;
}

export interface QualityIssueFormData {
  department: string;
  registrationKeyword: string;
  orderNumber: string;
  supplier: string;
  productName: string;
  partName: string;
  issues: string[];
  keywordPairs: KeywordPair[];
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
}

export interface QualityIssueCreateData extends Omit<QualityIssueFormData, 'issues' | 'keywordPairs'> {
  issues: string[];
  keywordPairs: KeywordPair[];
}

// === 품질검사 관련 타입 ===

export type InspectionType = 'incoming' | 'in-process' | 'outgoing';
export type InspectionResult = '합격' | '불합격' | '한도대기' | '한도승인' | '반출';
export type WorkerResult = '합격' | '불합격';
export type DefectReason = '선별미흡' | '지문자국' | '취급불량' | '조건불량';

// 작업자별 검사 데이터
export interface WorkerInspectionData {
  name: string;
  result: WorkerResult;
  defectReasons?: DefectReason[];
}

// 공정 라인 데이터
export interface ProcessLineData {
  line: string;
  jigUsed?: string;
  jigUsed2?: string;
  dryerUsed?: string;
  flameTreatment?: string;
  lineSpeed?: string;
  lampUsage?: string;
}

// 신뢰성 테스트 결과
export interface ReliabilityReview {
  method: '투명테이프' | '616테이프' | 'AP방식테스트';
  result: '양호' | '부분박리' | '박리';
  action?: string;
  decisionMaker?: string;
}

// 테스트 결과 상세
export interface TestResultDetail {
  result: string;
  action?: string;
  decisionMaker?: string;
}

// 품질검사 데이터 (수입/공정/출하)
export interface QualityInspection {
  id: string;
  inspectionType: InspectionType;
  orderNumber: string;
  supplier: string;
  productName: string;
  partName: string;
  orderQuantity?: number;
  specification?: string;
  postProcess?: string;
  injectionCompany?: string;
  injectionMaterial?: string;
  injectionColor?: string;
  packagingInfo?: string;
  
  // 검사 결과
  result: InspectionResult;
  resultReason?: string;
  
  // 키워드 페어 (공정-불량)
  keywordPairs?: KeywordPair[];
  
  // 이미지
  imageUrls?: string[];
  
  // 검사자 정보
  inspector: string | { uid: string; displayName: string; email: string };
  inspectionDate: string;
  
  // 공정검사 전용
  workLine?: string;
  workerCount?: number;
  preInspectionHistory?: string;
  inProcessInspectionHistory?: string;
  processLines?: ProcessLineData[];
  
  // 출하검사 전용
  workers?: WorkerInspectionData[];
  reliabilityReview?: ReliabilityReview;
  reliabilityTestResult?: TestResultDetail | string;
  colorCheckResult?: TestResultDetail | string;
  injectionPackaging?: string;
  postProcessPackaging?: string;
  
  // 수입검사 전용
  appearanceHistory?: string;
  functionHistory?: string;
  finalConsultationDept?: string;
  finalConsultationName?: string;
  finalConsultationRank?: string;
  jigUsed?: string;
  jigUsed2?: string;
  internalJigLower?: string;
  internalJigUpper?: string;
  reinspectionKeyword?: string;
  reinspectionContent?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  sequentialId?: number; // Q1, Q2, Q3...
}

// 발주번호별 그룹화된 검사 데이터
export interface GroupedInspectionData {
  orderNumber: string;
  latestDate: string;
  common: {
    sequentialId?: number;
    orderNumber: string;
    supplier: string;
    productName: string;
    partName: string;
    orderQuantity?: number;
    specification?: string;
    postProcess?: string;
    injectionMaterial?: string;
    injectionColor?: string;
    workLine?: string;
  };
  incoming: QualityInspection[];
  inProcess: QualityInspection[];
  outgoing: QualityInspection[];
}

// 상수는 constants/index.ts에서 관리
