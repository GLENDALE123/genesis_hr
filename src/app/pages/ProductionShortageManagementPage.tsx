import { ShortageManagementContainer } from '@/features/production/containers/ShortageManagementContainer';
import { ProtectedRoute } from '@/features/auth';

export default function ProductionShortageManagementPage() {
  return (
    <ProtectedRoute>
      <ShortageManagementContainer />
    </ProtectedRoute>
  );
}


