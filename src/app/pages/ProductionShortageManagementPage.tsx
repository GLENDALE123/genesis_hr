import { ShortageManagementContainer } from '@/features/production/shortage';
import { ProtectedRoute } from '@/features/auth';

export default function ProductionShortageManagementPage() {
  return (
    <ProtectedRoute>
      <ShortageManagementContainer />
    </ProtectedRoute>
  );
}


