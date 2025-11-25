'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { JigMasterItem, UserProfile } from '../types';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Image } from 'lucide-react';

interface JigMasterListViewProps {
  jigs: JigMasterItem[];
  onSelectJig: (jig: JigMasterItem) => void;
  currentUserProfile: UserProfile | null;
  onOpenFormModal?: () => void;
  totalCount?: number;
}

// 메모이제이션된 테이블 행 컴포넌트 - 성능 최적화
const JigMasterTableRow = memo<{
  item: JigMasterItem;
  onSelectJig: (jig: JigMasterItem) => void;
}>(({ item, onSelectJig }) => {
  // 클릭 핸들러를 메모이제이션 (item.id만 의존성으로 사용)
  const handleRowClick = useCallback(() => {
    onSelectJig(item);
  }, [item.id, onSelectJig]); // item 전체 대신 id만 의존성으로 사용

  // 날짜 포맷팅을 메모이제이션
  const formattedDate = useMemo(() => {
    return new Date(item.createdAt).toLocaleDateString('ko-KR');
  }, [item.createdAt]);

  // 이미지 개수를 메모이제이션
  const imageCount = useMemo(() => {
    return item.imageUrls?.length || 0;
  }, [item.imageUrls]);

  // 작성자 이름을 메모이제이션
  const creatorName = useMemo(() => {
    return (item.createdBy && item.createdBy.displayName) || 'N/A';
  }, [item.createdBy?.displayName]);

  // 필드 매핑 헬퍼 함수들
  const getProductName = useMemo(() => {
    return item.productName || item.itemName || '-';
  }, [item.productName, item.itemName]);

  const getJigNumber = useMemo(() => {
    return item.jigNumber || item.itemNumber || '-';
  }, [item.jigNumber, item.itemNumber]);

  const getSupplier = useMemo(() => {
    return item.supplier || '-';
  }, [item.supplier]);

  const getOrderNumber = useMemo(() => {
    return item.orderNumber || '-';
  }, [item.orderNumber]);

  return (
    <TableRow 
      className="xl:hover:bg-muted/50"
      onClick={handleRowClick}
    >
      <TableCell className="whitespace-nowrap">{formattedDate}</TableCell>
      <TableCell className="whitespace-nowrap">{item.requestType}</TableCell>
      <TableCell className="whitespace-nowrap">{getOrderNumber}</TableCell>
      <TableCell className="whitespace-nowrap">{getSupplier}</TableCell>
      <TableCell className="whitespace-nowrap font-semibold">{getProductName}</TableCell>
      <TableCell className="whitespace-nowrap">{item.partName}</TableCell>
      <TableCell className="whitespace-nowrap font-mono">{getJigNumber}</TableCell>
      <TableCell className="whitespace-nowrap">
        {imageCount > 0 ? (
          <div className="flex items-center gap-1 text-primary">
            <Image className="w-4 h-4" />
            <span className="text-xs">{imageCount}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">없음</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap truncate max-w-sm" title={item.remarks}>
        {item.remarks || '-'}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {creatorName}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수로 불필요한 리렌더링 방지
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.productName === nextProps.item.productName &&
    prevProps.item.itemName === nextProps.item.itemName &&
    prevProps.item.partName === nextProps.item.partName &&
    prevProps.item.jigNumber === nextProps.item.jigNumber &&
    prevProps.item.itemNumber === nextProps.item.itemNumber &&
    prevProps.item.orderNumber === nextProps.item.orderNumber &&
    prevProps.item.supplier === nextProps.item.supplier &&
    prevProps.item.requestType === nextProps.item.requestType &&
    prevProps.item.remarks === nextProps.item.remarks &&
    prevProps.item.createdAt === nextProps.item.createdAt &&
    prevProps.item.imageUrls?.length === nextProps.item.imageUrls?.length &&
    prevProps.item.createdBy?.displayName === nextProps.item.createdBy?.displayName &&
    prevProps.onSelectJig === nextProps.onSelectJig
  );
});

JigMasterTableRow.displayName = 'JigMasterTableRow';

export const JigMasterListView: React.FC<JigMasterListViewProps> = ({ 
  jigs, 
  onSelectJig, 
  currentUserProfile, 
  onOpenFormModal,
  totalCount 
}) => {
  const masterItems = jigs;

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="h-full overflow-auto">
          <Table className="w-full min-w-[1400px]">
            <TableHeader className="sticky top-0 z-10 bg-background border-b">
              <TableRow className="border-b">
                <TableHead className="whitespace-nowrap bg-background rounded-tl-lg">입력일자</TableHead>
                <TableHead className="whitespace-nowrap bg-background">생산구분</TableHead>
                <TableHead className="whitespace-nowrap bg-background">발주번호</TableHead>
                <TableHead className="whitespace-nowrap bg-background">발주처</TableHead>
                <TableHead className="whitespace-nowrap bg-background">제품명</TableHead>
                <TableHead className="whitespace-nowrap bg-background">부속명</TableHead>
                <TableHead className="whitespace-nowrap bg-background">지그번호</TableHead>
                <TableHead className="whitespace-nowrap bg-background">이미지</TableHead>
                <TableHead className="whitespace-nowrap bg-background">특이사항</TableHead>
                <TableHead className="whitespace-nowrap bg-background rounded-tr-lg">입력자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    등록된 지그가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                masterItems.map((item) => (
                  <JigMasterTableRow
                    key={item.id}
                    item={item}
                    onSelectJig={onSelectJig}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};