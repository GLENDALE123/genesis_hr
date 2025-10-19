// 품질이슈 관련 타입 정의

export interface TestResultDetail {
  result: string;
  action?: string;
  decisionMaker?: string;
}

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

export type InspectionType = 'incoming' | 'inProcess' | 'outgoing';
export type InspectionResult = '합격' | '불합격' | '한도대기' | '한도승인' | '반출';
export type WorkerResult = '합격' | '불합격';
export type DefectReason = '선별미흡' | '지문자국' | '취급불량' | '조건불량';

// 작업자별 검사 데이터 (HS-Jig 구조)
export interface WorkerInspectionData {
  name: string;
  totalInspected: number;
  defectQuantity: number;
  result: '합격' | '불합격';
  defectReasons: string[];
  directInputResult: string;
  action: string;
  decisionMaker: string;
}

// 공정 라인 데이터 (HS-Jig 구조)
export interface ProcessLineData {
  workLine?: string;
  lineSpeed?: string;
  lineConditions?: { type: '하도' | '상도'; value: number }[];
  lampUsage?: number[];
}

// 신뢰성 테스트 결과 (HS-Jig 구조)
export interface ReliabilityReview {
  method?: '투명테이프' | '616테이프' | 'AP방식테스트' | '';
  result?: '양호' | '부분박리' | '박리' | '';
  action?: string;
  decisionMaker?: string;
}

// 불량키워드 & 검사결과 페어 타입
export interface DefectResultPair {
  defectKeyword: string;
  inspectionResult: string;
  limitApprovalContent: string;
  limitApprovalDecisionMaker: string;
}

// 기존 호환성을 위한 타입
export interface SimpleDefectResultPair {
  defect: string;
  result: string;
}

// 품질검사 데이터 (수입/공정/출하)
export interface QualityInspection {
  id: string;
  inspectionType: InspectionType;
  orderNumber: string;
  supplier: string;
  productName: string;
  partName: string;
  orderQuantity?: number | string; // HS-Jig 호환 (string 지원)
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
  inspectionDate?: string; // Optional - createdAt으로 대체 가능
  
  // 생성/수정 정보
  createdBy?: string; // 작성자 UID
  updatedBy?: string; // 수정자 UID
  
  // 공정검사 전용
  workLine?: string;
  workerCount?: string; // HS-Jig 호환: string 타입
  preInspectionHistory?: string;
  inProcessInspectionHistory?: string;
  processLines?: ProcessLineData[];
  jigUsed?: string; // HS-Jig 호환: 단일 속성
  jigUsed1?: string; // 공정검사용
  jigUsed2?: string;
  internalJigLower?: string;
  internalJigUpper?: string;
  dryerUsed?: '사용' | '미사용' | '';
  flameTreatment?: '사용' | '미사용' | '';
  
  // 출하검사 전용
  workers?: WorkerInspectionData[];
  reliabilityReview?: ReliabilityReview;
  reliabilityTestResult?: TestResultDetail | string;
  colorCheckResult?: TestResultDetail | string;
  injectionPackaging?: string;
  postProcessPackaging?: string;
  reinspectionKeyword?: string;
  reinspectionContent?: string;
  defectResultPairs?: DefectResultPair[] | SimpleDefectResultPair[]; // 호환성을 위한 추가 속성
  
  // 수입검사 전용
  appearanceHistory?: string;
  functionHistory?: string;
  finalConsultationDept?: string;
  finalConsultationName?: string;
  finalConsultationRank?: string;
  
  // 메타데이터
  createdAt: string;
  updatedAt?: string;
  sequentialId?: number; // Q1, Q2, Q3...
  
  // 품질이슈 관련 필드
  department?: string;
  registrationKeyword?: string;
  issues?: string[];
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
    orderQuantity?: number | string; // HS-Jig 호환
    specification?: string;
    postProcess?: string;
    injectionMaterial?: string;
    injectionColor?: string;
    workLine?: string;
  };
  incoming: QualityInspection[];
  inProcess: QualityInspection[]; // HS-Jig 호환: inProcess 사용
  outgoing: QualityInspection[];
}

// 상수는 constants/index.ts에서 관리
