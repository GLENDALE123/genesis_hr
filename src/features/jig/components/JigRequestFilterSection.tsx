
import React from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { JigStatus } from '../types';
import { STATUS_COLORS, STATUS_FILTERS } from '../constants';
import { cn } from '@/shared/lib/utils';

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
  
  // 월별 필터
  selectedMonths: Set<string>;
  onMonthChange: (months: Set<string>) => void;
  months: string[];
  
  // 액션
  onResetFilters: () => void;
  
  // 필터 정보
  filterInfo: FilterInfo;
  
  // 신규 요청
  onCreateRequest?: () => void;
}

export const JigRequestFilterSection: React.FC<JigRequestFilterSectionProps> = ({
  searchTerm,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  selectedMonths,
  onMonthChange,
  months,
  onResetFilters,
  filterInfo,
  onCreateRequest,
}) => {
  return (
    <div className="pb-3">
      <Card>
        <CardContent className="p-3">
          {/* 헤더 */}
          <div className="space-y-3 mb-3">
            <div className="flex justify-center items-center gap-4">
              {/* 통합 검색 및 초기화 */}
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 max-w-lg">
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
                <Button variant="outline" size="sm" onClick={onResetFilters} className="h-9 px-3">
                  <Filter className="h-3 w-3 mr-1" />
                  <span className="text-xs">초기화</span>
                </Button>
              </div>
              {onCreateRequest && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={onCreateRequest}
                >
                  <Plus className="h-4 w-4" />
                  신규 요청
                </Button>
              )}
            </div>
          </div>

          {/* 상태 필터 및 월별 필터 */}
          <div className="flex items-start gap-4 border-t pt-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                상태 필터
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map(status => {
                  const isSelected = selectedStatuses.has(status);
                  return (
                    <Button
                      key={status}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSelection = new Set(selectedStatuses);
                        if (newSelection.has(status)) {
                          newSelection.delete(status);
                        } else {
                          newSelection.add(status);
                        }
                        onStatusChange(newSelection);
                      }}
                      className={cn(
                        'text-xs',
                        isSelected && STATUS_COLORS[status]
                      )}
                    >
                      {status}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* 월별 필터 */}
            <div className="w-40">
              <label className="block text-xs font-medium text-foreground mb-2">
                월별 필터
              </label>
              <Select
                value={Array.from(selectedMonths)[0] || 'all'}
                onValueChange={(value) => {
                  onMonthChange(value === 'all' ? new Set() : new Set([value]));
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

