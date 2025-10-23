'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingSpinner } from '@/shared/components/common';

export default function Home() {
  const router = useRouter();
  const { user, isLoading: loading } = useAuthStore();
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // 클라이언트에서만 실행
    if (!isClient) return;

    // 로딩 중이면 대기
    if (loading) {
      console.log('🔄 인증 상태 확인 중...');
      return;
    }

    // 로그인 상태에 따라 리다이렉트
    if (user) {
      console.log('✅ 로그인됨 → 대시보드로 이동');
      router.replace('/dashboard');
    } else {
      console.log('❌ 로그인 안 됨 → 로그인 페이지로 이동');
      router.replace('/login');
    }
  }, [user, loading, router, isClient]);

  // 서버와 클라이언트에서 동일한 초기 렌더링을 위해 고정된 label 사용
  return (
    <LoadingSpinner 
      fullScreen 
      size="xl"
      label="인증 상태 확인 중..."
    />
  );
}
