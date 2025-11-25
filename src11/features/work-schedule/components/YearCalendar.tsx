import React from 'react';
import { WorkSchedule, WORK_TYPES, HOLIDAYS } from '../types';
import { generateMonthCalendar } from '../utils/scheduleUtils';
import { cn } from '@/shared/lib/utils';

interface YearCalendarProps {
  year: number;
  schedules: Map<string, WorkSchedule>;
}

export const YearCalendar: React.FC<YearCalendarProps> = ({ year, schedules }) => {
  const renderMonthCalendar = (month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // 빈 셀들 (이전 달)
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const schedule = schedules.get(dateStr);
      const dayOfWeek = date.getDay();
      const holiday = HOLIDAYS[year]?.[`${month + 1}-${day}`];

      days.push(
        <div 
          key={dateStr}
          className="h-8 flex items-center justify-center text-xs relative"
        >
          <span
            className={cn(
              'text-xs',
              dayOfWeek === 0 || holiday ? 'text-red-400' : '',
              schedule ? 'flex items-center justify-center bg-yellow-400 text-slate-900 rounded-full w-6 h-6' : ''
            )}
          >
            {day}
          </span>
        </div>
      );
    }

    // 빈 셀들 (다음 달)
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    while (days.length < totalCells) {
      days.push(<div key={`empty-fill-${days.length}`} className="h-8"></div>);
    }

    return (
      <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
        <h3 className="font-bold text-center mb-1 sm:mb-2 text-yellow-400 text-xs sm:text-sm">{month + 1}월</h3>
        <div className="grid grid-cols-7 text-center text-xs">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className={cn(
              'py-1',
              day === '토' ? 'text-blue-400' : '',
              day === '일' ? 'text-red-400' : ''
            )}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-2 w-full overflow-y-auto">
      {Array.from({ length: 12 }, (_, i) => renderMonthCalendar(i))}
    </div>
  );
};
