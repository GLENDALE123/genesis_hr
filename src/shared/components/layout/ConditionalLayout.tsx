'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export const ConditionalLayout: React.FC<ConditionalLayoutProps> = ({ 
  children 
}) => {
  const pathname = usePathname();
  const { user } = useAuth();

  // 로그인/회원가입 페이지는 AppLayout 없이 렌더링
  const authPages = ['/login', '/register'];
  const isAuthPage = authPages.includes(pathname);

  // 인증 페이지이거나 사용자가 로그인되지 않은 경우 AppLayout 없이 렌더링
  if (isAuthPage || !user) {
    return <>{children}</>;
  }

  // 로그인된 사용자의 일반 페이지는 AppLayout과 함께 렌더링
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
};
