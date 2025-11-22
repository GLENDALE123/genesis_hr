/**
 * 설정 페이지
 */


import React, { useState, useEffect, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { NotificationSettings } from '@/features/settings/components/NotificationSettings';
import { ProfileSettings } from '@/features/settings/components/ProfileSettings';
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings';
import { AboutSettings } from '@/features/settings/components/AboutSettings';
import { User, Bell, Palette, Info, Users } from 'lucide-react';
import { ProtectedRoute } from '@/shared/components/auth';
import { useIsAdmin } from '@/features/auth/hooks/useUserRole';
import { UserManagementSettings } from '@/features/settings/components/UserManagementSettings';

function SettingsContent() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState('profile');

  const validTabs = ['profile', 'notifications', 'appearance', 'about', ...(isAdmin ? ['users'] : [])];

  // URL 쿼리 파라미터에서 탭 설정 읽기
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, validTabs]);

  return (
    <>
      <style jsx global>{`
        .settings-page div[class*="space-y-1.5"].p-6,
        .settings-page div.p-6[class*="space-y"] {
          padding: 0.75rem !important;
        }
        @media (min-width: 768px) {
          .settings-page div[class*="space-y-1.5"].p-6,
          .settings-page div.p-6[class*="space-y"] {
            padding: 1.5rem !important;
          }
        }
        .settings-page div.p-6.pt-0 {
          padding: 0.75rem !important;
          padding-top: 0 !important;
        }
        @media (min-width: 768px) {
          .settings-page div.p-6.pt-0 {
            padding: 1.5rem !important;
            padding-top: 0 !important;
          }
        }
      `}</style>
      <div className="md:py-6 md:px-6 settings-page">
        {/* 탭 영역만 max-w-5xl 적용 */}
        <div className="mx-auto max-w-5xl px-2 md:px-8 mb-3 md:mb-6">
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-muted-foreground mt-2">
          계정, 알림, 화면 설정을 관리합니다.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-6">
        <div className="mx-auto max-w-5xl px-2 md:px-8">
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
              <TabsTrigger value="users" className="flex flex-col gap-1 py-3">
                <Users className="h-4 w-4" />
                <span className="text-xs">유저 관리</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-2 md:space-y-4">
          <div className="mx-auto max-w-5xl px-2 md:px-8">
            <ProfileSettings />
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-2 md:space-y-4">
          <div className="mx-auto max-w-5xl px-2 md:px-8">
            <NotificationSettings />
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-2 md:space-y-4">
          <div className="mx-auto max-w-5xl px-2 md:px-8">
            <AppearanceSettings />
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-2 md:space-y-4">
          <div className="mx-auto max-w-5xl px-2 md:px-8">
            <AboutSettings />
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="space-y-2 md:space-y-4">
            <UserManagementSettings />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </>
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






