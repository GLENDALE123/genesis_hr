// 물류 이동 요청 관련 타입 정의 (packaging 서브모듈 전용)

import {
  ProductionRequestType,
  ProductionRequestStatus,
} from '@/features/production/requests';

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

