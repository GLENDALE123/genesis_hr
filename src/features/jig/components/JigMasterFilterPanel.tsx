
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ChevronDown, ChevronUp, Search, Plus } from 'lucide-react';
import { JigMasterItem } from '../types';

interface JigMasterFilterPanelProps {
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
  isSearching?: boolean; // 검색어 debounce 상태
  isFetching?: boolean; // 백그라운드 동기화 상태
  onOpenFormModal?: () => void;
}

/**
 * 지그 마스터 필터 패널 컴포넌트
 * - 날짜 범위 선택
 * - 통합 검색
 * - 빠른 선택 버튼 (어제, 오늘)
 * - 접기/펼치기 기능
 */
export const JigMasterFilterPanel: React.FC<JigMasterFilterPanelProps> = ({
  startDate,
  endDate,
  searchTerm,
  onStartDateChange,
  onEndDateChange,
  onSearchTermChange,
  onReset,
  today,
  yesterday,
  totalCount,
  isSearching = false,
  isFetching = false,
  onOpenFormModal
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
        <div className="flex justify-between items-center">
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => setIsExpanded(prev => !prev)}
          >
            <h2 className="text-xl font-bold text-foreground">지그 목록표</h2>
            <p className="text-sm text-muted-foreground hidden md:block">
              등록된 지그 정보를 조회합니다.
              {typeof totalCount === 'number' && ` (총 ${totalCount}개)`}
              {isFetching && (
                <span className="ml-2 text-blue-600">
                  <span className="inline-block animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full mr-1" />
                  동기화 중...
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenFormModal && (
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-2"
                onClick={onOpenFormModal}
              >
                <Plus className="h-4 w-4" />
                새 지그 등록
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-full"
              aria-label={isExpanded ? '필터 숨기기' : '필터 보기'}
              onClick={() => setIsExpanded(prev => !prev)}
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>
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
                htmlFor="jig-master-search" 
                className="block text-sm font-medium text-foreground mb-2"
              >
                통합 검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="jig-master-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchTermChange(e.target.value)}
                  placeholder="제품명, 부속명, 지그번호, 발주번호 검색..."
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



