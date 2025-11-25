'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Search, Plus, Filter } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { SampleStatus } from '../types';
import { SAMPLE_STATUS_FILTERS, COATING_METHODS, SAMPLE_STATUS_COLORS } from '../constants';

interface SampleFilterPanelProps {
  searchTerm: string;
  selectedStatuses: Set<SampleStatus>;
  selectedCoatingMethods: Set<string>;
  onSearchTermChange: (term: string) => void;
  onToggleStatus: (status: SampleStatus) => void;
  onToggleCoating: (coating: string) => void;
  onReset: () => void;
  isSearching?: boolean;
  onCreateRequest: () => void;
}

/**
 * 샘플 요청 필터 패널 컴포넌트
 * - 상태 및 코팅방식 필터
 * - 통합 검색
 */
export const SampleFilterPanel: React.FC<SampleFilterPanelProps> = ({
  searchTerm,
  selectedStatuses,
  selectedCoatingMethods,
  onSearchTermChange,
  onToggleStatus,
  onToggleCoating,
  onReset,
  isSearching = false,
  onCreateRequest
}) => {

  return (
    <Card className="flex-shrink-0">
      <CardContent className="p-4">
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
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onReset} className="h-9 px-3">
                <Filter className="h-3 w-3 mr-1" />
                <span className="text-xs">초기화</span>
              </Button>
            </div>
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-2"
              onClick={onCreateRequest}
            >
              <Plus className="h-4 w-4" />
              신규 요청
            </Button>
          </div>
        </div>

        {/* 상태 필터 및 코팅 방식 필터 */}
        <div className="border-t pt-3">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* 상태 필터 */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
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
              <label className="block text-xs font-medium text-foreground mb-2">
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
            <span className="text-blue-600 text-sm mt-2 block">
              <span className="inline-block animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full mr-1" />
              검색 중...
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

