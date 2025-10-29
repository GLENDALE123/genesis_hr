'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { ProductionScheduleListView } from '@/features/production/components/ProductionScheduleListView';
import { ProductionScheduleUploadModal } from '@/features/production/components/ProductionScheduleUploadModal';
import { useProductionSchedules } from '@/features/production/hooks/useProductionSchedules';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';

export default function ProductionSchedulePage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { createSchedules, deleteSchedulesByDate } = useProductionSchedules();
  const { user, userProfile } = useAuthStore();

  // 일정 등록 핸들러
  const handleSaveSchedules = async (schedules: Parameters<typeof createSchedules>[0]) => {
    if (!user || !userProfile) {
      toast.error('사용자 정보가 없습니다.');
      return;
    }

    try {
      // 사용자 정보 구성
      const userInfo = {
        uid: user.uid,
        displayName: userProfile.displayName,
        photoURL: user.photoURL || undefined
      };

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
      await createSchedules(schedules, userInfo);
    } catch (error) {
      console.error('일정 등록 실패:', error);
      throw error;
    }
  };

  const currentDate = new Date().toISOString().split('T')[0];

  return (
    <ProtectedRoute>
      <ProductionScheduleListView
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
      />
      
      <ProductionScheduleUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSave={handleSaveSchedules}
        currentDate={currentDate}
      />
    </ProtectedRoute>
  );
}

