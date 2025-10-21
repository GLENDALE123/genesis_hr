'use client';

import React from 'react';
import { TitleBar } from '@/shared/components/layout/TitleBar';
import { AppHeader } from '@/shared/components/layout/AppHeader';
import { AppSidebar } from '@/shared/components/layout/AppSidebar';
import { cn } from '@/shared/lib/utils';
import { useGlobalStore } from '@/app/store';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/shared/components/ui/sheet';
import { VisuallyHidden } from '@/shared/components/ui/visually-hidden';
import { useIsMobile } from '@/shared/hooks/use-mobile';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  className 
}) => {
  const { 
    preferences, 
    toggleSidebarCollapsed 
  } = useGlobalStore();
  
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  const sidebarCollapsed = preferences.sidebarCollapsed;
  
  const handleMenuClick = () => {
    if (isMobile) {
      setMobileSidebarOpen(true);
    } else {
      toggleSidebarCollapsed();
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Electron 커스텀 타이틀바 (frame: false 환경) */}
      <TitleBar />
      
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
            <SheetContent side="left" className="w-72 p-0">
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
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <AppHeader onMenuClick={handleMenuClick} />
          
          {/* Main Content */}
          <main 
            className={cn(
              "flex-1 transition-all duration-300",
              isMobile ? "overflow-y-auto overflow-x-hidden p-2" : "overflow-y-auto overflow-x-hidden p-4",
              className
            )}
            style={{
              backgroundColor: 'hsl(var(--main-background))',
              color: 'hsl(var(--main-foreground))',
            }}
          >
            <div className="h-full w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
