'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/shared/components/common';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 인증 상태에 따른 자동 리다이렉트
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingSpinner fullScreen size="xl" label="인증 중..." />;
  }

  // 리다이렉트 중일 때는 로딩 표시
  return <LoadingSpinner fullScreen size="xl" label="페이지 이동 중..." />;
}
