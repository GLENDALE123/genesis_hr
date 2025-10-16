'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { GroupedInspectionData } from '../types';
import { InspectionStatusBadge } from './InspectionStatusBadge';
import { Image } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface QualityInspectionTableProps {
  groupedData: GroupedInspectionData[];
  isLoading: boolean;
  onSelectGroup: (group: GroupedInspectionData) => void;
}

/**
 * 품질검사 테이블 컴포넌트
 * - 발주번호별로 그룹화된 검사 데이터 표시
 * - 수입/공정/출하 검사 상태를 한눈에 확인
 */
export const QualityInspectionTable: React.FC<QualityInspectionTableProps> = ({
  groupedData,
  isLoading,
  onSelectGroup
}) => {
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 수량 포맷팅
  const formatQuantity = (quantity?: number) => {
    if (!quantity) return '';
    return `${quantity.toLocaleString('ko-KR')} ea`;
  };

  // 이미지 개수 계산
  const getTotalImageCount = (group: GroupedInspectionData) => {
    const incomingImages = group.incoming.reduce(
      (total, inspection) => total + (inspection.imageUrls?.length || 0),
      0
    );
    const inProcessImages = group.inProcess.reduce(
      (total, inspection) => total + (inspection.imageUrls?.length || 0),
      0
    );
    const outgoingImages = group.outgoing.reduce(
      (total, inspection) => total + (inspection.imageUrls?.length || 0),
      0
    );
    
    return incomingImages + inProcessImages + outgoingImages;
  };

  if (isLoading) {
    return (
      <Card className="flex-1 min-h-0">
        <CardContent className="flex justify-center items-center h-full p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 min-h-0 flex flex-col">
      <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
        {/* 테이블 영역 */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead className="whitespace-nowrap">아이디</TableHead>
                <TableHead className="whitespace-nowrap">최근업데이트</TableHead>
                <TableHead className="whitespace-nowrap">발주번호</TableHead>
                <TableHead className="whitespace-nowrap">발주처</TableHead>
                <TableHead className="whitespace-nowrap">제품명</TableHead>
                <TableHead className="whitespace-nowrap">부속명</TableHead>
                <TableHead className="whitespace-nowrap text-center">이미지</TableHead>
                <TableHead className="whitespace-nowrap">사출원료</TableHead>
                <TableHead className="whitespace-nowrap">사출색상</TableHead>
                <TableHead className="whitespace-nowrap text-right">발주수량</TableHead>
                <TableHead className="whitespace-nowrap">사양</TableHead>
                <TableHead className="whitespace-nowrap">후공정</TableHead>
                <TableHead className="whitespace-nowrap">작업라인</TableHead>
                <TableHead className="whitespace-nowrap text-center">수입</TableHead>
                <TableHead className="whitespace-nowrap text-center">공정</TableHead>
                <TableHead className="whitespace-nowrap text-center">출하</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.map((group) => {
                const totalImages = getTotalImageCount(group);
                
                return (
                  <TableRow
                    key={group.orderNumber}
                    onClick={() => onSelectGroup(group)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      Q{group.common?.sequentialId || 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDate(group.latestDate)}
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {group.common?.orderNumber}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {group.common?.supplier}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {group.common?.productName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {group.common?.partName}
                    </TableCell>
                    <TableCell className="text-center">
                      {totalImages > 0 ? (
                        <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                          <Image className="h-4 w-4" />
                          <span className="text-xs">{totalImages}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">없음</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {group.common?.injectionMaterial || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {group.common?.injectionColor || '-'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs">
                      {formatQuantity(group.common?.orderQuantity)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {group.common?.specification || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {group.common?.postProcess || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {group.common?.workLine || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <InspectionStatusBadge inspections={group.incoming} />
                    </TableCell>
                    <TableCell className="text-center">
                      <InspectionStatusBadge inspections={group.inProcess} />
                    </TableCell>
                    <TableCell className="text-center">
                      <InspectionStatusBadge inspections={group.outgoing} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* 데이터 없음 메시지 */}
          {groupedData.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="text-muted-foreground mb-2">
                <Image className="h-12 w-12 mx-auto opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground">
                조건에 맞는 검사 데이터가 없습니다
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                필터를 조정하거나 검색어를 변경해보세요
              </p>
            </div>
          )}
        </div>

        {/* 푸터 - 총 개수 표시 */}
        {groupedData.length > 0 && (
          <div className="flex-shrink-0 p-3 border-t bg-muted/50">
            <p className="text-sm text-muted-foreground text-center">
              총 <span className="font-semibold text-foreground">{groupedData.length}</span>개의 항목이 표시됩니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

