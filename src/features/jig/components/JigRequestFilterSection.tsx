'use client';

import React from 'react';
import { Search, Filter, Table, Grid3X3, Kanban } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent } from '@/shared/components/ui/card';
import { MultiSelectFilter } from './MultiSelectFilter';
import { JigStatus } from '../types';
import { ViewMode } from '../types';

interface FilterInfo {
  hasActiveFilters: boolean;
  activeFilters: string[];
  totalCount: number;
  filteredCount: number;
}

interface JigRequestFilterSectionProps {
  // 검색
  searchTerm: string;
  onSearchChange: (term: string) => void;
  
  // 필터 상태
  selectedStatuses: Set<JigStatus>;
  onStatusChange: (statuses: Set<JigStatus>) => void;
  selectedRequesters: Set<string>;
  onRequesterChange: (requesters: Set<string>) => void;
  selectedDestinations: Set<string>;
  onDestinationChange: (destinations: Set<string>) => void;
  selectedMonths: Set<string>;
  onMonthChange: (months: Set<string>) => void;
  
  // 필터 옵션
  requesters: string[];
  destinations: string[];
  months: string[];
  
  // 뷰 모드
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // 액션
  onResetFilters: () => void;
  
  // 필터 정보
  filterInfo: FilterInfo;
}

export const JigRequestFilterSection: React.FC<JigRequestFilterSectionProps> = ({
  searchTerm,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  selectedRequesters,
  onRequesterChange,
  selectedDestinations,
  onDestinationChange,
  selectedMonths,
  onMonthChange,
  requesters,
  destinations,
  months,
  viewMode,
  onViewModeChange,
  onResetFilters,
  filterInfo,
}) => {
  return (
    <div className="pb-3">
      <Card>
        <CardContent className="p-3">
          {/* 검색 바와 필터를 한 줄에 배치 */}
          <div className="flex flex-col lg:flex-row gap-3 mb-3">
            {/* 검색 바 */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="요청 검색..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* 필터 그리드 - 더 컴팩트하게 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {/* 상태 필터 */}
              <MultiSelectFilter
                label="상태"
                placeholder="전체"
                options={Object.values(JigStatus)}
                selectedValues={new Set(Array.from(selectedStatuses).map(status => status as string))}
                onSelectionChange={(values) => onStatusChange(new Set(Array.from(values).map(value => value as JigStatus)))}
                className="min-w-[120px]"
              />

              {/* 요청자 필터 */}
              <MultiSelectFilter
                label="요청자"
                placeholder="전체"
                options={requesters}
                selectedValues={selectedRequesters}
                onSelectionChange={onRequesterChange}
                className="min-w-[120px]"
              />

              {/* 수신처 필터 */}
              <MultiSelectFilter
                label="수신처"
                placeholder="전체"
                options={destinations}
                selectedValues={selectedDestinations}
                onSelectionChange={onDestinationChange}
                className="min-w-[120px]"
              />

              {/* 월별 필터 */}
              <MultiSelectFilter
                label="월별"
                placeholder="전체"
                options={months}
                selectedValues={selectedMonths}
                onSelectionChange={onMonthChange}
                className="min-w-[120px]"
              />
            </div>
          </div>

          {/* 액션 바 - 더 컴팩트하게 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            {/* 필터 정보만 */}
            {filterInfo.hasActiveFilters && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>필터:</span>
                <div className="flex flex-wrap gap-1">
                  {filterInfo.activeFilters.map((filter, index) => (
                    <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                      {filter}
                    </Badge>
                  ))}
                </div>
                <span className="text-primary font-medium">
                  {filterInfo.filteredCount}/{filterInfo.totalCount}
                </span>
              </div>
            )}

            {/* 뷰 모드 선택 탭과 초기화 버튼을 함께 배치 */}
            <div className="flex items-center gap-2">
              {/* 뷰 모드 선택 탭 - 더 작게 */}
              <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
                <TabsList className="inline-flex h-8">
                  <TabsTrigger value="table" className="flex items-center gap-1 px-2 py-1 text-xs">
                    <Table className="h-3 w-3" />
                    <span>테이블</span>
                  </TabsTrigger>
                  <TabsTrigger value="card" className="flex items-center gap-1 px-2 py-1 text-xs">
                    <Grid3X3 className="h-3 w-3" />
                    <span>카드</span>
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="flex items-center gap-1 px-2 py-1 text-xs">
                    <Kanban className="h-3 w-3" />
                    <span>칸반</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* 필터 초기화 버튼 - 더 작게 */}
              <Button variant="outline" size="sm" onClick={onResetFilters} className="h-8 px-2">
                <Filter className="h-3 w-3 mr-1" />
                <span className="text-xs">초기화</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
