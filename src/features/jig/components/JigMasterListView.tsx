'use client';

import React, { useState, useMemo, memo, useCallback } from 'react';
import { JigMasterItem, UserProfile } from '../types';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Image } from 'lucide-react';

interface JigMasterListViewProps {
  jigs: JigMasterItem[];
  onSelectJig: (jig: JigMasterItem) => void;
  onAddNewJig: () => void;
  currentUserProfile: UserProfile | null;
}

// 메모이제이션된 테이블 행 컴포넌트
const JigMasterTableRow = memo<{
  item: JigMasterItem;
  onSelectJig: (jig: JigMasterItem) => void;
}>(({ item, onSelectJig }) => {
  const handleRowClick = useCallback(() => {
    onSelectJig(item);
  }, [item, onSelectJig]);

  return (
    <TableRow
      className="cursor-pointer"
      onClick={handleRowClick}
    >
      <TableCell className="text-xs whitespace-nowrap">{item.requestType}</TableCell>
      <TableCell className="font-medium whitespace-nowrap">{item.itemName}</TableCell>
      <TableCell className="whitespace-nowrap">{item.partName}</TableCell>
      <TableCell className="whitespace-nowrap">{item.itemNumber}</TableCell>
      <TableCell>
        {item.imageUrls && item.imageUrls.length > 0 ? (
          <div className="flex items-center gap-1 text-primary">
            <Image className="w-4 h-4" />
            <span className="text-xs">{item.imageUrls.length}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">없음</span>
        )}
      </TableCell>
      <TableCell className="text-xs max-w-xs whitespace-nowrap overflow-hidden text-ellipsis" title={item.remarks}>
        {item.remarks || '-'}
      </TableCell>
      <TableCell className="text-xs whitespace-nowrap">
        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {(item.createdBy && item.createdBy.displayName) || 'N/A'}
      </TableCell>
    </TableRow>
  );
});

JigMasterTableRow.displayName = 'JigMasterTableRow';

export const JigMasterListView: React.FC<JigMasterListViewProps> = ({ jigs, onSelectJig, onAddNewJig, currentUserProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJigs = useMemo(() => {
    if (!searchTerm) return jigs;
    
    const search = searchTerm.toLowerCase();
    return jigs.filter(jig =>
      jig.itemName.toLowerCase().includes(search) ||
      jig.partName.toLowerCase().includes(search) ||
      jig.itemNumber.toLowerCase().includes(search) ||
      jig.requestType.toLowerCase().includes(search) ||
      (jig.remarks && jig.remarks.toLowerCase().includes(search))
    );
  }, [jigs, searchTerm]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const canAddNewJig = currentUserProfile?.role !== 'Member';

  const masterItems = filteredJigs;

  const onSelectItem = onSelectJig;

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="p-6 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground flex-shrink-0">지그 목록표</h2>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input
            type="text"
            placeholder="지그 검색..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full sm:w-64"
            lang="ko"
          />
          {canAddNewJig && (
            <Button onClick={onAddNewJig} className="flex-shrink-0">
              신규 등록
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-auto flex-1">
        <Table className="min-w-max">
          <TableHeader className="sticky top-0 z-10 bg-primary">
            <TableRow className="hover:bg-primary">
              <TableHead className="whitespace-nowrap text-primary-foreground">생산구분</TableHead>
              <TableHead className="whitespace-nowrap text-primary-foreground">제품명</TableHead>
              <TableHead className="whitespace-nowrap text-primary-foreground">부속명</TableHead>
              <TableHead className="whitespace-nowrap text-primary-foreground">지그번호</TableHead>
              <TableHead className="whitespace-nowrap text-primary-foreground">이미지</TableHead>
              <TableHead className="whitespace-nowrap text-primary-foreground">특이사항</TableHead>
              <TableHead className="whitespace-nowrap text-primary-foreground">입력일자</TableHead>
              <TableHead className="whitespace-nowrap text-primary-foreground">입력자</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {masterItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  {searchTerm ? '검색된 지그가 없습니다.' : '등록된 지그가 없습니다.'}
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
      <div className="p-3 text-sm text-center border-t">
        <p>총 {filteredJigs.length.toLocaleString()}개의 고유 지그가 있습니다.</p>
      </div>
    </div>
  );
};