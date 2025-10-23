import React from 'react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface CalendarHeaderProps {
  year: number;
  month?: number;
  view: 'year' | 'month';
  onViewChange: (view: 'year' | 'month') => void;
  onYearChange: (delta: number) => void;
  onMonthChange?: (delta: number) => void;
  onToday: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  year,
  month,
  view,
  onViewChange,
  onYearChange,
  onMonthChange,
  onToday
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        {/* 년도 네비게이션 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onYearChange(-1)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* 월 네비게이션 (월간 보기일 때만) */}
        {view === 'month' && onMonthChange && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(-1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        
        {/* 현재 년/월 표시 */}
        <h2 className="text-2xl font-bold w-48 text-center">
          {year}년 {view === 'month' && month !== undefined && `${month + 1}월`}
        </h2>
        
        {/* 월 네비게이션 (월간 보기일 때만) */}
        {view === 'month' && onMonthChange && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMonthChange(1)}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        
        {/* 년도 네비게이션 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onYearChange(1)}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* Today 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="ml-2"
        >
          Today
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        {/* 뷰 전환 버튼들 */}
        <Button
          variant={view === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('year')}
        >
          연간 보기
        </Button>
        <Button
          variant={view === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewChange('month')}
        >
          월간 보기
        </Button>
      </div>
    </div>
  );
};
