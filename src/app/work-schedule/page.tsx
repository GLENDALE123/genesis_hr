import { Metadata } from 'next';
import { WorkScheduleContainer } from '@/features/work-schedule';
import { ProtectedRoute } from '@/shared/components/auth';

export const metadata: Metadata = {
  title: '근무계획 | TMS 통합관리시스템',
  description: '월별 근무계획 관리 및 조회',
};

export default function WorkSchedulePage() {
  return (
    <ProtectedRoute>
      <WorkScheduleContainer />
    </ProtectedRoute>
  );
}

