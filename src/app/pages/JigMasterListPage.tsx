import { JigMasterContainer } from '@/features/jig/containers';
import { ProtectedRoute } from '@/shared/components/auth';

export default function JigMasterListPage() {
  return (
    <ProtectedRoute>
      <JigMasterContainer />
    </ProtectedRoute>
  );
}


