// 생산일보 관련 타입 정의

export * from './logistics';

export interface PackagedBox {
  boxNumber: string;
  type: '정상' | 'B급' | '구분출하' | '';
  quantity: number;
  reason?: string;
}

// 생산일보 작업 상태
export enum ProductionStatus {
  Pending = '대기',
  InProgress = '작업중',
  Completed = '생산완료',
}

// 폼에서 사용하는 PackagedBox (quantity가 string)
export interface PackagedBoxFormData {
  boxNumber: string;
  type: '정상' | 'B급' | '구분출하' | '';
  quantity: string;
  reason: string;
}

export interface ProcessCoat {
  conditions: string;
  remarks: string;
}

export interface PackagingReport {
  id: string;
  createdAt: string;
  workDate: string;
  author: {
    uid: string;
    displayName: string;
  };
  productionLine: string;
  orderNumbers: string[];
  supplier: string;
  productName: string;
  partName: string;
  orderQuantity?: number;
  specification: string;
  lineRatio: string;
  productionPerMinute?: number;
  uph?: number;
  inputQuantity?: number;
  goodQuantity?: number;
  defectQuantity?: number;
  personnelCount?: number;
  startTime: string;
  endTime: string;
  packagingUnit?: number;
  boxCount?: number;
  remainder?: number;
  packagedBoxes: PackagedBox[];
  processConditions?: {
    undercoat?: ProcessCoat;
    midcoat?: ProcessCoat;
    topcoat?: ProcessCoat;
  };
  memo?: string;
  imageUrls?: string[];
  status?: ProductionStatus; // 작업 상태 추가
}

// 엑셀에서 업로드된 생산일보 데이터 구조
export interface ExcelProductionReport {
  id: string;
  createdAt: string;
  workDate: string;
  author: {
    uid: string;
    displayName: string;
  };
  // 엑셀 컬럼 매핑
  month: string;           // 월
  day: string;             // 일
  line: string;            // 라인
  orderNumber: string;     // 발주번호
  supplier: string;        // 발주처
  productName: string;     // 제품명
  partName: string;        // 부속명
  orderQuantity: number;   // 발주수량
  specification: string;   // 사양
  inputQuantity: number;   // 투입
  goodQuantity: number;    // 양품
  defectQuantity: number;  // 불량
  personnelCount: number;  // 인원
  ratio: string;           // 비율
  productionPerHour: number; // 시간당생산량
  startTime: string;       // 시작
  endTime: string;         // 종료
  undercoatData: string;   // 하도데이터
  topcoatData: string;     // 상도데이터
  operatingTime: number;   // 가동시간
  downtime: number;        // 비가동시간
  unitPrice: number;       // 단가
  productionAmount: number; // 생산금액
  category: string;        // 구분
  // 추가 필드들
  isFromExcel?: boolean;   // 엑셀에서 업로드된 데이터인지 구분
  excelFileName?: string;  // 원본 엑셀 파일명
  excelRowIndex?: number;  // 엑셀에서의 행 번호
}

// 생산일보 폼 데이터 타입
export interface PackagingFormData {
  workDate: string;
  authorName: string;
  productionLine: string;
  orderNumbers: string[];
  supplier: string;
  productName: string;
  partName: string;
  orderQuantity: string;
  specification: string;
  lineRatio: string;
  productionPerMinute: string;
  uph: string;
  inputQuantity: string;
  goodQuantity: string;
  defectQuantity: string;
  yieldRate: string;
  defectRate: string;
  personnelCount: string;
  startTime: string;
  endTime: string;
  packagingUnit: string;
  boxCount: string;
  remainder: string;
  packagedBoxes: PackagedBoxFormData[];
  memo: string;
}

// 생산일보 검색/필터 옵션
export interface ProductionReportFilter {
  startDate?: string;
  endDate?: string;
  productionLine?: string;
  supplier?: string;
  productName?: string;
  authorId?: string;
  status?: string;
}

// 생산일보 통계 데이터
export interface ProductionReportStatsData {
  totalReports: number;
  totalInputQuantity: number;
  totalGoodQuantity: number;
  totalDefectQuantity: number;
  averageYieldRate: number;
  averageDefectRate: number;
  topProductionLines: Array<{
    line: string;
    count: number;
    totalQuantity: number;
  }>;
  topSuppliers: Array<{
    supplier: string;
    count: number;
    totalQuantity: number;
  }>;
}

// 부족분 신청 타입
export interface ShortageRequest {
  id: string;
  createdAt: string;
  author: {
    uid: string;
    displayName: string;
  };
  sourceReportId: string; // 원본 PackagingReport ID
  // 생산일보에서 가져온 정보
  productionLine: string;
  orderNumbers: string[];
  supplier: string;
  productName: string;
  partName: string;
  specification: string;
  orderQuantity?: number;
  inputQuantity?: number;
  goodQuantity?: number;
  defectQuantity?: number;
  // 부족분 신청 정보
  shortageReason: string;
  requestedShortageQuantity: number;
  status: 'requested' | 'completed';
  history?: Array<{
    status: string;
    date: string;
    user: string;
    reason: string;
  }>;
  comments?: Array<{
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: string;
  }>;
}

// 생산일정 타입 (HS-Jig 호환)
export interface ProductionSchedule {
  id: string;
  planDate: string;          // 계획일자 (YYYY-MM-DD)
  progress?: string;          // 진행
  shipping?: string;          // 출하
  line?: string;              // 라인
  productionLine?: string;    // 생산라인 (알림용)
  injection?: string;         // 사출
  orderNumber?: string;       // 발주번호
  client: string;             // 발주처
  productName: string;        // 제품명
  partName: string;           // 부속명
  orderQuantity: number;      // 발주
  specification?: string;     // 사양
  postProcess?: string;       // 후공정
  remarks: string;            // 참고
  manager?: string;           // 담당자
  domesticOrExport?: string;  // 내/수
  jigUsed?: string;           // 사용지그
  newOrRe?: string;           // 신/재
  shortageQuantity: number;   // 부족수량
  createdAt: string;
  updatedAt: string;
  orderIndex?: number;        // 정렬 순서
}
