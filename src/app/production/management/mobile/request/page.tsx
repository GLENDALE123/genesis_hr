"use client";

import React from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { Sheet, SheetContent } from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductionRequestFormModal } from '@/features/production/components/ProductionRequestFormModal';
import { useProductionRequests } from '@/features/production/hooks/useProductionRequests';
import { useAuthStore } from '@/features/auth';

export default function ProductionRequestMobilePage() {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const handleClose = React.useCallback(() => {
    setOpen(false);
    setTimeout(() => router.back(), 220);
  }, [router]);

  const { userProfile } = useAuthStore();
  const currentUserName = (userProfile && (userProfile.displayName || userProfile.name)) || '';
  const { createRequest } = useProductionRequests() as unknown as { createRequest?: (data: any, images: File[]) => Promise<void> };

  return (
    <ProtectedRoute>
      <Sheet open={open} onOpenChange={(next: boolean) => { if (!next) handleClose(); }}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-none h-screen bg-background rounded-none flex flex-col overflow-hidden">
          {/* 상단 헤더 */}
          <div className="sticky top-0 z-[100] bg-background border-b flex items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose} aria-label="뒤로가기">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-base font-semibold">신규 생산관리부 요청</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleClose} className="h-8 px-3">
                취소
              </Button>
              <Button type="submit" form="production-request-form" className="h-8 px-3">
                요청 저장
              </Button>
            </div>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto p-3 md:px-8 lg:px-24 space-y-3 pb-28">
            {/* 기존 모달 컴포넌트를 재사용하되, 내부 Dialog는 열림 상태로 고정하지 않고 폼만 사용하기 위해 래핑 */}
            <div className="hidden" aria-hidden />
            <ProductionRequestFormModal
              isOpen={true}
              inline
              onClose={handleClose}
              onSave={async (data, images) => {
                if (createRequest) {
                  await createRequest(data as any, images);
                }
                handleClose();
              }}
              currentUserName={currentUserName}
            />
          </div>
        </SheetContent>
      </Sheet>
    </ProtectedRoute>
  );
}
