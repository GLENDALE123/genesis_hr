import { PackagingDailyReportContainer } from '@/features/production/containers/PackagingDailyReportContainer';
import { ProtectedRoute } from '@/features/auth';

export default function ProductionDailyReportPage() {
  return (
    <ProtectedRoute>
      <PackagingDailyReportContainer />
    </ProtectedRoute>
  );
}


