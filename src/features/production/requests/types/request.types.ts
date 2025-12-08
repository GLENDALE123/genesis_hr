/**
 * 생산 요청 관련 타입 정의
 */

export enum ProductionRequestType {
  Urgent = '긴급건',
  SalesUrgent = '영업부 긴급요청',
  LogisticsTransfer = '물류이동',
}

export enum ProductionRequestStatus {
  Requested = '요청',
  InProgress = '진행중',
  Hold = '보류',
  Completed = '완료',
  Rejected = '반려',
}

export interface ProductionRequest {
  id: string;
  createdAt: string;
  author: {
    uid: string;
    displayName: string;
    avatar?: string;
  };
  requester: string;
  requestType: ProductionRequestType;
  status: ProductionRequestStatus;
  orderNumber: string;
  productName: string;
  partName: string;
  supplier: string;
  quantity: number;
  content: string;
  history: Array<{
    status: ProductionRequestStatus;
    date: string;
    user: string;
    reason?: string;
  }>;
  comments?: Array<{
    id: string;
    timestamp: string;
    user: string;
    text: string;
    uid: string;
    readBy?: string[];
  }>;
  imageUrls?: string[];
  sourceReportIds?: string[];
}















