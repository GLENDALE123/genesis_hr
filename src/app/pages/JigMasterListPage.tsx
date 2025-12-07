import { JigMasterContainer } from '@/features/jig/containers';
import { ProtectedRoute } from '@/features/auth';

export default function JigMasterListPage() {
  return (
    <ProtectedRoute>
      <JigMasterContainer />
    </ProtectedRoute>
  );
}


