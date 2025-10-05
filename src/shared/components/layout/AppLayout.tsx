'use client';

import React from 'react';
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
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar - 전체 화면 높이에서 헤더 높이 제외 */}
        <div className="sticky top-0 h-screen flex-shrink-0">
          <AppSidebar 
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebarCollapsed}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <AppHeader onMenuClick={toggleSidebarCollapsed} />
          
          {/* Main Content */}
          <main className={cn(
            "flex-1 transition-all duration-300 overflow-hidden",
            className
          )}>
            <div className="h-full p-6 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
