'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface InspectionFilterPanelProps {
  startDate: string;
  endDate: string;
  searchTerm: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSearchTermChange: (term: string) => void;
  onReset: () => void;
  today: string;
  yesterday: string;
  totalCount?: number;
}

/**
 * 품질검사 필터 패널 컴포넌트
 * - 날짜 범위 선택
 * - 통합 검색
 * - 빠른 선택 버튼 (어제, 오늘)
 * - 접기/펼치기 기능
 */
export const InspectionFilterPanel: React.FC<InspectionFilterPanelProps> = ({
  startDate,
  endDate,
  searchTerm,
  onStartDateChange,
  onEndDateChange,
  onSearchTermChange,
  onReset,
  today,
  yesterday,
  totalCount
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="flex-shrink-0">
      <CardContent className="p-4">
        {/* 헤더 */}
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setIsExpanded(prev => !prev)}
        >
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">품질 종합이력</h2>
            <p className="text-sm text-muted-foreground">
              모든 검사 현황을 통합하여 보여줍니다.
              {typeof totalCount === 'number' && ` (총 ${totalCount}개)`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full"
            aria-label={isExpanded ? '필터 숨기기' : '필터 보기'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* 필터 영역 */}
        {isExpanded && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* 조회 기간 */}
            <div className="md:col-span-5">
              <label className="block text-sm font-medium text-foreground mb-2">
                조회 기간
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="flex-1 min-w-[140px]"
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  min={startDate}
                  className="flex-1 min-w-[140px]"
                />
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onStartDateChange(yesterday);
                      onEndDateChange(yesterday);
                    }}
                    className="whitespace-nowrap"
                  >
                    어제
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onStartDateChange(today);
                      onEndDateChange(today);
                    }}
                    className="whitespace-nowrap"
                  >
                    오늘
                  </Button>
                </div>
              </div>
            </div>

            {/* 통합 검색 */}
            <div className="md:col-span-5">
              <label 
                htmlFor="inspection-search" 
                className="block text-sm font-medium text-foreground mb-2"
              >
                통합 검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="inspection-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchTermChange(e.target.value)}
                  placeholder="전체 항목에서 검색..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* 초기화 버튼 */}
            <div className="md:col-span-2">
              <Button
                variant="outline"
                onClick={onReset}
                className="w-full"
              >
                초기화
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

