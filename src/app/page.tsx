'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingSpinner } from '@/shared/components/common';

export default function Home() {
  const router = useRouter();
  const { user, isLoading: loading } = useAuthStore();

  useEffect(() => {
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
  }, [user, loading, router]);

  return (
    <LoadingSpinner 
      fullScreen 
      size="xl"
      label={loading ? '인증 상태 확인 중...' : '페이지 이동 중...'}
    />
  );
}
