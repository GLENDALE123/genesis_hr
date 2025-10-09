'use client';

import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingSpinner } from '@/shared/components/common';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/login' 
}) => {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // 로딩이 완료되고 사용자가 없으면 로그인 페이지로 리다이렉트
    if (!isLoading && !user) {
      console.log('🚫 인증되지 않은 사용자, 로그인 페이지로 리다이렉트');
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  // 로딩 중이면 로딩 스피너 표시
  if (isLoading) {
    return <LoadingSpinner fullScreen size="xl" label="로그인 확인 중..." />;
  }

  // 로딩이 완료되었지만 사용자가 없으면 null (리다이렉트 처리 중)
  if (!user) {
    return null;
  }

  // 인증된 사용자면 자식 컴포넌트 렌더링
  return <>{children}</>;
};
