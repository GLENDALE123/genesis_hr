import { WorkScheduleContainer } from '@/features/work-schedule';
import { ProtectedRoute } from '@/shared/components/auth';

export default function WorkSchedulePage() {
  return (
    <ProtectedRoute>
      <WorkScheduleContainer />
    </ProtectedRoute>
  );
}

