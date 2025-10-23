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

// 메모이제이션된 테이블 행 컴포넌트
const JigMasterTableRow = memo<{
  item: JigMasterItem;
  onSelectJig: (jig: JigMasterItem) => void;
}>(({ item, onSelectJig }) => {
  const handleRowClick = useCallback(() => {
    onSelectJig(item);
  }, [item, onSelectJig]);

  // 날짜 포맷팅을 메모이제이션
  const formattedDate = useMemo(() => {
    return new Date(item.createdAt).toLocaleDateString('ko-KR');
  }, [item.createdAt]);

  // 이미지 개수를 메모이제이션
  const imageCount = useMemo(() => {
    return item.imageUrls?.length || 0;
  }, [item.imageUrls]);

  return (
    <TableRow 
      className="border-b cursor-pointer hover:bg-muted/50"
      onClick={handleRowClick}
    >
      <TableCell className="px-2 py-3 whitespace-nowrap">{item.requestType}</TableCell>
      <TableCell className="px-2 py-3 whitespace-nowrap font-semibold">{item.itemName}</TableCell>
      <TableCell className="px-2 py-3 whitespace-nowrap">{item.partName}</TableCell>
      <TableCell className="px-2 py-3 whitespace-nowrap font-mono">{item.itemNumber}</TableCell>
      <TableCell className="px-2 py-3 whitespace-nowrap">
        {imageCount > 0 ? (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Image className="w-4 h-4" />
            <span className="text-xs">{imageCount}</span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-slate-500 text-xs">없음</span>
        )}
      </TableCell>
      <TableCell className="px-2 py-3 whitespace-nowrap truncate max-w-sm" title={item.remarks}>
        {item.remarks || '-'}
      </TableCell>
      <TableCell className="px-2 py-3 whitespace-nowrap">{formattedDate}</TableCell>
      <TableCell className="px-2 py-3 whitespace-nowrap">
        {(item.createdBy && item.createdBy.displayName) || 'N/A'}
      </TableCell>
    </TableRow>
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

  const filteredJigs = useMemo(() => {
    if (!debouncedSearchTerm) return jigs;
    
    const search = debouncedSearchTerm.toLowerCase();
    return jigs.filter(jig =>
      jig.itemName.toLowerCase().includes(search) ||
      jig.partName.toLowerCase().includes(search) ||
      jig.itemNumber.toLowerCase().includes(search) ||
      jig.requestType.toLowerCase().includes(search) ||
      (jig.remarks && jig.remarks.toLowerCase().includes(search))
    );
  }, [jigs, debouncedSearchTerm]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const masterItems = filteredJigs;

  const onSelectItem = onSelectJig;

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
          <Table className="w-full text-sm text-left text-gray-500 dark:text-slate-400 min-w-[1200px]">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="border-b bg-background">
                <TableHead className="px-2 py-3 whitespace-nowrap bg-background rounded-tl-lg">생산구분</TableHead>
                <TableHead className="px-2 py-3 whitespace-nowrap bg-background">제품명</TableHead>
                <TableHead className="px-2 py-3 whitespace-nowrap bg-background">부속명</TableHead>
                <TableHead className="px-2 py-3 whitespace-nowrap bg-background">지그번호</TableHead>
                <TableHead className="px-2 py-3 whitespace-nowrap bg-background">이미지</TableHead>
                <TableHead className="px-2 py-3 whitespace-nowrap bg-background">특이사항</TableHead>
                <TableHead className="px-2 py-3 whitespace-nowrap bg-background">입력일자</TableHead>
                <TableHead className="px-2 py-3 whitespace-nowrap bg-background rounded-tr-lg">입력자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-2 py-8 text-center text-muted-foreground">
                    {searchTerm !== debouncedSearchTerm ? '검색 중...' : 
                     debouncedSearchTerm ? '검색된 지그가 없습니다.' : '등록된 지그가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                masterItems.map((item) => (
                  <JigMasterTableRow
                    key={item.id}
                    item={item}
                    onSelectJig={onSelectItem}
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