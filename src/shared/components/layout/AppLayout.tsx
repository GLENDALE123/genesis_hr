'use client';

import React from 'react';
import { TitleBar } from '@/shared/components/layout/TitleBar';
import { AppHeader } from '@/shared/components/layout/AppHeader';
import { AppSidebar } from '@/shared/components/layout/AppSidebar';
import { cn } from '@/shared/lib/utils';
import { useGlobalStore } from '@/app/store';

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

  const sidebarCollapsed = preferences.sidebarCollapsed;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }}>
      {/* Electron 커스텀 타이틀바 (frame: false 환경) */}
      <TitleBar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex-shrink-0">
          <AppSidebar 
            collapsed={sidebarCollapsed}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <AppHeader onMenuClick={toggleSidebarCollapsed} />
          
          {/* Main Content */}
          <main 
            className={cn(
              "flex-1 transition-all duration-300 overflow-hidden",
              className
            )}
            style={{
              backgroundColor: 'hsl(var(--main-background))',
              color: 'hsl(var(--main-foreground))',
            }}
          >
            <div className="h-full p-6 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
