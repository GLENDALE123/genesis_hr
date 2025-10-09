'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { TitleBar } from '@/shared/components/layout/TitleBar';
import { useAuthStore } from '@/features/auth/store/authStore';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export const ConditionalLayout: React.FC<ConditionalLayoutProps> = ({ 
  children 
}) => {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // 로그인/회원가입 페이지는 AppLayout 없이 렌더링
  const authPages = ['/login', '/register'];
  const isAuthPage = authPages.includes(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 서버 사이드에서는 항상 children만 렌더링 (hydration mismatch 방지)
  if (!mounted) {
    return <>{children}</>;
  }

  // 클라이언트 사이드에서는 인증 상태에 따라 레이아웃 결정
  // 인증 페이지이거나 사용자가 로그인되지 않은 경우 TitleBar만 표시
  if (isAuthPage || !user) {
    return (
      <div className="h-screen flex flex-col">
        {/* Electron 커스텀 타이틀바 (frame: false 환경) */}
        <TitleBar />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // 로그인된 사용자의 일반 페이지는 AppLayout과 함께 렌더링
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
};
