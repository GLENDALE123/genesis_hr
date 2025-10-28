'use client';

import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useEffect } from 'react';

/**
 * 생산일보 페이지 로딩 UI
 * Next.js App Router가 자동으로 이 컴포넌트를 표시합니다
 */
export default function ProductionDailyReportLoading() {
  useEffect(() => {
    return () => {
    };
  }, []);

  return (
    <LoadingSpinner 
      label="생산일보 데이터 로딩 중..."
      loadingVariant="card"
      className="min-h-[400px]"
      size="lg"
    />
  );
}

