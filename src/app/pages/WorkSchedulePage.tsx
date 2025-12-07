import { WorkScheduleContainer } from '@/features/work-schedule';
import { ProtectedRoute } from '@/features/auth';

export default function WorkSchedulePage() {
  return (
    <ProtectedRoute>
      <WorkScheduleContainer />
    </ProtectedRoute>
  );
}


