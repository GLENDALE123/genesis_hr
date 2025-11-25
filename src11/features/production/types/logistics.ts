// 생산 요청 타입 (HS-Jig와 동일)
export enum ProductionRequestType {
  Urgent = '긴급건',
  SalesUrgent = '영업부 긴급요청',
  LogisticsTransfer = '물류이동',
}

// 생산 요청 상태 (HS-Jig와 동일)
export enum ProductionRequestStatus {
  Requested = '요청',
  InProgress = '진행중',
  Hold = '보류',
  Completed = '완료',
  Rejected = '반려',
}

// 물류이동 요청 인터페이스
export interface LogisticsRequest {
  id: string;
  createdAt: string;
  author: {
    uid: string;
    displayName: string;
  };
  status: ProductionRequestStatus;
  history: Array<{
    status: ProductionRequestStatus;
    date: string;
    user: string;
    reason?: string;
  }>;
  requestType: ProductionRequestType;
  requester: string;
  orderNumber: string;
  productName: string;
  partName: string;
  supplier: string;
  quantity: number;
  content: string;
  sourceReportIds: string[];
}

