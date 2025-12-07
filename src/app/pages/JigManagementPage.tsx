import { JigManagementContainer } from '@/features/jig/containers';
import { ProtectedRoute } from '@/features/auth';

export default function JigManagementPage() {
  return (
    <ProtectedRoute>
      <JigManagementContainer />
    </ProtectedRoute>
  );
}


