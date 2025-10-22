'use client';

import React from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import { WorkSchedule, WORK_TYPES, WorkType } from '../types';
import { WEEKDAYS, generateMonthCalendar } from '../utils/scheduleUtils';

interface MonthCalendarProps {
  year: number;
  month: number;
  schedules: Map<string, WorkSchedule>;
  selectedDates: Set<string>;
  canManage: boolean;
  onDateClick?: (dateStr: string) => void;
  isPrintMode?: boolean;
  calendarData?: CalendarDay[][]; // 메모이제이션된 달력 데이터
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  year,
  month,
  schedules,
  selectedDates,
  canManage,
  onDateClick,
  isPrintMode = false,
  calendarData,
}) => {
  // 메모이제이션된 달력 데이터 사용, 없으면 fallback으로 직접 생성
  const calendar = calendarData && calendarData.length > 0 
    ? calendarData 
    : generateMonthCalendar(year, month, schedules);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border bg-background">
      {/* 월 제목 */}
      <div className="py-3 bg-muted/50 text-center border-b">
        <h3 className="text-xl lg:text-2xl font-bold">{month + 1}월</h3>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS.map((day, index) => (
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
      <div className="flex-1 grid grid-rows-6 gap-px bg-border">
        {calendar.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px">
            {week.map((dayData) => {
              if (!dayData) return null;
              
              const isSelected = selectedDates.has(dayData.dateString);
              const isToday = dayData.dateString === todayStr;
              const hasSchedule = Boolean(dayData.schedule);

              return (
                <div
                  key={dayData.dateString}
                  className={cn(
                    'relative flex flex-col transition-colors duration-200',
                    isPrintMode ? 'min-h-[8rem] p-2' : 'min-h-[5rem] sm:min-h-[6rem] lg:min-h-[8rem] p-2',
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
                  <div className="flex items-start justify-between mb-1">
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
                      variant="destructive"
                      className={cn(
                        'text-xs mb-1 font-semibold rounded-md',
                        isPrintMode ? 'whitespace-pre-wrap break-words' : 'truncate'
                      )}
                    >
                      {dayData.holiday}
                    </Badge>
                  )}

                  {/* 근무 타입 */}
                  {dayData.isCurrentMonth && hasSchedule && dayData.schedule && (
                    <div
                      className={cn(
                        'text-xs space-y-0.5',
                        isPrintMode ? 'overflow-visible whitespace-pre-wrap break-words' : 'overflow-hidden'
                      )}
                    >
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs font-semibold border-0 rounded-md',
                          isPrintMode ? '' : 'truncate'
                        )}
                        style={{ 
                          backgroundColor: WORK_TYPES[dayData.schedule.type as WorkType]?.color + '20',
                          color: WORK_TYPES[dayData.schedule.type as WorkType]?.color,
                          border: `1px solid ${WORK_TYPES[dayData.schedule.type as WorkType]?.color}40`
                        }}
                      >
                        {dayData.schedule.type}
                      </Badge>
                      {dayData.schedule.description && (
                        <p
                          className={cn(
                            'text-muted-foreground text-xs',
                            isPrintMode ? '' : 'truncate'
                          )}
                        >
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

