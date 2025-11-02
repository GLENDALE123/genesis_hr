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
import { ShortageRequest } from '@/features/production/types';

interface ShortageRequestTableProps {
  requests: ShortageRequest[];
  onSelectRequest: (request: ShortageRequest) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\.$/, '');
};

export const ShortageRequestTable: React.FC<ShortageRequestTableProps> = ({
  requests,
  onSelectRequest
}) => {
  return (
    <div className="bg-card rounded-lg shadow-md h-full flex flex-col min-w-0">
      <div className="overflow-x-auto overflow-y-auto flex-1 min-w-0">
        <Table className="w-full min-w-[1200px]">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="whitespace-nowrap rounded-tl-lg">요청일</TableHead>
              <TableHead className="whitespace-nowrap">상태</TableHead>
              <TableHead className="whitespace-nowrap">요청자</TableHead>
              <TableHead className="whitespace-nowrap">생산라인</TableHead>
              <TableHead className="whitespace-nowrap">발주번호</TableHead>
              <TableHead className="whitespace-nowrap">발주처</TableHead>
              <TableHead className="whitespace-nowrap">제품명/부속명</TableHead>
              <TableHead className="whitespace-nowrap">부족분 사유</TableHead>
              <TableHead className="whitespace-nowrap text-right rounded-tr-lg">요청수량</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const isCompleted = request.status === 'completed';
              return (
                <TableRow
                  key={request.id}
                  onClick={() => onSelectRequest(request)}
                  className="cursor-pointer xl:hover:bg-muted/50"
                >
                  <TableCell className="whitespace-nowrap">
                    {formatDate(request.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant={isCompleted ? 'default' : 'secondary'}
                      className={isCompleted 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                      }
                    >
                      {isCompleted ? '완료' : '요청'}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{request.author.displayName}</TableCell>
                  <TableCell className="whitespace-nowrap">{request.productionLine}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {request.orderNumbers.join(', ')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{request.supplier}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {request.productName} / {request.partName}
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={request.shortageReason}>
                    {request.shortageReason}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold text-red-600 dark:text-red-400">
                    {request.requestedShortageQuantity.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};


