/**
 * 제품 목록 테이블 컴포넌트
 * PackagingReportListView 패턴 참고
 */

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Search, RotateCcw, Package } from 'lucide-react';
import { Product } from '../types';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useIsSmartphone, useIsTablet } from '@/shared/hooks/use-device';

interface ProductManagementTableProps {
  products: Product[];
  loading: boolean;
  error: Error | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onProductClick: (product: Product) => void;
  onRefetch?: () => void;
}

const ProductManagementTableComponent: React.FC<ProductManagementTableProps> = ({
  products,
  loading,
  error,
  searchTerm,
  onSearchChange,
  onProductClick,
  onRefetch
}) => {
  const isSmartphone = useIsSmartphone();
  const isTablet = useIsTablet();
  const isSmallScreen = isSmartphone || isTablet;

  // 검색 필터링 및 정렬 (제품명 → 부속명 → 사양 → 발주처 순)
  const filteredProducts = useMemo(() => {
    let result = products;

    // 검색 필터링
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = products.filter(product => 
        product.supplier.toLowerCase().includes(lowerSearchTerm) ||
        product.productName.toLowerCase().includes(lowerSearchTerm) ||
        product.partName.toLowerCase().includes(lowerSearchTerm) ||
        product.specification.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // 정렬: 제품명 → 부속명 → 사양 → 발주처
    return result.sort((a, b) => {
      // 1순위: 제품명
      const productNameCompare = (a.productName || '').localeCompare(b.productName || '', 'ko', { numeric: true });
      if (productNameCompare !== 0) return productNameCompare;

      // 2순위: 부속명
      const partNameCompare = (a.partName || '').localeCompare(b.partName || '', 'ko', { numeric: true });
      if (partNameCompare !== 0) return partNameCompare;

      // 3순위: 사양
      const specCompare = (a.specification || '').localeCompare(b.specification || '', 'ko', { numeric: true });
      if (specCompare !== 0) return specCompare;

      // 4순위: 발주처
      return (a.supplier || '').localeCompare(b.supplier || '', 'ko', { numeric: true });
    });
  }, [products, searchTerm]);

  // 로딩 중일 때는 스켈레톤 UI 표시 (테이블 구조 유지)

  if (error) {
    return (
      <Card className="flex items-center justify-center min-h-[24rem]">
        <CardContent className="text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <Package className="h-12 w-12 text-destructive" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-2">
                데이터를 불러올 수 없습니다
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                {error.message || '데이터를 불러오는 중 오류가 발생했습니다.'}
              </p>
            </div>
            {onRefetch && (
              <Button onClick={onRefetch} variant="default">
                <RotateCcw className="h-4 w-4 mr-2" />
                다시 시도
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 검색 */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="발주처, 제품명, 부속명, 사양으로 검색..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
          {loading ? (
            <>
              <ScrollArea className="flex-1 min-h-0" overflowX="auto" overflowY="auto">
                <div className="rounded-lg border overflow-hidden">
                  <Table className="min-w-[800px]">
                    <TableHeader className="sticky top-0 z-10 bg-muted">
                      <TableRow className="hover:bg-muted border-b">
                        <TableHead className="w-[15%] whitespace-nowrap bg-muted font-semibold rounded-tl-lg">발주처</TableHead>
                        <TableHead className="w-[25%] whitespace-nowrap bg-muted font-semibold">제품명</TableHead>
                        <TableHead className="w-[15%] whitespace-nowrap bg-muted font-semibold">부속명</TableHead>
                        <TableHead className="w-[20%] whitespace-nowrap bg-muted font-semibold">사양</TableHead>
                        <TableHead className="w-[25%] whitespace-nowrap bg-muted font-semibold rounded-tr-lg">최신 사용지그</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 8 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
              <div className="flex-shrink-0 p-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Skeleton className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>제품 목록 로딩 중...</span>
                </div>
              </div>
            </>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[24rem]">
              <div className="rounded-full bg-muted/50 p-4">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-muted-foreground font-medium">{searchTerm ? '검색 결과가 없습니다.' : '제품이 없습니다.'}</p>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 min-h-0" overflowX="auto" overflowY="auto">
                <div className="rounded-lg border overflow-hidden">
                  <Table className="min-w-[800px]">
                    <TableHeader className="sticky top-0 z-10 bg-muted">
                      <TableRow className="hover:bg-muted border-b">
                        <TableHead className="w-[15%] whitespace-nowrap bg-muted font-semibold rounded-tl-lg">발주처</TableHead>
                        <TableHead className="w-[25%] whitespace-nowrap bg-muted font-semibold">제품명</TableHead>
                        <TableHead className="w-[15%] whitespace-nowrap bg-muted font-semibold">부속명</TableHead>
                        <TableHead className="w-[20%] whitespace-nowrap bg-muted font-semibold">사양</TableHead>
                        <TableHead className="w-[25%] whitespace-nowrap bg-muted font-semibold rounded-tr-lg">최신 사용지그</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow
                        key={product.id}
                        onClick={() => onProductClick(product)}
                        className="cursor-pointer hover:bg-accent transition-colors"
                      >
                        <TableCell className="font-medium whitespace-nowrap">{product.supplier}</TableCell>
                        <TableCell className="whitespace-nowrap">{product.productName}</TableCell>
                        <TableCell className="whitespace-nowrap">{product.partName}</TableCell>
                        <TableCell className="whitespace-nowrap">{product.specification}</TableCell>
                        <TableCell className="text-sm text-muted-foreground break-words whitespace-normal">
                          {product.latestJig || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </ScrollArea>
              <div className="flex-shrink-0 p-4 border-t text-sm text-muted-foreground">
                총 {filteredProducts.length}개 제품
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// React.memo에 커스텀 비교 함수 제공 - products 배열이 실제로 변경되었는지 확인
export const ProductManagementTable = React.memo(ProductManagementTableComponent, (prevProps, nextProps) => {
  // products 배열의 길이가 다르면 변경된 것으로 간주
  if (prevProps.products.length !== nextProps.products.length) {
    return false;
  }
  
  // products 배열의 내용이 변경되었는지 확인 (id 기준)
  const prevIds = new Set(prevProps.products.map(p => p.id));
  const nextIds = new Set(nextProps.products.map(p => p.id));
  
  if (prevIds.size !== nextIds.size) {
    return false;
  }
  
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      return false;
    }
  }
  
  // 각 제품의 주요 속성이 변경되었는지 확인
  for (let i = 0; i < prevProps.products.length; i++) {
    const prev = prevProps.products[i];
    const next = nextProps.products[i];
    
    if (prev.id !== next.id ||
        prev.latestJig !== next.latestJig) {
      return false;
    }
  }
  
  // loading, error, searchTerm도 확인
  if (prevProps.loading !== nextProps.loading ||
      prevProps.error !== nextProps.error ||
      prevProps.searchTerm !== nextProps.searchTerm) {
    return false;
  }
  
  // 변경사항이 없으면 리렌더링 스킵
  return true;
});

