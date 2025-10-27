'use client';

import React, { useMemo } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Sheet, SheetContent } from '@/shared/components/ui/sheet';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PackagingReportForm } from '@/features/production/components/PackagingReportForm';
import { usePackagingReports } from '@/features/production/hooks/usePackagingReports';

export default function ProductionDailyReportMobileEditPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const router = useRouter();
  const { reports, updateReport } = usePackagingReports();
  const [open, setOpen] = React.useState(true);

  const id = (props && props.searchParams && props.searchParams.id
    ? Array.isArray(props.searchParams.id) ? props.searchParams.id[0] : props.searchParams.id
    : '') as string;

  const handleClose = React.useCallback(function () {
    setOpen(false);
    setTimeout(function () { router.back(); }, 220);
  }, [router]);

  const report = useMemo(function () {
    for (let i = 0; i < reports.length; i++) {
      if (reports[i].id === id) return reports[i];
    }
    return null;
  }, [reports, id]);

  return (
    <ProtectedRoute>
      <Sheet open={open} onOpenChange={function (next) { if (!next) handleClose(); }}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-none h-screen bg-background rounded-none flex flex-col overflow-hidden">
          {/* 상단 헤더 (고정) */}
          <div className="sticky top-0 z-[100] bg-background border-b flex items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose} aria-label="뒤로가기">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-base font-semibold">생산일보 수정</h3>
            </div>
            <Button type="submit" form="packaging-report-form" className="h-8 px-3">저장</Button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-28">
            <Card className="p-3">
              <PackagingReportForm
                report={report || undefined}
                isEditMode
                onSubmit={async function (data) {
                  if (!report) return;
                  await updateReport(report.id, {
                    workDate: data.workDate,
                    productionLine: data.productionLine,
                    orderNumbers: data.orderNumbers.filter(function (n) { return n.trim() !== ''; }),
                    supplier: data.supplier,
                    productName: data.productName,
                    partName: data.partName,
                    specification: data.specification,
                    lineRatio: data.lineRatio,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    memo: data.memo,
                    packagedBoxes: data.packagedBoxes.map(function (box) {
                      const base: any = {
                        boxNumber: box.boxNumber,
                        type: box.type,
                        quantity: parseInt(box.quantity) || 0
                      };
                      if (box.reason) {
                        base.reason = box.reason;
                      }
                      return base;
                    }),
                  });
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


