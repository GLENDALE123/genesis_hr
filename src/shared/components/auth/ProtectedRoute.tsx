'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 인증이 필요한 페이지를 보호하는 컴포넌트
 * 로그인하지 않은 사용자를 로그인 페이지로 리다이렉트합니다.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // 로딩이 완료되고 사용자가 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    if (!isLoading && !user) {
      console.log('🔒 [ProtectedRoute] 인증되지 않은 사용자 - 로그인 페이지로 리다이렉트');
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // 로딩 중일 때는 로딩 스피너 표시
  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner 
          size="lg" 
          variant="default" 
          label="인증 확인 중..." 
          loadingVariant="card"
        />
      </div>
    );
  }

  // 사용자가 로그인되지 않은 경우 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!user) {
    return null;
  }

  // 인증된 사용자에게는 자식 컴포넌트 렌더링
  return <>{children}</>;
};
