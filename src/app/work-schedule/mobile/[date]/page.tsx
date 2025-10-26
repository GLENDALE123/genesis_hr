"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/shared/components/auth';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { useWorkSchedule } from '@/features/work-schedule/hooks/useWorkSchedule';
import { ScheduleAdminPanel } from '@/features/work-schedule/components/ScheduleAdminPanel';
import { useScheduleActions } from '@/features/work-schedule/hooks/useScheduleActions';

export default function MobileWorkScheduleFormPage() {
  const router = useRouter();
  const params = useParams<{ date: string }>();
  const date = params?.date as string;
  const { schedules } = useWorkSchedule();
  const { isSubmitting, applySchedule, deleteSchedule } = useScheduleActions();
  const { userProfile } = useAuthStore();

  if (!date) return null;

  const onBack = () => router.back();

  const handleApply = async (type: string, dates: Set<string>) => {
    const ok = await applySchedule(type as any, dates);
    if (ok) onBack();
  };

  const handleDelete = async (dates: Set<string>) => {
    const ok = await deleteSchedule(dates);
    if (ok) onBack();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        {/* 상단 헤더 */}
        <div className="flex items-center gap-2 p-3 border-b">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} aria-label="뒤로가기">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold">
            {new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </h3>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <Card className="p-3">
            <h4 className="font-semibold mb-2">계획된 근무</h4>
            {schedules.has(date) ? (
              <div>
                <p className="font-semibold">{schedules.get(date)?.type}</p>
                <p className="text-sm text-muted-foreground">{schedules.get(date)?.description}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">계획 없음</p>
            )}
          </Card>

          <ScheduleAdminPanel
            dates={new Set([date])}
            onApply={handleApply}
            onDelete={handleDelete}
            onCancel={onBack}
            isSubmitting={isSubmitting}
            isMobile
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}


