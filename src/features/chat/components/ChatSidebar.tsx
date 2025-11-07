/**
 * 채팅 사이드바 컴포넌트
 * 사용자 목록과 채팅방 목록 탭 전환
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { UserList } from './UserList';
import { ChatRoomList } from './ChatRoomList';
import { useRouter, usePathname } from 'next/navigation';
import { useDeviceType } from '@/shared/hooks/use-device';

export interface ChatSidebarProps {
  className?: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ className }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isSmartphone } = useDeviceType();
  const isMobile = isSmartphone;
  const [activeTab, setActiveTab] = useState<'users' | 'rooms'>('rooms');

  // sessionStorage에서 탭 상태 복원
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('chat-sidebar-tab');
      if (savedTab === 'users' || savedTab === 'rooms') {
        setActiveTab(savedTab);
      }
    }
  }, []);

  // 탭 변경 시 sessionStorage에 저장
  const handleTabChange = (value: string) => {
    if (value === 'users' || value === 'rooms') {
      setActiveTab(value);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chat-sidebar-tab', value);
      }
    }
  };

  // 외부에서 탭 변경 요청을 받기 위한 이벤트 리스너
  useEffect(() => {
    const handleTabChangeEvent = () => {
      setActiveTab('rooms');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chat-sidebar-tab', 'rooms');
      }
    };

    window.addEventListener('chat-sidebar-tab-change', handleTabChangeEvent);
    window.addEventListener('storage', handleTabChangeEvent);

    return () => {
      window.removeEventListener('chat-sidebar-tab-change', handleTabChangeEvent);
      window.removeEventListener('storage', handleTabChangeEvent);
    };
  }, []);

  const handleRoomClick = (roomId: string) => {
    router.push(`/chat?room=${roomId}`);
  };

  return (
    <div className={`flex flex-col h-full bg-background border-r ${className}`} style={{ width: isMobile ? '100%' : '300px' }}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
        <div className="flex-shrink-0 p-4 border-b">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">사용자</TabsTrigger>
            <TabsTrigger value="rooms">채팅방</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="users" className="h-full m-0 overflow-hidden">
            <UserList />
          </TabsContent>
          <TabsContent value="rooms" className="h-full m-0 overflow-hidden">
            <ChatRoomList onRoomClick={handleRoomClick} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

