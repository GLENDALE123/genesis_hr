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
import { Search, X, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

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
        size="lg" 
        label="부족품 관리 데이터 로딩 중..." 
        variant="card"
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

          <div className="flex flex-col md:flex-row gap-4">
            {/* 상태 필터 */}
            <div className="w-full md:w-48">
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
        </CardContent>
      </Card>

      {/* 메인 콘텐츠 */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex flex-1 min-h-0">
          <div className="flex flex-1 min-h-0">
            {/* 테이블 */}
            <div className="flex-1 overflow-auto">
              {requests.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">조건에 맞는 부족분 요청이 없습니다.</p>
                </div>
              ) : (
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">요청일</TableHead>
                      <TableHead className="whitespace-nowrap">상태</TableHead>
                      <TableHead className="whitespace-nowrap">요청자</TableHead>
                      <TableHead className="whitespace-nowrap">생산라인</TableHead>
                      <TableHead className="whitespace-nowrap">발주번호</TableHead>
                      <TableHead className="whitespace-nowrap">발주처</TableHead>
                      <TableHead className="whitespace-nowrap">제품명/부속명</TableHead>
                      <TableHead className="whitespace-nowrap">부족분 사유</TableHead>
                      <TableHead className="whitespace-nowrap text-right">요청수량</TableHead>
                      {(canManage || canDelete) && <TableHead className="whitespace-nowrap text-center">작업</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => {
                      const isCompleted = request.status === 'completed';
                      const isSelected = (selectedRequest && selectedRequest.id) === request.id;

                      return (
                        <TableRow
                          key={request.id}
                          onClick={() => onSelectRequest(request)}
                          className={`cursor-pointer hover:bg-muted/50 ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
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
                          {(canManage || canDelete) && (
                            <TableCell className="whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                {canManage && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onStatusUpdate(request.id, isCompleted ? 'requested' : 'completed');
                                    }}
                                    className={isCompleted 
                                      ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20' 
                                      : 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                                    }
                                  >
                                    {isCompleted ? '요청으로' : '완료'}
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete(request);
                                    }}
                                    title="부족분 요청 삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 상세 정보 모달 */}
      <Dialog open={!!selectedRequest} onOpenChange={() => onCloseDetail()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>부족분 요청 상세</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCloseDetail}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">요청일:</span>
                    <p className="text-foreground">{formatDateTime(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">상태:</span>
                    <p className="text-foreground">
                      {selectedRequest.status === 'completed' ? '완료' : '요청'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">요청자:</span>
                    <p className="text-foreground">{selectedRequest.author.displayName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">생산라인:</span>
                    <p className="text-foreground">{selectedRequest.productionLine}</p>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-muted-foreground text-sm">제품 정보:</span>
                  <div className="mt-2 p-3 bg-muted rounded-lg space-y-2 text-sm">
                    <p><strong>발주번호:</strong> {selectedRequest.orderNumbers.join(', ')}</p>
                    <p><strong>발주처:</strong> {selectedRequest.supplier}</p>
                    <p><strong>제품명:</strong> {selectedRequest.productName}</p>
                    <p><strong>부속명:</strong> {selectedRequest.partName}</p>
                    <p><strong>사양:</strong> {selectedRequest.specification}</p>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-muted-foreground text-sm">생산 수량 정보:</span>
                  <div className="mt-2 p-3 bg-muted rounded-lg space-y-2 text-sm">
                    <p><strong>발주수량:</strong> {(selectedRequest.orderQuantity && selectedRequest.orderQuantity.toLocaleString()) || '-'}</p>
                    <p><strong>투입수량:</strong> {(selectedRequest.inputQuantity && selectedRequest.inputQuantity.toLocaleString()) || '-'}</p>
                    <p><strong>양품수량:</strong> {(selectedRequest.goodQuantity && selectedRequest.goodQuantity.toLocaleString()) || '-'}</p>
                    <p><strong>불량수량:</strong> {(selectedRequest.defectQuantity && selectedRequest.defectQuantity.toLocaleString()) || '-'}</p>
                    <p className="text-red-600 dark:text-red-400 font-semibold">
                      <strong>부족분 요청수량:</strong> {selectedRequest.requestedShortageQuantity.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-muted-foreground text-sm">부족분 사유:</span>
                  <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                    <p className="whitespace-pre-wrap">{selectedRequest.shortageReason}</p>
                  </div>
                </div>

                {selectedRequest.history && selectedRequest.history.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground text-sm">처리 이력:</span>
                    <div className="mt-2 space-y-2">
                      {selectedRequest.history.map((entry, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{entry.status}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(entry.date)}
                            </span>
                          </div>
                          <p className="text-muted-foreground">by {entry.user}</p>
                          {entry.reason && (
                            <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

