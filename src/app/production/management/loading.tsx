'use client';

import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useEffect } from 'react';

export default function ProductionManagementLoading() {
  useEffect(() => {
    console.log('📄 [생산관리부] loading.tsx 렌더링 시작');
    return () => {
      console.log('📄 [생산관리부] loading.tsx 언마운트');
    };
  }, []);

  return (
    <LoadingSpinner 
      size="lg" 
      label="생산관리부 데이터 로딩 중..."
      variant="card"
      className="min-h-[400px]"
    />
  );
}

