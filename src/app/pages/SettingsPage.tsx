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
      <style>{`
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
      <div className="settings-page space-y-6 max-w-7xl mx-auto p-6">
        <div>
          <h1 className="text-3xl font-bold">설정</h1>
          <p className="text-muted-foreground">
            계정 설정 및 환경설정을 관리하세요.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">프로필</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">알림</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">외관</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">사용자 관리</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">정보</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <AppearanceSettings />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="mt-6">
              <UserManagementSettings />
            </TabsContent>
          )}

          <TabsContent value="about" className="mt-6">
            <AboutSettings />
          </TabsContent>
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


