// 생산일정 관련 타입 정의

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

// 생산일정 V0 타입 (Google 스프레드시트 구조 그대로 저장)
export interface ProductionScheduleV0 {
  id: string;
  headers: string[];          // 헤더 배열 (예: ["계획일자", "진행", "출하", ...])
  rows: Array<{               // 데이터 행들
    rowIndex: number;         // 스프레드시트의 행 번호 (헤더 제외, 2부터 시작)
    data: (string | number)[]; // 해당 행의 데이터 배열
  }>;
  spreadsheetId: string;      // 스프레드시트 ID
  sheetName: string;          // 시트 이름
  syncedAt: string;           // 동기화 시간 (ISO string)
  syncedBy: {                 // 동기화한 사용자
    uid: string;
    displayName: string;
  };
}

// ProductionScheduleV0 행 타입
export type ProductionScheduleV0Row = ProductionScheduleV0['rows'][0];

















