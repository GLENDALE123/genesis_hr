/**
 * 보고/승인 관리 관련 타입 정의
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type ReportType = 'expense' | 'reimbursement' | 'advance' | 'report';

export interface ReportRequest {
  id: string;
  workspaceId: string;
  channelId?: string; // 관련 채널 ID (선택사항)
  requestedBy: string; // 요청자 UID
  requestedByName: string; // 요청자 이름
  amount?: number; // 금액 (선택사항)
  currency?: string; // 통화 (기본: KRW)
  type: ReportType; // 보고 유형
  title: string; // 제목
  description?: string; // 설명
  category?: string; // 카테고리
  attachments?: string[]; // 첨부파일 URL 배열
  status: ApprovalStatus; // 상태
  approvedBy?: string; // 승인자 UID
  approvedByName?: string; // 승인자 이름
  approvedAt?: string; // 승인 일시 (ISO string)
  rejectedReason?: string; // 거절 사유
  completedAt?: string; // 완료 일시 (ISO string)
  createdAt: string; // 생성 일시 (ISO string)
  updatedAt: string; // 수정 일시 (ISO string)
}

export interface CreateReportRequestData {
  workspaceId: string;
  channelId?: string;
  amount?: number;
  currency?: string;
  type: ReportType;
  title: string;
  description?: string;
  category?: string;
  attachments?: string[];
}

export interface UpdateReportRequestData {
  status?: ApprovalStatus;
  approvedBy?: string;
  approvedByName?: string;
  rejectedReason?: string;
}


