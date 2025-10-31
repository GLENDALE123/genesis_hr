/**
 * 설정 페이지
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { NotificationSettings } from '@/features/settings/components/NotificationSettings';
import { ProfileSettings } from '@/features/settings/components/ProfileSettings';
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings';
import { AboutSettings } from '@/features/settings/components/AboutSettings';
import { User, Bell, Palette, Info, Database } from 'lucide-react';
import { ProtectedRoute } from '@/shared/components/auth';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MigrationPanel } from '@/features/user-migration/components/MigrationPanel';

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { userProfile } = useAuthStore();
  const isAdmin = userProfile?.role === 'Admin';
  const [activeTab, setActiveTab] = useState('profile');

  const validTabs = isAdmin 
    ? ['profile', 'notifications', 'appearance', 'about', 'migration']
    : ['profile', 'notifications', 'appearance', 'about'];

  // URL 쿼리 파라미터에서 탭 설정 읽기
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, validTabs]);

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-muted-foreground mt-2">
          계정, 알림, 화면 설정을 관리합니다.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full h-auto ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="profile" className="flex flex-col gap-1 py-3">
            <User className="h-4 w-4" />
            <span className="text-xs">프로필</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col gap-1 py-3">
            <Bell className="h-4 w-4" />
            <span className="text-xs">알림</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex flex-col gap-1 py-3">
            <Palette className="h-4 w-4" />
            <span className="text-xs">화면</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex flex-col gap-1 py-3">
            <Info className="h-4 w-4" />
            <span className="text-xs">정보</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="migration" className="flex flex-col gap-1 py-3">
              <Database className="h-4 w-4" />
              <span className="text-xs">동기화</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          <AboutSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="migration" className="space-y-4">
            <MigrationPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-6">로딩 중...</div>}>
        <SettingsContent />
      </Suspense>
    </ProtectedRoute>
  );
}


