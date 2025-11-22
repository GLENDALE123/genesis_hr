import { PackagingDailyReportContainer } from '@/features/production/containers/PackagingDailyReportContainer';
import { ProtectedRoute } from '@/shared/components/auth';

export default function ProductionDailyReportPage() {
  return (
    <ProtectedRoute>
      <PackagingDailyReportContainer />
    </ProtectedRoute>
  );
}


