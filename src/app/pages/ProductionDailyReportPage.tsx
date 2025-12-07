import { PackagingDailyReportContainer } from '@/features/production/packaging';
import { ProtectedRoute } from '@/features/auth';

export default function ProductionDailyReportPage() {
  return (
    <ProtectedRoute>
      <PackagingDailyReportContainer />
    </ProtectedRoute>
  );
}


