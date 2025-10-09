import { Spinner } from '@/shared/components/ui/spinner';

/**
 * 생산일보 페이지 로딩 UI
 * Next.js App Router가 자동으로 이 컴포넌트를 표시합니다
 */
export default function ProductionDailyReportLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" label="생산일보 로딩 중..." />
    </div>
  );
}

