/**
 * 부족분 신청 관련 타입 정의
 */

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
  orderQuantities?: number[];
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















