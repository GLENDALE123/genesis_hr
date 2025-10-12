/**
 * 설정 페이지
 */

'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { NotificationSettings } from '@/features/settings/components/NotificationSettings';
import { ProfileSettings } from '@/features/settings/components/ProfileSettings';
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings';
import { AboutSettings } from '@/features/settings/components/AboutSettings';
import { User, Bell, Palette, Info } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-muted-foreground mt-2">
          계정, 알림, 화면 설정을 관리합니다.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="profile" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            <span className="text-xs">프로필</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4" />
            <span className="text-xs">알림</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="h-4 w-4" />
            <span className="text-xs">화면</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Info className="h-4 w-4" />
            <span className="text-xs">정보</span>
          </TabsTrigger>
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
      </Tabs>
    </div>
  );
}


