import { ShortageManagementContainer } from '@/features/production/containers/ShortageManagementContainer';
import { ProtectedRoute } from '@/shared/components/auth';

export default function ProductionShortageManagementPage() {
  return (
    <ProtectedRoute>
      <ShortageManagementContainer />
    </ProtectedRoute>
  );
}


