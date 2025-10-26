'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/use-mobile';

export const WorkScheduleContainer: React.FC = () => {
  const { userProfile } = useAuthStore();
  const isMobile = useIsMobile();
  
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
  const [mobileSelectedDate, setMobileSelectedDate] = useState<string | null>(null);

  const canManage = userProfile?.role === 'Admin';
  const router = useRouter();

  // 날짜 클릭 핸들러
  const handleDateClick = (dateStr: string) => {
    if (!canManage || view !== 'month') return;

    if (isMobile) {
      router.push(`/work-schedule/mobile/${dateStr}`);
    } else {
      toggleDateSelection(dateStr);
    }
  };

  // 근무계획 적용
  const handleApply = async (type: string, dates: Set<string>) => {
    const success = await applySchedule(type as WorkType, dates);
    if (success) {
      clearSelection();
      setMobileSelectedDate(null);
    }
  };

  // 근무계획 삭제
  const handleDelete = async (dates: Set<string>) => {
    const success = await deleteSchedule(dates);
    if (success) {
      clearSelection();
      setMobileSelectedDate(null);
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardContent className="h-full grid grid-rows-[auto_auto_1fr] gap-0 p-3 sm:p-4 md:p-6">
          {/* 헤더 */}
          <CalendarHeader
            year={year}
            month={view === 'month' ? month : undefined}
            view={view}
            onViewChange={setView}
            onYearChange={changeYear}
            onMonthChange={changeMonth}
            onToday={goToToday}
          />

          {/* 통계 요약 */}
          <ScheduleSummaryView summary={summary} />

          {/* 메인 영역 */}
          <div className="flex flex-col lg:flex-row gap-2 md:gap-4 pt-1 sm:pt-2 overflow-y-auto lg:overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner 
                  size="lg"
                  label="데이터를 불러오는 중..."
                />
              </div>
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

      {/* 모바일 전용: 전체 화면 생성/편집 폼 */}
      {canManage && isMobile && mobileSelectedDate && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* 상단 헤더 */}
          <div className="flex items-center gap-2 p-3 border-b">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileSelectedDate(null)}
              aria-label="뒤로가기"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-base font-semibold">
              {new Date(mobileSelectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </h3>
          </div>

          {/* 내용 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="bg-card p-3 rounded-lg border">
              <h4 className="font-semibold mb-2">계획된 근무</h4>
              {schedules.has(mobileSelectedDate) ? (
                <div>
                  <p className="font-semibold">
                    {schedules.get(mobileSelectedDate)?.type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {schedules.get(mobileSelectedDate)?.description}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">계획 없음</p>
              )}
            </div>

            <ScheduleAdminPanel
              dates={new Set([mobileSelectedDate])}
              onApply={handleApply}
              onDelete={handleDelete}
              onCancel={() => setMobileSelectedDate(null)}
              isSubmitting={isSubmitting}
              isMobile
            />
          </div>
        </div>
      )}
    </>
  );
};

