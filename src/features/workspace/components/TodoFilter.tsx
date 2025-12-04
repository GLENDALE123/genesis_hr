/**
 * 할 일 필터 컴포넌트
 * Jandi 스타일의 간단한 필터 UI
 */

import React from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Search, X, Filter, ArrowUpDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { TodoFilter, TodoSortBy, TodoFilterOptions } from '../types/todo.types';

export interface TodoFilterProps {
  filterOptions: TodoFilterOptions;
  onFilterChange: (options: TodoFilterOptions) => void;
  onClearFilters: () => void;
  currentUserId?: string;
  className?: string;
}

export const TodoFilter: React.FC<TodoFilterProps> = ({
  filterOptions,
  onFilterChange,
  onClearFilters,
  currentUserId,
  className,
}) => {
  const handleFilterChange = (filter: TodoFilter) => {
    // 내 할 일 필터인 경우 userId를 searchQuery에 포함
    const newOptions: TodoFilterOptions = {
      ...filterOptions,
      filter,
      searchQuery: filter === 'my-todos' && currentUserId ? currentUserId : filterOptions.searchQuery,
    };
    // 내 할 일이 아닌 경우 searchQuery에서 userId 제거
    if (filter !== 'my-todos' && filterOptions.searchQuery === currentUserId) {
      newOptions.searchQuery = undefined;
    }
    onFilterChange(newOptions);
  };

  const handleSortByChange = (sortBy: TodoSortBy) => {
    onFilterChange({ ...filterOptions, sortBy });
  };

  const handleSortOrderChange = (sortOrder: 'asc' | 'desc') => {
    onFilterChange({ ...filterOptions, sortOrder });
  };

  const handleSearchChange = (searchQuery: string) => {
    onFilterChange({ ...filterOptions, searchQuery: searchQuery || undefined });
  };

  const hasActiveFilters =
    filterOptions.filter !== 'all' ||
    filterOptions.sortBy !== 'createdAt' ||
    filterOptions.sortOrder !== 'desc' ||
    !!filterOptions.searchQuery;

  const filterLabels: Record<TodoFilter, string> = {
    all: '전체',
    'my-todos': '내 할 일',
    incomplete: '미완료',
    completed: '완료됨',
    overdue: '지연됨',
  };

  const sortLabels: Record<TodoSortBy, string> = {
    createdAt: '생성일',
    dueDate: '마감일',
    priority: '우선순위',
    title: '제목',
  };

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2.5 border-b bg-muted/10', className)}>
      {/* 검색 */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="할 일 검색..."
          value={filterOptions.searchQuery || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-8 pr-8 h-8 text-sm bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        {filterOptions.searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-muted"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* 필터 버튼 그룹 */}
      <div className="flex items-center gap-0.5 border-r border-border pr-2 mr-1">
        {(['all', 'my-todos', 'incomplete', 'completed', 'overdue'] as TodoFilter[]).map((filter) => (
          <Button
            key={filter}
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2.5 text-xs font-medium rounded-md transition-all',
              filterOptions.filter === filter
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onClick={() => handleFilterChange(filter)}
          >
            {filterLabels[filter]}
          </Button>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex items-center gap-1">
        <Select value={filterOptions.sortBy} onValueChange={handleSortByChange}>
          <SelectTrigger className="w-[110px] h-7 text-xs bg-background border-border hover:bg-muted">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortLabels).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-muted"
          onClick={() =>
            handleSortOrderChange(filterOptions.sortOrder === 'asc' ? 'desc' : 'asc')
          }
          title={filterOptions.sortOrder === 'asc' ? '오름차순' : '내림차순'}
        >
          <ArrowUpDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              filterOptions.sortOrder === 'asc' && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* 필터 초기화 */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onClearFilters}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          초기화
        </Button>
      )}
    </div>
  );
};

