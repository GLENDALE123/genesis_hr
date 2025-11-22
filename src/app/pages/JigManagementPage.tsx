import { JigManagementContainer } from '@/features/jig/containers';
import { ProtectedRoute } from '@/shared/components/auth';

export default function JigManagementPage() {
  return (
    <ProtectedRoute>
      <JigManagementContainer />
    </ProtectedRoute>
  );
}


