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
  // 모든 훅을 항상 호출하여 훅의 개수를 일관되게 유지
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 로그인/회원가입 페이지는 AppLayout 없이 렌더링
  const authPages = ['/login', '/register'];
  const isAuthPage = authPages.includes(pathname);

  // 서버 사이드에서는 항상 children만 렌더링 (hydration mismatch 방지)
  if (!mounted) {
    return <>{children}</>;
  }

  // 인증 페이지는 항상 TitleBar만 표시
  if (isAuthPage) {
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

  // 로딩 중이거나 사용자가 로그인되지 않은 경우에도 TitleBar만 표시
  if (isLoading || !user) {
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
