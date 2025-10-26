import React from 'react';
import { Button } from '@/shared/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const isMonthView = view === 'month';

  const handlePrev = () => {
    if (isMonthView && onMonthChange) {
      onMonthChange(-1);
      return;
    }
    onYearChange(-1);
  };

  const handleNext = () => {
    if (isMonthView && onMonthChange) {
      onMonthChange(1);
      return;
    }
    onYearChange(1);
  };

  return (
    <div className="p-3 sm:p-4 border-b flex flex-col gap-2 sm:gap-3">
      {/* 상단: 제목을 중심으로 좌우 화살표 정렬 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="h-8 w-8"
          aria-label={isMonthView ? '이전 달' : '이전 년'}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h2 className="text-xl sm:text-2xl font-bold text-center flex-1">
          {year}년 {isMonthView && month !== undefined && `${month + 1}월`}
        </h2>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8"
            aria-label={isMonthView ? '다음 달' : '다음 년'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
          >
            Today
          </Button>
        </div>
      </div>

      {/* 하단: 뷰 전환 */}
      <div className="flex items-center gap-2">
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
