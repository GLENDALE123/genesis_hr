// 생산일보 관련 타입 정의

export interface PackagedBox {
  boxNumber: string;
  type: '정상' | 'B급' | '구분출하' | '';
  quantity: number;
  reason?: string;
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
  packagedBoxes: PackagedBox[];
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
export interface ProductionReportStats {
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
