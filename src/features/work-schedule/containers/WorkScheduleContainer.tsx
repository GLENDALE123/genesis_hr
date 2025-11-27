
import React, { useRef } from 'react';
import { useAuthStore } from '@/features/auth';
import { useWorkSchedule } from '../hooks/useWorkSchedule';
import { useScheduleActions } from '../hooks/useScheduleActions';
import { CalendarHeader } from '../components/CalendarHeader';
import { MonthCalendar } from '../components/MonthCalendar';
import { YearCalendar } from '../components/YearCalendar';
import { WorkType } from '../types';
import { ScheduleSummaryView } from '../components/ScheduleSummary';
import { ScheduleAdminPanel } from '../components/ScheduleAdminPanel';
import { LoadingSpinner } from '@/shared/components/common';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card, CardContent } from '@/shared/components/ui/card';

export const WorkScheduleContainer: React.FC = () => {
  const { userProfile } = useAuthStore();
  
  const {
    year,
    month,
    view,
    schedules,
    selectedDates,
    isLoading,
    summary,
    calendarData,
    setView,
    changeYear,
    changeMonth,
    goToToday,
    toggleDateSelection,
    clearSelection,
  } = useWorkSchedule();

  const { isSubmitting, applySchedule, deleteSchedule } = useScheduleActions();

  const monthlyCalendarRef = useRef<HTMLDivElement>(null);

  const canManage = userProfile?.role === 'Admin';

  // 날짜 클릭 핸들러
  const handleDateClick = (dateStr: string) => {
    if (!canManage || view !== 'month') return;
    toggleDateSelection(dateStr);
  };

  // 근무계획 적용
  const handleApply = async (type: string, dates: Set<string>) => {
    const success = await applySchedule(type as WorkType, dates);
    if (success) {
      clearSelection();
    }
  };

  // 근무계획 삭제
  const handleDelete = async (dates: Set<string>) => {
    const success = await deleteSchedule(dates);
    if (success) {
      clearSelection();
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardContent className="h-full grid grid-rows-[auto_auto_1fr] gap-0 p-2 sm:p-3 md:p-4">
          {/* 헤더 */}
          <CalendarHeader
            view={view}
            onViewChange={setView}
          />

          {/* 통계 요약 */}
          <ScheduleSummaryView summary={summary} />

          {/* 메인 영역 */}
          <div className="flex flex-col lg:flex-row gap-2 md:gap-4 pt-1 sm:pt-2 overflow-y-auto lg:overflow-hidden">
            {isLoading && schedules.size === 0 ? (
              <Skeleton className="flex-1 w-full" />
            ) : (
              <>
                {view === 'year' ? (
                  <div className="flex-1">
                    <YearCalendar year={year} schedules={schedules} />
                  </div>
                ) : (
                  <>
                    {/* 달력 */}
                    <div ref={monthlyCalendarRef} className="flex-1 min-h-0">
                      <MonthCalendar
                        year={year}
                        month={month}
                        schedules={schedules}
                        selectedDates={selectedDates}
                        canManage={canManage}
                        onDateClick={handleDateClick}
                        onMonthChange={changeMonth}
                        onToday={goToToday}
                        calendarData={calendarData}
                      />
                    </div>
                    
                    {/* 데스크톱 관리 패널 */}
                    {canManage && (
                      <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
                        <Card className="h-full">
                          <CardContent className="p-0 h-full flex flex-col">
                            <ScheduleAdminPanel
                              dates={selectedDates}
                              onApply={handleApply}
                              onDelete={handleDelete}
                              onCancel={clearSelection}
                              isSubmitting={isSubmitting}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </>
                )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
    </>
  );
};



