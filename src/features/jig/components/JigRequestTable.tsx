'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowUpDown, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { JigRequest, JigStatus } from '../types';
import { STATUS_COLORS } from '../constants';

interface JigRequestTableProps {
  requests: JigRequest[];
  onSelectRequest: (request: JigRequest) => void;
  currentUserUid?: string;
}

type SortField = keyof JigRequest;
type SortDirection = 'asc' | 'desc';

/**
 * 읽지 않은 댓글 표시 컴포넌트 (메모이제이션 적용)
 */
const UnreadIndicator: React.FC<{
  comments: Array<{ readBy?: string[]; uid?: string }> | undefined;
  currentUserUid: string | undefined;
}> = memo(({ comments, currentUserUid }) => {
  const unread = hasUnreadComments(comments, currentUserUid);
  
  return unread ? (
    <span 
      title="새로운 댓글" 
      className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"
    />
  ) : (
    <span className="w-2.5 h-2.5" />
  );
}, (prevProps, nextProps) => {
  // 파란색 점만의 메모이제이션 비교 함수
  return (
    prevProps.currentUserUid === nextProps.currentUserUid &&
    prevProps.comments?.length === nextProps.comments?.length &&
    JSON.stringify(prevProps.comments?.map(c => ({ uid: c.uid, readBy: c.readBy }))) === 
    JSON.stringify(nextProps.comments?.map(c => ({ uid: c.uid, readBy: c.readBy })))
  );
});

UnreadIndicator.displayName = 'UnreadIndicator';

/**
 * 읽지 않은 댓글 확인
 */
const hasUnreadComments = (
  comments: Array<{ readBy?: string[]; uid?: string }> | undefined,
  currentUserUid: string | undefined
): boolean => {
  if (!currentUserUid || !comments) return false;
  
  return comments.some(c => {
    if (!c.readBy) return true; // readBy 배열이 없으면 읽지 않은 것으로 간주
    if (c.uid === currentUserUid) return false; // 본인이 작성한 댓글은 읽은 것으로 간주
    return !c.readBy.includes(currentUserUid); // readBy 배열에 currentUserUid가 없으면 읽지 않은 댓글
  });
};

const RequestTableRow: React.FC<{
  request: JigRequest;
  onSelectRequest: (request: JigRequest) => void;
  currentUserUid?: string;
}> = ({ request, onSelectRequest, currentUserUid }) => {
  const unread = hasUnreadComments(request.comments, currentUserUid);
  const commentCount = (request.comments && request.comments.length) || 0;

  const handleRowClick = useCallback(() => {
    onSelectRequest(request);
  }, [request.id, onSelectRequest]);

  return (
    <TableRow
      className="cursor-pointer"
      onClick={handleRowClick}
    >
      {/* 댓글 컬럼 */}
      <TableCell className="px-2">
        <div className="flex items-center gap-2">
          {unread ? (
            <span 
              title="새로운 댓글" 
              className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"
            />
          ) : (
            <span className="w-2.5 h-2.5" />
          )}
          {commentCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {commentCount}
              </span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {new Date(request.requestDate).toLocaleDateString('ko-KR')}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">{request.deliveryDate}</TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge className={STATUS_COLORS[request.status]}>
          {request.status}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap">{request.requester}</TableCell>
      <TableCell className="whitespace-nowrap">{request.destination}</TableCell>
      <TableCell className="text-xs whitespace-nowrap">{request.requestType}</TableCell>
      <TableCell className="font-medium whitespace-nowrap">{request.itemName}</TableCell>
      <TableCell className="whitespace-nowrap">{request.partName}</TableCell>
      <TableCell className="whitespace-nowrap">{request.itemNumber}</TableCell>
      <TableCell className="w-14">
        {request.imageUrls && request.imageUrls.length > 0 ? (
          <div className="flex items-center gap-1 text-primary">
            <ImageIcon className="w-4 h-4" />
            <span className="text-xs">{request.imageUrls.length}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">없음</span>
        )}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {request.receivedQuantity.toLocaleString()}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">{request.quantity.toLocaleString()}</TableCell>
    </TableRow>
  );
};

RequestTableRow.displayName = 'RequestTableRow';

export const JigRequestTable: React.FC<JigRequestTableProps> = ({
  requests,
  onSelectRequest,
  currentUserUid,
}) => {
  const [sortField, setSortField] = useState<SortField>('requestDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [requests, sortField, sortDirection]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const SortableHeader = useCallback(({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="whitespace-nowrap text-primary-foreground">
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-primary-foreground/80"
      >
        {children}
        <ArrowUpDown className="h-4 w-4" />
      </button>
    </TableHead>
  ), [handleSort]);

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <Table className="min-w-max">
          <TableHeader className="sticky top-0 z-10 bg-primary">
            <TableRow className="hover:bg-primary">
              <TableHead className="whitespace-nowrap text-primary-foreground px-2"></TableHead>
              <SortableHeader field="requestDate">요청일자</SortableHeader>
              <SortableHeader field="deliveryDate">납기일</SortableHeader>
              <SortableHeader field="status">상태</SortableHeader>
              <SortableHeader field="requester">요청자</SortableHeader>
              <SortableHeader field="destination">수신처</SortableHeader>
              <SortableHeader field="requestType">생산구분</SortableHeader>
              <SortableHeader field="itemName">제품명</SortableHeader>
              <SortableHeader field="partName">부속명</SortableHeader>
              <SortableHeader field="itemNumber">지그번호</SortableHeader>
              <TableHead className="whitespace-nowrap text-primary-foreground w-16">이미지</TableHead>
              <SortableHeader field="receivedQuantity">완료수량</SortableHeader>
              <SortableHeader field="quantity">발주수량</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-10 text-muted-foreground">
                  요청이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              sortedRequests.map((request) => (
                <RequestTableRow
                  key={request.id}
                  request={request}
                  onSelectRequest={onSelectRequest}
                  currentUserUid={currentUserUid}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
