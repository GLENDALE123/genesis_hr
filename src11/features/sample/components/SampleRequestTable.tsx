/**
 * 샘플 요청 테이블 컴포넌트 (리스트 뷰용)
 * HS-Jig SampleRequestTable 참고, Shadcn UI Table 사용
 */

'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Image, MessageSquare } from 'lucide-react';
import { SampleRequest } from '../types';
import { SAMPLE_STATUS_COLORS } from '../constants';

interface SampleRequestTableProps {
  requests: SampleRequest[];
  onSelectRequest: (request: SampleRequest) => void;
  currentUserUid?: string;
}

/**
 * 읽지 않은 댓글 확인
 */
const hasUnreadComments = (
  comments: Array<{ readBy?: string[]; uid?: string }> | undefined,
  currentUserUid: string | undefined
): boolean => {
  if (!currentUserUid || !comments) return false;
  
  return comments.some(c => {
    // readBy 배열이 없으면 읽지 않은 것으로 간주
    if (!c.readBy) return true;
    
    // 본인이 작성한 댓글은 읽은 것으로 간주
    if (c.uid === currentUserUid) return false;
    
    // readBy 배열에 currentUserUid가 없으면 읽지 않은 댓글
    return !c.readBy.includes(currentUserUid);
  });
};

const RequestTableRow: React.FC<{
  request: SampleRequest;
  onSelectRequest: (request: SampleRequest) => void;
  currentUserUid?: string;
}> = ({ request, onSelectRequest, currentUserUid }) => {
  const items = request.items || [];
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // 첫 번째 부속명만 표시하고 나머지는 "외 N건"으로 표시
  const partNamesDisplay = items.length > 0
    ? items.length > 1
      ? `${items[0].partName} 외 ${items.length - 1}건`
      : items[0].partName
    : '';
  
  const colorSpecs = items.map(item => item.colorSpec).join(', ');
  const allPostProcessing = Array.from(
    new Set(items.flatMap(item => item.postProcessing || []))
  ).join(', ');
  const allCoatingMethods = Array.from(
    new Set(items.map(item => item.coatingMethod))
  ).join(', ');

  // 댓글 관련
  const unread = hasUnreadComments(request.comments, currentUserUid);
  const commentCount = (request.comments && request.comments.length) || 0;

  return (
    <TableRow
      className="xl:hover:bg-muted/50"
      onClick={() => onSelectRequest(request)}
    >
      {/* 댓글 컬럼 */}
      <TableCell>
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
      <TableCell className="text-xs whitespace-nowrap">{request.requestDate}</TableCell>
      <TableCell className="text-xs whitespace-nowrap">{request.dueDate}</TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge className={SAMPLE_STATUS_COLORS[request.status]}>
          {request.status}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap">{request.requesterName}</TableCell>
      <TableCell className="whitespace-nowrap">{request.contact}</TableCell>
      <TableCell className="whitespace-nowrap">{request.clientName}</TableCell>
      <TableCell className="font-medium whitespace-nowrap">{request.productName}</TableCell>
      <TableCell className="whitespace-nowrap">{partNamesDisplay}</TableCell>
      <TableCell>
        {request.imageUrls && request.imageUrls.length > 0 ? (
          <div className="flex items-center gap-1 text-primary">
            <Image className="w-4 h-4" />
            <span className="text-xs">{request.imageUrls.length}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">없음</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">{allCoatingMethods}</TableCell>
      <TableCell className="whitespace-nowrap">{colorSpecs}</TableCell>
      <TableCell className="text-right whitespace-nowrap">
        {totalQuantity.toLocaleString()}
      </TableCell>
      <TableCell className="whitespace-nowrap">{allPostProcessing}</TableCell>
      <TableCell className="text-xs max-w-xs whitespace-nowrap overflow-hidden text-ellipsis" title={request.remarks}>
        {request.remarks}
      </TableCell>
    </TableRow>
  );
};

export const SampleRequestTable: React.FC<SampleRequestTableProps> = ({
  requests,
  onSelectRequest,
  currentUserUid
}) => {
  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="overflow-auto flex-1">
        <Table className="min-w-max">
          <TableHeader className="sticky top-0 z-10 bg-background border-b">
            <TableRow className="border-b">
              <TableHead className="whitespace-nowrap bg-background rounded-tl-lg"></TableHead>
              <TableHead className="whitespace-nowrap bg-background">요청일</TableHead>
              <TableHead className="whitespace-nowrap bg-background">납기요청일</TableHead>
              <TableHead className="whitespace-nowrap bg-background">상태</TableHead>
              <TableHead className="whitespace-nowrap bg-background">요청담당자</TableHead>
              <TableHead className="whitespace-nowrap bg-background">연락처</TableHead>
              <TableHead className="whitespace-nowrap bg-background">고객사명</TableHead>
              <TableHead className="whitespace-nowrap bg-background">제품명</TableHead>
              <TableHead className="whitespace-nowrap bg-background">부속명</TableHead>
              <TableHead className="whitespace-nowrap bg-background">이미지</TableHead>
              <TableHead className="whitespace-nowrap bg-background">코팅/증착방식</TableHead>
              <TableHead className="whitespace-nowrap bg-background">색상(사양)</TableHead>
              <TableHead className="whitespace-nowrap bg-background">요청수량</TableHead>
              <TableHead className="whitespace-nowrap bg-background">후가공</TableHead>
              <TableHead className="whitespace-nowrap bg-background rounded-tr-lg">비고</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests || []).map(request => (
              <RequestTableRow
                key={request.id}
                request={request}
                onSelectRequest={onSelectRequest}
                currentUserUid={currentUserUid}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

