import React, { useState } from 'react';
import { TableHead } from './table';
import { Filter, X, Calendar } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { Badge } from './badge';
import { Separator } from './separator';
import { cn } from '@/shared/lib/utils';

interface FilterableTableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {
  /** 헤더 텍스트 */
  children: React.ReactNode;
  /** 헤더 키 (필터 식별용) */
  headerKey: string;
  /** 필터 설정 (없으면 필터링 불가) */
  filterConfig?: {
    options: string[];
    selectedValues: Set<string>;
    onFilterChange: (values: Set<string>) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    // 날짜 범위 필터 지원 (작업일자용)
    dateRangeConfig?: {
      startDate?: string;
      endDate?: string;
      onDateRangeChange?: (startDate: string, endDate: string) => void;
    };
  };
  /** 헤더 클릭 핸들러 */
  onHeaderClick?: (headerKey: string, event: React.MouseEvent<HTMLTableCellElement>) => void;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 필터링 가능한 테이블 헤더 컴포넌트
 * 헤더 클릭 시 Command 팝오버로 필터링 옵션 제공
 */
export const FilterableTableHead = React.forwardRef<HTMLTableCellElement, FilterableTableHeadProps>(
  ({ children, headerKey, filterConfig, onHeaderClick, className, ...props }, ref) => {
    const [open, setOpen] = useState(false);
    const [localStartDate, setLocalStartDate] = useState(filterConfig?.dateRangeConfig?.startDate || '');
    const [localEndDate, setLocalEndDate] = useState(filterConfig?.dateRangeConfig?.endDate || '');

    // 날짜 범위가 변경되면 로컬 상태 업데이트
    React.useEffect(() => {
      if (filterConfig?.dateRangeConfig) {
        setLocalStartDate(filterConfig.dateRangeConfig.startDate || '');
        setLocalEndDate(filterConfig.dateRangeConfig.endDate || '');
      }
    }, [filterConfig?.dateRangeConfig?.startDate, filterConfig?.dateRangeConfig?.endDate]);

    const hasFilter = !!filterConfig;
    const hasSelectedFilters = filterConfig && filterConfig.selectedValues.size > 0;
    const hasDateRange = filterConfig?.dateRangeConfig !== undefined;
    const hasDateRangeFilter = hasDateRange && (localStartDate || localEndDate);

    const handleHeaderClick = (e: React.MouseEvent<HTMLTableCellElement>) => {
      // 필터가 있으면 팝오버 토글
      if (hasFilter) {
        // 버튼 클릭이 아닌 경우에만 팝오버 토글
        const target = e.target as HTMLElement;
        if (!target.closest('button')) {
          setOpen(!open);
        }
      } else if (onHeaderClick) {
        onHeaderClick(headerKey, e);
      }
    };

    const handleSelectAll = () => {
      if (!filterConfig) return;
      const allValues = new Set(filterConfig.options);
      filterConfig.onFilterChange(allValues);
    };

    const handleClearAll = () => {
      if (!filterConfig) return;
      filterConfig.onFilterChange(new Set());
    };

    const handleToggleValue = (value: string) => {
      if (!filterConfig) return;
      const newValues = new Set(filterConfig.selectedValues);
      if (newValues.has(value)) {
        newValues.delete(value);
      } else {
        newValues.add(value);
      }
      filterConfig.onFilterChange(newValues);
    };

    const handleDateRangeApply = () => {
      if (filterConfig?.dateRangeConfig?.onDateRangeChange && localStartDate && localEndDate) {
        filterConfig.dateRangeConfig.onDateRangeChange(localStartDate, localEndDate);
        setOpen(false);
      }
    };

    const handleDateRangeClear = () => {
      setLocalStartDate('');
      setLocalEndDate('');
      // ✅ 조회기간 초기화 시 빈 문자열 전달 (전체 데이터 조회)
      if (filterConfig?.dateRangeConfig?.onDateRangeChange) {
        filterConfig.dateRangeConfig.onDateRangeChange('', '');
      }
    };

    const getDisplayText = () => {
      if (!filterConfig) return '';
      if (filterConfig.selectedValues.size === 0 && !hasDateRangeFilter) {
        return filterConfig.placeholder || '필터';
      }
      if (filterConfig.selectedValues.size === filterConfig.options.length && !hasDateRangeFilter) {
        return '전체';
      }
      if (filterConfig.selectedValues.size === 1 && !hasDateRangeFilter) {
        return Array.from(filterConfig.selectedValues)[0];
      }
      if (hasDateRangeFilter && filterConfig.selectedValues.size === 0) {
        return '날짜 범위';
      }
      return `${filterConfig.selectedValues.size}개 선택됨`;
    };

    return (
      <TableHead
        ref={ref}
        className={cn(
          "px-1.5 py-2 whitespace-nowrap bg-background relative group",
          hasFilter && "cursor-pointer hover:bg-muted/50 transition-colors",
          className
        )}
        onClick={handleHeaderClick}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <span>{children}</span>
          {hasFilter && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    (hasSelectedFilters || hasDateRangeFilter) && "opacity-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                  }}
                >
                  <Filter className={cn(
                    "h-3 w-3",
                    hasSelectedFilters && "text-primary"
                  )} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className={cn("p-0", hasDateRange ? "w-[320px]" : "w-[200px]")} align="start" onClick={(e) => e.stopPropagation()}>
                {hasDateRange ? (
                  <div className="p-3 space-y-3">
                    {/* 날짜 범위 선택 */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        <span>조회기간</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          placeholder="시작일"
                          value={localStartDate}
                          onChange={(e) => setLocalStartDate(e.target.value)}
                          className="flex-1 text-xs"
                          lang="ko"
                        />
                        <span className="text-xs text-muted-foreground">~</span>
                        <Input
                          type="date"
                          placeholder="종료일"
                          value={localEndDate}
                          onChange={(e) => setLocalEndDate(e.target.value)}
                          className="flex-1 text-xs"
                          lang="ko"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleDateRangeApply}
                          disabled={!localStartDate || !localEndDate}
                          className="flex-1 text-xs h-7"
                        >
                          적용
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDateRangeClear}
                          className="flex-1 text-xs h-7"
                        >
                          초기화
                        </Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* 특정 날짜 선택 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">특정 날짜 선택</span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSelectAll}
                            className="h-6 px-2 text-xs"
                          >
                            전체
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleClearAll}
                            className="h-6 px-2 text-xs"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Command>
                        <CommandInput 
                          placeholder={filterConfig.searchPlaceholder || "검색..."} 
                          className="h-8 text-xs" 
                        />
                        <CommandList className="max-h-[200px]">
                          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                          <CommandGroup>
                            {filterConfig.options.map((option) => {
                              const isSelected = filterConfig.selectedValues.has(option);
                              return (
                                <CommandItem
                                  key={option}
                                  onSelect={() => handleToggleValue(option)}
                                  className="text-xs"
                                >
                                  <div
                                    className={cn(
                                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                      isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "opacity-50 [&_svg]:invisible"
                                    )}
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </div>
                                  <span className="truncate">{option}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  </div>
                ) : (
                  <Command>
                    <CommandInput 
                      placeholder={filterConfig.searchPlaceholder || "검색..."} 
                      className="h-9" 
                    />
                    <CommandList>
                      <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                      
                      <CommandGroup>
                        <CommandItem
                          onSelect={handleSelectAll}
                          className="text-primary font-medium text-xs"
                        >
                          전체 선택
                        </CommandItem>
                        
                        <CommandItem
                          onSelect={handleClearAll}
                          className="text-destructive font-medium text-xs"
                        >
                          <X className="mr-2 h-3 w-3" />
                          전체 해제
                        </CommandItem>
                      </CommandGroup>
                      
                      <CommandGroup>
                        {filterConfig.options.map((option) => {
                          const isSelected = filterConfig.selectedValues.has(option);
                          return (
                            <CommandItem
                              key={option}
                              onSelect={() => handleToggleValue(option)}
                              className="text-xs"
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}
                              >
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span className="truncate">{option}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
        {(hasSelectedFilters || hasDateRangeFilter) && (
          <div className="absolute top-0 right-0 mt-0.5 mr-0.5">
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {hasDateRangeFilter ? '날짜' : filterConfig.selectedValues.size}
            </Badge>
          </div>
        )}
      </TableHead>
    );
  }
);

FilterableTableHead.displayName = 'FilterableTableHead';

