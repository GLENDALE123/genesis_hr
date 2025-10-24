'use client';

import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { JigMasterItem, UserProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Image, Plus, Search } from 'lucide-react';

interface JigMasterListViewProps {
  jigs: JigMasterItem[];
  onSelectJig: (jig: JigMasterItem) => void;
  currentUserProfile: UserProfile | null;
  onOpenFormModal?: () => void;
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

  return (
    <TableRow 
      className="hover:bg-muted/50"
      onClick={handleRowClick}
    >
      <TableCell className="whitespace-nowrap">{item.requestType}</TableCell>
      <TableCell className="whitespace-nowrap font-semibold">{item.itemName}</TableCell>
      <TableCell className="whitespace-nowrap">{item.partName}</TableCell>
      <TableCell className="whitespace-nowrap font-mono">{item.itemNumber}</TableCell>
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
      <TableCell className="whitespace-nowrap">{formattedDate}</TableCell>
      <TableCell className="whitespace-nowrap">
        {creatorName}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수로 불필요한 리렌더링 방지
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.itemName === nextProps.item.itemName &&
    prevProps.item.partName === nextProps.item.partName &&
    prevProps.item.itemNumber === nextProps.item.itemNumber &&
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
  onOpenFormModal 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // 검색어 디바운싱 (300ms 지연)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 필터링 로직 최적화 - 검색어가 없으면 원본 배열 반환
  const filteredJigs = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return jigs;
    
    const search = debouncedSearchTerm.toLowerCase().trim();
    
    // 검색어가 너무 짧으면 필터링하지 않음 (성능 최적화)
    if (search.length < 2) return jigs;
    
    return jigs.filter(jig => {
      // 각 필드를 미리 소문자로 변환하여 캐시
      const itemName = jig.itemName.toLowerCase();
      const partName = jig.partName.toLowerCase();
      const itemNumber = jig.itemNumber.toLowerCase();
      const requestType = jig.requestType.toLowerCase();
      const remarks = jig.remarks?.toLowerCase() || '';
      
      return itemName.includes(search) ||
             partName.includes(search) ||
             itemNumber.includes(search) ||
             requestType.includes(search) ||
             remarks.includes(search);
    });
  }, [jigs, debouncedSearchTerm]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // 불필요한 변수 제거
  const masterItems = filteredJigs;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-6">
        <div className="flex items-center justify-between">
          <CardTitle>지그 목록표</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="지그 검색..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            {onOpenFormModal && (
              <Button 
                className="flex items-center gap-2"
                onClick={onOpenFormModal}
              >
                <Plus className="h-4 w-4" />
                새 지그 등록
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="h-full overflow-auto">
          <Table className="w-full min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">생산구분</TableHead>
                <TableHead className="whitespace-nowrap">제품명</TableHead>
                <TableHead className="whitespace-nowrap">부속명</TableHead>
                <TableHead className="whitespace-nowrap">지그번호</TableHead>
                <TableHead className="whitespace-nowrap">이미지</TableHead>
                <TableHead className="whitespace-nowrap">특이사항</TableHead>
                <TableHead className="whitespace-nowrap">입력일자</TableHead>
                <TableHead className="whitespace-nowrap">입력자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    {searchTerm !== debouncedSearchTerm ? '검색 중...' : 
                     debouncedSearchTerm ? '검색된 지그가 없습니다.' : '등록된 지그가 없습니다.'}
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