import React from 'react';
import { Button } from '@/shared/components/ui/button';

interface CalendarHeaderProps {
  view: 'year' | 'month';
  onViewChange: (view: 'year' | 'month') => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  view,
  onViewChange,
}) => {
  return (
    <div className="px-3 sm:px-4 py-2 border-b">
      {/* 뷰 전환 버튼 */}
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

