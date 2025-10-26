"use client";

import React from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Sheet, SheetContent } from '@/shared/components/ui/sheet';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PackagingReportForm } from '@/features/production/components/PackagingReportForm';
import { usePackagingReports } from '@/features/production/hooks/usePackagingReports';

export default function ProductionDailyReportMobileRegisterPage() {
  const router = useRouter();
  const { createReport } = usePackagingReports();
  const [open, setOpen] = React.useState(true);
  const handleClose = React.useCallback(() => {
    setOpen(false);
    setTimeout(() => router.back(), 220);
  }, [router]);

  return (
    <ProtectedRoute>
      <Sheet open={open} onOpenChange={(next: boolean) => { if (!next) handleClose(); }}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-none h-screen bg-background rounded-none flex flex-col overflow-hidden">
          {/* 상단 헤더 (고정) */}
          <div className="sticky top-0 z-[100] bg-background border-b flex items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose} aria-label="뒤로가기">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-base font-semibold">생산일보 등록</h3>
            </div>
            <Button type="submit" form="packaging-report-form" className="h-8 px-3">저장</Button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-28">
            <Card className="p-3">
              <PackagingReportForm
                onSubmit={async (data) => {
                  await createReport(data);
                  handleClose();
                }}
              />
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </ProtectedRoute>
  );
}


