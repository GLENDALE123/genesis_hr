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
      {/* Header */}
      <AppHeader onMenuClick={toggleSidebarCollapsed} />
      
      <div className="flex">
        {/* Sidebar */}
        <AppSidebar 
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebarCollapsed}
        />
        
        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64",
          className
        )}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
