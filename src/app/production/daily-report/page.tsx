import { PackagingDailyReportContainer } from '@/features/production/containers/PackagingDailyReportContainer';
import { ProtectedRoute } from '@/shared/components/auth';

/**
 * 생산일보 페이지
 * App Router 규칙에 따라 컨테이너 컴포넌트를 사용
 */
export default function ProductionDailyReportPage() {
  return (
    <ProtectedRoute>
      <PackagingDailyReportContainer />
    </ProtectedRoute>
  );
}
