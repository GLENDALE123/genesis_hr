// 생산관리 유틸리티 함수들

import { ProductionRequestType, ProductionRequestStatus } from '../services/productionRequestService';

// 사용자 관련 유틸리티는 shared에서 가져옴
export { getUserDisplayName } from '@/shared/utils/userUtils';

/**
 * 발주번호 포맷팅 (물류이동일 경우 "외 N건" 형식)
 */
export const formatOrderNumber = (orderNumber: string, requestType: ProductionRequestType): string => {
  if (requestType !== ProductionRequestType.LogisticsTransfer) {
    return orderNumber;
  }

  const orderNumbers = orderNumber.split(',').map(s => s.trim()).filter(Boolean);
  if (orderNumbers.length > 1) {
    return `${orderNumbers[0]} 외 ${orderNumbers.length - 1}건`;
  }
  return orderNumber;
};

/**
 * 상태에 따른 CSS 클래스 반환
 */
export const getStatusColorClass = (status: ProductionRequestStatus): string => {
  const statusMap = {
    [ProductionRequestStatus.Requested]: 'bg-[hsl(var(--status-requested))] text-[hsl(var(--status-requested-foreground))]',
    [ProductionRequestStatus.InProgress]: 'bg-[hsl(var(--status-inprogress))] text-[hsl(var(--status-inprogress-foreground))]',
    [ProductionRequestStatus.Hold]: 'bg-[hsl(var(--status-hold))] text-[hsl(var(--status-hold-foreground))]',
    [ProductionRequestStatus.Completed]: 'bg-[hsl(var(--status-completed))] text-[hsl(var(--status-completed-foreground))]',
    [ProductionRequestStatus.Rejected]: 'bg-[hsl(var(--status-rejected))] text-[hsl(var(--status-rejected-foreground))]',
  };
  return statusMap[status] || '';
};

/**
 * 읽지 않은 댓글 확인
 */
export const hasUnreadComments = (
  comments: Array<{ readBy?: string[] }> | undefined,
  currentUserUid: string | undefined
): boolean => {
  if (!currentUserUid || !comments) return false;
  return comments.some(c => c.readBy && !c.readBy.includes(currentUserUid));
};

