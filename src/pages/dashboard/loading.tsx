'use client';

import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useEffect } from 'react';

export default function DashboardLoading() {
  useEffect(() => {
    return () => {
    };
  }, []);

  return (
    <LoadingSpinner 
      label="대시보드 데이터 로딩 중..."
      loadingVariant="card"
      className="min-h-[400px]"
      size="lg"
    />
  );
}

