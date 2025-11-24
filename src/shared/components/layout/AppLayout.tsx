'use client';

import React from 'react';
import { TitleBar } from '@/shared/components/layout/TitleBar';
import { AppHeader } from '@/shared/components/layout/AppHeader';
import { AppSidebar } from '@/shared/components/layout/AppSidebar';
import { cn } from '@/shared/lib/utils';
import { useGlobalStore } from '@/shared/store/globalStore';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/shared/components/ui/sheet';
import { VisuallyHidden } from '@/shared/components/ui/visually-hidden';
import { useDeviceType } from '@/shared/hooks/use-device';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  noContentPadding?: boolean; // 모바일 풀스크린 페이지 등에서 본문 패딩 제거
}

const AppLayoutComponent: React.FC<AppLayoutProps> = ({ 
  children, 
  className,
  noContentPadding = false
}) => {
  const { 
    preferences, 
    toggleSidebarCollapsed 
  } = useGlobalStore();
  
  const { isSmartphone } = useDeviceType();
  const isMobile = isSmartphone; // 태블릿은 데스크톱 레이아웃 유지
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [viewportHeight, setViewportHeight] = React.useState<string>('100vh');
  // Electron 환경 감지 (타이틀바가 fixed일 때만 여백 필요)
  const [isElectron, setIsElectron] = React.useState(false);

  const sidebarCollapsed = preferences.sidebarCollapsed;
  
  // 모바일 환경에서 마운트 상태 관리 및 뷰포트 높이 계산
  React.useEffect(() => {
    setMounted(true);
    
    // Electron 환경 감지
    if (typeof window !== 'undefined' && (window as any).electron) {
      setIsElectron(true);
    }
    
    // 모바일에서 실제 뷰포트 높이 계산
    if (isMobile && typeof window !== 'undefined') {
      const updateViewportHeight = () => {
        const vh = window.innerHeight;
        setViewportHeight(`${vh}px`);
      };
      
      updateViewportHeight();
      window.addEventListener('resize', updateViewportHeight);
      window.addEventListener('orientationchange', updateViewportHeight);
      
      return () => {
        window.removeEventListener('resize', updateViewportHeight);
        window.removeEventListener('orientationchange', updateViewportHeight);
      };
    }
  }, [isMobile]);
  
  const handleMenuClick = React.useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen(true);
    } else {
      toggleSidebarCollapsed();
    }
  }, [isMobile, toggleSidebarCollapsed]);

  // 마운트되지 않은 상태에서는 기본 레이아웃만 렌더링
  if (!mounted) {
    return (
      <div 
        className="flex flex-col overflow-hidden" 
        style={{ 
          backgroundColor: 'hsl(var(--background))',
          height: isMobile ? viewportHeight : '100vh'
        }}
      >
        <TitleBar />
        {/* Electron 환경에서 타이틀바가 fixed일 때만 여백 추가 */}
        {isElectron && <div className="h-8 flex-shrink-0" />}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-shrink-0">
              <AppHeader onMenuClick={handleMenuClick} />
            </div>
            <main 
              className={cn(
                "flex-1 transition-all duration-300",
                isMobile 
                  ? (noContentPadding ? "overflow-y-auto p-0 pb-4" : "overflow-y-auto p-2 pb-6")
                  : (noContentPadding ? "overflow-y-auto p-0" : "overflow-y-auto p-4"),
                className
              )}
              style={{
                backgroundColor: 'hsl(var(--main-background))',
                color: 'hsl(var(--main-foreground))',
              }}
            >
              {isMobile ? (
                // 모바일: wrapper div 제거로 스크롤 문제 해결
                children
              ) : (
                // 데스크톱: 기존 구조 유지
                <div className="h-full w-full">
                  {children}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col overflow-hidden" 
      style={{ 
        backgroundColor: 'hsl(var(--background))',
        height: isMobile ? viewportHeight : '100vh'
      }}
    >
      {/* Electron 커스텀 타이틀바 (frame: false 환경) */}
      <TitleBar />
      {/* Electron 환경에서 타이틀바가 fixed일 때만 여백 추가 */}
      {isElectron && <div className="h-8 flex-shrink-0" />}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <AppSidebar
            className=""
            collapsed={sidebarCollapsed}
          />
        )}
        
        {/* Mobile Sidebar Sheet */}
        {isMobile && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent 
              side="left" 
              className="w-56 p-0"
            >
              <VisuallyHidden>
                <SheetTitle>네비게이션 메뉴</SheetTitle>
                <SheetDescription>
                  애플리케이션의 주요 메뉴와 기능에 접근할 수 있습니다.
                </SheetDescription>
              </VisuallyHidden>
              <AppSidebar
                className="border-0"
                collapsed={false}
                onMobileClose={() => setMobileSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}
        
        {/* Right Area (Header + Main Content) */}
        <div 
          className="flex-1 flex flex-col min-w-0 overflow-hidden"
          style={{
            WebkitAppRegion: 'no-drag', // Electron: 콘텐츠 영역은 드래그 불가능하도록 설정
          } as React.CSSProperties}
        >
          {/* Header */}
          <div className="flex-shrink-0">
            <AppHeader onMenuClick={handleMenuClick} />
          </div>
          
          {/* Main Content */}
          <main 
            className={cn(
              "flex-1 transition-all duration-300",
              isMobile 
                ? (noContentPadding ? "overflow-y-auto p-0 pb-4" : "overflow-y-auto p-2 pb-6")
                : (noContentPadding ? "overflow-y-auto p-0" : "overflow-y-auto p-4"),
              className
            )}
            style={{
              backgroundColor: 'hsl(var(--main-background))',
              color: 'hsl(var(--main-foreground))',
            }}
          >
            {isMobile ? (
              // 모바일: wrapper div 제거로 스크롤 문제 해결
              children
            ) : (
              // 데스크톱: 기존 구조 유지
              <div className="h-full w-full">
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

AppLayoutComponent.displayName = 'AppLayout';

export const AppLayout = React.memo(AppLayoutComponent);
