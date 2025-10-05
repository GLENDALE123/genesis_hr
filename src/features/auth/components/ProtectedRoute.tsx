'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
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
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  if (loading) {
    return <LoadingSpinner fullScreen size="xl" label="로그인 확인 중..." />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
