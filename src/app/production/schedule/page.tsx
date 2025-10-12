'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { ProductionScheduleListView } from '@/features/production/components/ProductionScheduleListView';
import { ProductionScheduleUploadModal } from '@/features/production/components/ProductionScheduleUploadModal';
import { useProductionSchedules } from '@/features/production/hooks/useProductionSchedules';
import { toast } from 'sonner';

export default function ProductionSchedulePage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { createSchedules, deleteSchedulesByDate } = useProductionSchedules();

  // 일정 등록 핸들러
  const handleSaveSchedules = async (schedules: Parameters<typeof createSchedules>[0]) => {
    try {
      // 기존 날짜 데이터 삭제 (덮어쓰기)
      const uniqueDates = [...new Set(schedules.map(s => s.planDate))];
      
      for (const date of uniqueDates) {
        try {
          await deleteSchedulesByDate(date);
        } catch (err) {
          console.warn(`날짜 ${date} 삭제 중 오류 (기존 데이터가 없을 수 있음):`, err);
        }
      }

      // 새 일정 등록
      await createSchedules(schedules);
    } catch (error) {
      console.error('일정 등록 실패:', error);
      throw error;
    }
  };

  const currentDate = new Date().toISOString().split('T')[0];

  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col">
        <ProductionScheduleListView
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />
        
        <ProductionScheduleUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSave={handleSaveSchedules}
          currentDate={currentDate}
        />
      </div>
    </ProtectedRoute>
  );
}

