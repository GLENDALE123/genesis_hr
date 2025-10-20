'use client';

import React, { useState, useMemo } from 'react';
import { JigMasterItem, UserProfile } from '../types';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { ImageLightbox } from '@/shared/components/common/ImageLightbox';
import { ImageGalleryGrid } from '@/shared/components/common/ImageGalleryGrid';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

interface JigMasterListViewProps {
  jigs: JigMasterItem[];
  onSelectJig: (jig: JigMasterItem) => void;
  onAddNewJig: () => void;
  currentUserProfile: UserProfile | null;
}

export const JigMasterListView: React.FC<JigMasterListViewProps> = ({ jigs, onSelectJig, onAddNewJig, currentUserProfile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxData, setLightboxData] = useState<{ images: string[], initialIndex: number } | null>(null);

  const filteredJigs = useMemo(() => {
    if (!searchTerm) return jigs;
    
    const search = searchTerm.toLowerCase();
    return jigs.filter(jig =>
      jig.itemName.toLowerCase().includes(search) ||
      jig.partName.toLowerCase().includes(search) ||
      jig.itemNumber.toLowerCase().includes(search) ||
      jig.requestType.toLowerCase().includes(search) ||
      jig.remarks.toLowerCase().includes(search)
    );
  }, [jigs, searchTerm]);

  const canAddNewJig = currentUserProfile?.role !== 'Member';

  const masterItems = filteredJigs;

  const handleImageClick = (images: string[], index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxData({ images, initialIndex: index });
  };

  const onSelectItem = onSelectJig;

  return (
    <div className="bg-background rounded-lg shadow-lg h-full flex flex-col">
      <div className="p-6 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground flex-shrink-0">지그 목록표</h2>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input
            type="text"
            placeholder="지그 검색..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
      <ScrollArea className="flex-1">
        <div className="rounded-md border mx-6 mb-4">
          <Table>
            <TableHeader className="sticky top-0 bg-primary text-primary-foreground z-10">
              <TableRow>
                <TableHead className="text-primary-foreground whitespace-nowrap">생산구분</TableHead>
                <TableHead className="text-primary-foreground whitespace-nowrap">제품명</TableHead>
                <TableHead className="text-primary-foreground whitespace-nowrap">부속명</TableHead>
                <TableHead className="text-primary-foreground whitespace-nowrap">지그번호</TableHead>
                <TableHead className="text-primary-foreground whitespace-nowrap">이미지</TableHead>
                <TableHead className="text-primary-foreground whitespace-nowrap">특이사항</TableHead>
                <TableHead className="text-primary-foreground whitespace-nowrap">입력일자</TableHead>
                <TableHead className="text-primary-foreground whitespace-nowrap">입력자</TableHead>
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
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => onSelectItem(item)}
                  >
                    <TableCell className="whitespace-nowrap">{item.requestType}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{item.itemName}</TableCell>
                    <TableCell className="whitespace-nowrap">{item.partName}</TableCell>
                    <TableCell className="whitespace-nowrap">{item.itemNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item.imageUrls && item.imageUrls.length > 0 ? (
                        <div className="relative">
                          <img
                            src={item.imageUrls[0]}
                            alt={`${item.itemName} 이미지`}
                            className="w-16 h-16 object-cover rounded-md transition-transform hover:scale-110"
                            onClick={(e) => handleImageClick(item.imageUrls!, 0, e)}
                            loading="lazy"
                          />
                          {item.imageUrls.length > 1 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                              {item.imageUrls.length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">없음</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate whitespace-nowrap" title={item.remarks}>
                      {item.remarks || '-'}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {item.createdBy?.displayName || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
      <div className="p-3 text-sm text-center border-t">
        <p>총 {filteredJigs.length.toLocaleString()}개의 고유 지그가 있습니다.</p>
      </div>
      {lightboxData && <ImageLightbox images={lightboxData.images} initialIndex={lightboxData.initialIndex} open={!!lightboxData} onClose={() => setLightboxData(null)} />}
    </div>
  );
};