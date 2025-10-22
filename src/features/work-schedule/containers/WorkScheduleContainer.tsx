'use client';

import React, { useRef, useState } from 'react';
import { useUserProfile } from '@/features/auth';
import { useWorkSchedule } from '../hooks/useWorkSchedule';
import { useScheduleActions } from '../hooks/useScheduleActions';
import { CalendarHeader } from '../components/CalendarHeader';
import { MonthCalendar } from '../components/MonthCalendar';
import { YearCalendar } from '../components/YearCalendar';
import { WorkType } from '../types';
import { ScheduleSummary } from '../components/ScheduleSummary';
import { ScheduleAdminPanel } from '../components/ScheduleAdminPanel';
import { LoadingSpinner } from '@/shared/components/common';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { toast } from 'sonner';

export const WorkScheduleContainer: React.FC = () => {
  const userProfile = useUserProfile();
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
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [mobileSelectedDate, setMobileSelectedDate] = useState<string | null>(null);

  const canManage = userProfile?.role === 'Admin';

  // 날짜 클릭 핸들러
  const handleDateClick = (dateStr: string) => {
    if (!canManage || view !== 'month') return;

    if (isMobile) {
      setMobileSelectedDate(dateStr);
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

  // 인쇄 기능
  const handlePrint = async () => {
    if (!monthlyCalendarRef.current) {
      toast.error('달력 요소를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsPrintMode(true);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const html2canvas = (await import('html2canvas')).default;
      const isDark = document.documentElement.classList.contains('dark');
      const bgColor = isDark ? '#0f172a' : '#ffffff';

      const canvas = await html2canvas(monthlyCalendarRef.current, {
        useCORS: true,
        backgroundColor: bgColor,
        scale: 3,
      });

      const dataUrl = canvas.toDataURL('image/png');
      setIsPrintMode(false);

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>근무계획 - ${year}년 ${month + 1}월</title>
            <style>
              @page { size: A4 landscape; margin: 0; }
              html, body { margin: 0; padding: 0; height: 100%; }
              .page { 
                width: 297mm; 
                height: 209mm; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                overflow: hidden; 
                padding: 0 5mm; 
                box-sizing: border-box; 
              }
              .page img { 
                display: block; 
                width: 100%; 
                height: 100%; 
                object-fit: contain; 
              }
            </style>
          </head>
          <body>
            <div class="page">
              <img src="${dataUrl}" alt="schedule" />
            </div>
            <script>
              window.onload = function() { 
                window.focus(); 
                window.print(); 
                setTimeout(() => window.close(), 300); 
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error(error);
      toast.error('인쇄 준비 중 오류가 발생했습니다.');
      setIsPrintMode(false);
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardContent className="h-full grid grid-rows-[auto_auto_1fr] gap-0">
          {/* 헤더 */}
          <CalendarHeader
            year={year}
            month={view === 'month' ? month : undefined}
            view={view}
            onViewChange={setView}
            onYearChange={changeYear}
            onMonthChange={changeMonth}
            onToday={goToToday}
            onPrint={view === 'month' ? handlePrint : undefined}
          />

          {/* 통계 요약 */}
          <ScheduleSummary summary={summary} />

          {/* 메인 영역 */}
          <div className="flex flex-col lg:flex-row gap-4 pt-2 overflow-hidden">
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
                        isPrintMode={isPrintMode}
                        calendarData={calendarData}
                      />
                    </div>
                    
                    {/* 데스크톱 관리 패널 */}
                    {canManage && (
                      <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
                        <ScheduleAdminPanel
                          dates={selectedDates}
                          onApply={handleApply}
                          onDelete={handleDelete}
                          onCancel={clearSelection}
                          isSubmitting={isSubmitting}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 모바일 관리 패널 - Sheet 사용 */}
      {canManage && (
        <Sheet 
          open={!!mobileSelectedDate} 
          onOpenChange={(open) => !open && setMobileSelectedDate(null)}
        >
          <SheetContent side="bottom" className="h-[80vh] flex flex-col">
            <SheetHeader>
              <SheetTitle>
                {mobileSelectedDate && new Date(mobileSelectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </SheetTitle>
            </SheetHeader>
            
            {/* 현재 근무계획 표시 */}
            {mobileSelectedDate && (
              <div className="bg-card p-4 rounded-lg border mb-4">
                <h4 className="font-semibold mb-2">계획된 근무</h4>
                {schedules.has(mobileSelectedDate) ? (
                  <div className="text-lg">
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
            )}

            {/* 관리 패널 */}
            {mobileSelectedDate && (
              <ScheduleAdminPanel
                dates={new Set([mobileSelectedDate])}
                onApply={handleApply}
                onDelete={handleDelete}
                onCancel={() => setMobileSelectedDate(null)}
                isSubmitting={isSubmitting}
                isMobile
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

