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
  // Electron 환경 감지 (타이틀바가 fixed일 때만 여백 필요)
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Electron 환경 감지
    if (typeof window !== 'undefined' && (window as any).electron) {
      setIsElectron(true);
    }
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
        {/* Electron 환경에서 타이틀바가 fixed일 때만 여백 추가 */}
        {isElectron && <div className="h-8 flex-shrink-0" />}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // 로그인 페이지가 아닌 경우 (인증이 필요한 페이지)
  // isLoading이 true이면 AppLayout을 유지 (로그인 직후 리다이렉트 시 헤더 유지)
  // 이렇게 하면 로그인 직후 상태 전환 중에도 헤더가 사라지지 않음
  if (isLoading) {
    // 로딩 중이면 AppLayout 유지 (헤더 표시)
    return (
      <AppLayout>
        {children}
      </AppLayout>
    );
  }

  // 사용자가 로그인되지 않은 경우에만 TitleBar만 표시
  // isLoading이 false이고 user가 없을 때만 TitleBar만 표시
  if (!user) {
    return (
      <div className="h-screen flex flex-col">
        {/* Electron 커스텀 타이틀바 (frame: false 환경) */}
        <TitleBar />
        {/* Electron 환경에서 타이틀바가 fixed일 때만 여백 추가 */}
        {isElectron && <div className="h-8 flex-shrink-0" />}
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
