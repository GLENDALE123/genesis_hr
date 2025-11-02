'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ChevronDown, ChevronUp, Search, Plus } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import { SampleStatus } from '../types';
import { SAMPLE_STATUS_FILTERS, COATING_METHODS, SAMPLE_STATUS_COLORS } from '../constants';

interface SampleFilterPanelProps {
  startDate: string;
  endDate: string;
  searchTerm: string;
  selectedStatuses: Set<SampleStatus>;
  selectedCoatingMethods: Set<string>;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSearchTermChange: (term: string) => void;
  onToggleStatus: (status: SampleStatus) => void;
  onToggleCoating: (coating: string) => void;
  onQuickDateFilter: (type: 'today' | 'yesterday' | 'week' | 'month') => void;
  onReset: () => void;
  today: string;
  yesterday: string;
  totalCount?: number;
  isSearching?: boolean;
  hasActiveFilters: boolean;
  onCreateRequest: () => void;
}

/**
 * 샘플 요청 필터 패널 컴포넌트
 * - 날짜 범위 선택
 * - 빠른 날짜 필터
 * - 상태 및 코팅방식 필터
 * - 통합 검색
 * - 접기/펼치기 기능
 */
export const SampleFilterPanel: React.FC<SampleFilterPanelProps> = ({
  startDate,
  endDate,
  searchTerm,
  selectedStatuses,
  selectedCoatingMethods,
  onStartDateChange,
  onEndDateChange,
  onSearchTermChange,
  onToggleStatus,
  onToggleCoating,
  onQuickDateFilter,
  onReset,
  today,
  yesterday,
  totalCount,
  isSearching = false,
  hasActiveFilters,
  onCreateRequest
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // 모바일에서 기본적으로 접힌 상태

  // 데스크톱에서는 기본적으로 펼쳐진 상태로 설정
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 768) { // md 브레이크포인트
        setIsExpanded(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <Card className="flex-shrink-0">
      <CardContent className="p-4">
        {/* 헤더 */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div 
            className="flex-1 flex flex-col gap-2 cursor-pointer"
            onClick={(e) => {
              // 버튼이 아닌 영역 클릭 시만 토글
              if ((e.target as HTMLElement).closest('button') === null) {
                setIsExpanded(prev => !prev);
              }
            }}
          >
            {/* 기본 필터 (항상 표시) */}
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* 상태 필터 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  상태 필터
                </label>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_STATUS_FILTERS.map(status => {
                    const isSelected = selectedStatuses.has(status);
                    return (
                      <Button
                        key={status}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStatus(status);
                        }}
                        className={cn(
                          'text-xs',
                          isSelected && SAMPLE_STATUS_COLORS[status]
                        )}
                      >
                        {status}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 코팅방식 필터 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  코팅/증착 방식 필터
                </label>
                <div className="flex flex-wrap gap-2">
                  {COATING_METHODS.map(coating => {
                    const isSelected = selectedCoatingMethods.has(coating);
                    return (
                      <Button
                        key={coating}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCoating(coating);
                        }}
                        className="text-xs"
                      >
                        {coating}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            {isSearching && (
              <span className="text-blue-600 text-sm">
                <span className="inline-block animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full mr-1" />
                검색 중...
              </span>
            )}
          </div>
          <div className="flex items-start gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onCreateRequest();
              }}
            >
              <Plus className="h-4 w-4" />
              신규 요청
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-full"
              aria-label={isExpanded ? '필터 숨기기' : '필터 보기'}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(prev => !prev);
              }}
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* 확장 필터 영역 */}
        {isExpanded && (
          <div className="space-y-4 border-t pt-4">
            {/* 1열: 조회기간, 빠른선택, 통합검색, 초기화 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* 조회 기간 */}
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-foreground mb-2">
                  조회 기간
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">~</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    min={startDate}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* 빠른 선택 */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  빠른 선택
                </label>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onQuickDateFilter('today')}
                    className="text-xs"
                  >
                    오늘
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onQuickDateFilter('yesterday')}
                    className="text-xs"
                  >
                    어제
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onQuickDateFilter('week')}
                    className="text-xs"
                  >
                    최근 7일
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onQuickDateFilter('month')}
                    className="text-xs"
                  >
                    최근 30일
                  </Button>
                </div>
              </div>

              {/* 통합 검색 */}
              <div className="lg:col-span-6">
                <label 
                  htmlFor="sample-search" 
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  통합 검색
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="sample-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    placeholder="ID, 고객사, 제품명..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 초기화 */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-2 invisible">
                  초기화
                </label>
                <Button
                  variant="outline"
                  onClick={onReset}
                  className="w-full"
                  disabled={!hasActiveFilters}
                >
                  초기화
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

