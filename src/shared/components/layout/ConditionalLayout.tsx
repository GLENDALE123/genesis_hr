import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { TitleBar } from '@/shared/components/layout/TitleBar';
import { useAuthStore } from '@/features/auth/store/authStore';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

const ConditionalLayoutComponent: React.FC<ConditionalLayoutProps> = ({ 
  children 
}) => {
  // 모든 훅을 항상 호출하여 훅의 개수를 일관되게 유지
  const { pathname } = useLocation();
  const { user, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  // Electron 환경 감지 (타이틀바가 fixed일 때만 여백 필요)
  const [isElectron, setIsElectron] = useState(false);

  // 포스트잇 모드 확인
  const isPostItMode = (() => {
    if (typeof window === 'undefined') return false;
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('mode') === 'postit') return true;
    const hash = window.location.hash;
    if (hash) {
      const hashQuery = hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        if (hashParams.get('mode') === 'postit') return true;
      }
      if (hash === '#/postit' || hash.startsWith('#/postit?')) return true;
    }
    return false;
  })();

  // 포스트잇 모드일 때는 아무것도 렌더링하지 않음 (App.tsx에서 처리됨)
  if (isPostItMode) {
    return null;
  }

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
  // Vite는 CSR이므로 hydration mismatch는 없지만, 초기 마운트 전 깜빡임 방지
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

  // 사용자가 로그인되지 않은 경우에만 TitleBar만 표시
  // isLoading이 false이거나 사용자가 있으면 즉시 렌더링 (스피너 없음)
  if (!isLoading && !user) {
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
  
  // 첫 로드 시 (isLoading=true, user=null)에만 스피너 표시
  if (isLoading && !user) {
    return (
      <div className="h-screen flex flex-col">
        <TitleBar />
        {/* 타이틀바가 fixed이므로 높이만큼 여백 추가 */}
        <div className="h-8 flex-shrink-0" />
        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <div className="text-muted-foreground">인증 확인 중...</div>
        </div>
      </div>
    );
  }

  // 풀스크린 페이지는 여백 없이 렌더링
  const fullscreenPages: string[] = [];
  const isFullscreenPage = fullscreenPages.some((page) => pathname.startsWith(page));

  // 로그인된 사용자의 일반 페이지는 AppLayout과 함께 렌더링
  return (
    <AppLayout noContentPadding={isFullscreenPage}>
      {children}
    </AppLayout>
  );
};

ConditionalLayoutComponent.displayName = 'ConditionalLayout';

// React.memo로 최적화 - pathname, user, isLoading 변경 시에만 리렌더링
export const ConditionalLayout = React.memo(ConditionalLayoutComponent, (prevProps, nextProps) => {
  // children이 변경되지 않았으면 리렌더링 스킵
  // 주의: children은 React.ReactNode이므로 참조 비교만 가능
  // 실제로는 pathname, user, isLoading 변경에 따라 리렌더링되어야 하므로
  // 이 컴포넌트는 항상 리렌더링 허용 (내부에서 조건부 렌더링 처리)
  return false; // 항상 리렌더링 허용 (내부 로직에서 최적화)
});
