'use client';

import React from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { WorkSchedule, WORK_TYPES, WorkType, CalendarDay } from '../types';
import { WEEKDAYS, generateMonthCalendar } from '../utils/scheduleUtils';

interface MonthCalendarProps {
  year: number;
  month: number;
  schedules: Map<string, WorkSchedule>;
  selectedDates: Set<string>;
  canManage: boolean;
  onDateClick?: (dateStr: string) => void;
  onMonthChange?: (delta: number) => void;
  onYearChange?: (delta: number) => void;
  onToday?: () => void;
  calendarData?: CalendarDay[][]; // 메모이제이션된 달력 데이터
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  year,
  month,
  schedules,
  selectedDates,
  canManage,
  onDateClick,
  onMonthChange,
  onYearChange,
  onToday,
  calendarData,
}: MonthCalendarProps) => {
  // 메모이제이션된 달력 데이터 사용, 없으면 fallback으로 직접 생성
  const calendar = calendarData && calendarData.length > 0 
    ? calendarData 
    : generateMonthCalendar(year, month, schedules);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const handlePrev = () => {
    if (onMonthChange) {
      onMonthChange(-1);
    }
  };

  const handleNext = () => {
    if (onMonthChange) {
      onMonthChange(1);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border bg-background">
      {/* 년도/월 헤더 with 좌우 화살표 */}
      <div className="py-3 sm:py-4 bg-muted/50 border-b relative">
        <div className="flex items-center justify-center gap-4 px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="h-10 w-10 flex-shrink-0"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-nowrap">
            {year}년 {month + 1}월
          </h3>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-10 w-10 flex-shrink-0"
            aria-label="다음 달"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {onToday && (
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToday}
            >
              Today
            </Button>
          </div>
        )}
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b bg-muted/30 text-[10px] sm:text-xs">
        {WEEKDAYS.map((day: string, index: number) => (
          <div
            key={day}
            className={cn(
              'py-2 text-sm font-medium text-center',
              index === 0 && 'text-red-500', // 일요일
              index === 6 && 'text-blue-500'  // 토요일
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 - 반응형 높이 */}
      <div className="flex-1 grid grid-rows-6 gap-px bg-border overflow-y-auto">
        {calendar.map((week: CalendarDay[], weekIndex: number) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px">
            {week.map((dayData: CalendarDay) => {
              if (!dayData) return null;
              
              const isSelected = selectedDates.has(dayData.dateString);
              const isToday = dayData.dateString === todayStr;
              const hasSchedule = Boolean(dayData.schedule);

              return (
                <div
                  key={dayData.dateString}
                  className={cn(
                    'relative flex flex-col transition-colors duration-200',
                    'min-h-[2.75rem] sm:min-h-[4rem] lg:min-h-[6rem] p-1.5 sm:p-2',
                    dayData.isCurrentMonth
                      ? 'bg-background hover:bg-muted/30'
                      : 'bg-muted/20 text-muted-foreground',
                    canManage && dayData.isCurrentMonth && 'cursor-pointer',
                    isSelected && 'ring-2 ring-primary ring-inset bg-primary/5'
                  )}
                  onClick={() => {
                    if (canManage && dayData.isCurrentMonth) {
                      onDateClick?.(dayData.dateString);
                    }
                  }}
                >
                  {/* 날짜 숫자 */}
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isToday && 'flex items-center justify-center bg-primary text-primary-foreground rounded-full w-7 h-7',
                        !dayData.isCurrentMonth && 'opacity-40',
                        dayData.dayOfWeek === 0 && 'text-red-500',
                        dayData.holiday && 'text-red-500'
                      )}
                    >
                      {dayData.day}
                    </span>
                  </div>

                  {/* 공휴일 */}
                  {dayData.isCurrentMonth && dayData.holiday && (
                    <Badge
                      className={cn(
                        'text-xs mb-2 font-semibold rounded-md bg-red-500 text-white',
                        'truncate'
                      )}
                    >
                      {dayData.holiday}
                    </Badge>
                  )}

                  {/* 근무 타입 */}
                  {dayData.isCurrentMonth && hasSchedule && dayData.schedule && (
                    <div
                      className="text-xs space-y-1 overflow-hidden"
                    >
                      <Badge
                        className="text-xs font-semibold border-0 rounded-md truncate"
                        style={{ 
                          backgroundColor: WORK_TYPES[dayData.schedule.type as WorkType]?.color + '20',
                          color: WORK_TYPES[dayData.schedule.type as WorkType]?.color,
                          border: `1px solid ${WORK_TYPES[dayData.schedule.type as WorkType]?.color}40`
                        }}
                      >
                        {dayData.schedule.type}
                      </Badge>
                      {dayData.schedule.description && (
                        <p className="text-muted-foreground text-xs truncate">
                          {dayData.schedule.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

