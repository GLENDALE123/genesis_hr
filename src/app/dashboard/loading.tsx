'use client';

import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useEffect } from 'react';

export default function DashboardLoading() {
  useEffect(() => {
    console.log('📄 [대시보드] loading.tsx 렌더링 시작');
    return () => {
      console.log('📄 [대시보드] loading.tsx 언마운트');
    };
  }, []);

  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <LoadingSpinner 
        size="lg" 
        label="대시보드 데이터 로딩 중..." 
        variant="default"
      />
    </div>
  );
}

