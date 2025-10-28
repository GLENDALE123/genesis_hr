'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { ShortageRequest } from '@/features/production/types';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { ProcessingHistory } from '@/shared/components/common/ProcessingHistory';
import { Search, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { ShortageRequestTable } from './ShortageRequestTable';
import { ShortageRequestDetail } from './ShortageRequestDetail';

interface ShortageManagementListViewProps {
  requests: ShortageRequest[];
  loading: boolean;
  statusFilter: 'all' | 'requested' | 'completed';
  searchTerm: string;
  selectedRequest: ShortageRequest | null;
  canManage: boolean;
  canDelete: boolean;
  onStatusFilterChange: (status: 'all' | 'requested' | 'completed') => void;
  onSearchChange: (term: string) => void;
  onSelectRequest: (request: ShortageRequest) => void;
  onCloseDetail: () => void;
  onStatusUpdate: (requestId: string, newStatus: 'requested' | 'completed') => void;
  onDelete: (request: ShortageRequest) => void;
}

export const ShortageManagementListView: React.FC<ShortageManagementListViewProps> = ({
  requests,
  loading,
  statusFilter,
  searchTerm,
  selectedRequest,
  canManage,
  canDelete,
  onStatusFilterChange,
  onSearchChange,
  onSelectRequest,
  onCloseDetail,
  onStatusUpdate,
  onDelete
}) => {
  const [isMobileFilterVisible, setIsMobileFilterVisible] = React.useState(false);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <LoadingSpinner 
        label="부족품 관리 데이터 로딩 중..." 
        loadingVariant="default"
        size="lg"
      />
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* 필터 및 검색 */}
      <Card className="flex-shrink-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              총 {requests.length}건
            </span>
          </div>

          {/* 데스크톱: 항상 펼쳐진 필터 */}
          <div className="hidden md:flex gap-4">
            {/* 상태 필터 */}
            <div className="w-48">
              <label className="text-sm font-medium text-foreground mb-2 block">상태</label>
              <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as 'all' | 'requested' | 'completed')}>
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="requested">요청</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 검색 */}
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="제품명, 부속명, 발주처, 발주번호로 검색"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* 모바일: 접고/펼치기 가능한 필터 */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground">필터</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileFilterVisible(!isMobileFilterVisible)}
                className="flex items-center gap-1 text-xs"
              >
                {isMobileFilterVisible ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    펼치기
                  </>
                )}
              </Button>
            </div>

            <div className={`space-y-3 transition-all duration-300 overflow-hidden ${
              isMobileFilterVisible ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {/* 상태 필터 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">상태</label>
                <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as 'all' | 'requested' | 'completed')}>
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="requested">요청</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 검색 */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="제품명, 부속명, 발주처, 발주번호로 검색"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메인 콘텐츠 */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex flex-1 min-h-0">
          <div className="flex flex-1 min-h-0 min-w-0">
            {/* 테이블 컴포넌트 분리 */}
            <div className="flex-1 h-[70vh] md:h-auto min-w-0">
              {requests.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">조건에 맞는 부족분 요청이 없습니다.</p>
                </div>
              ) : (
                <ShortageRequestTable
                  requests={requests}
                  onSelectRequest={onSelectRequest}
                />
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 상세 모달 컴포넌트 분리 */}
      <ShortageRequestDetail
        open={!!selectedRequest}
        request={selectedRequest}
        onClose={onCloseDetail}
        onStatusUpdate={onStatusUpdate}
        onDelete={onDelete}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  );
};

