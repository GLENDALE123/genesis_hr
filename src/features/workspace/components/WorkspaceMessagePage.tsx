/**
 * 워크스페이스 메시지 페이지
 * 워크스페이스 및 채널 기반 메시지 페이지
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { ChannelView } from './ChannelView';
import { useDeviceType } from '@/shared/hooks/use-device';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/shared/components/ui/sheet';

export function WorkspaceMessagePage() {
  return (
    <ProtectedRoute>
      <WorkspaceMessagePageClient />
    </ProtectedRoute>
  );
}

const WorkspaceMessagePageClient: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { currentWorkspace, currentChannel, setCurrentChannel } = useWorkspaceStore();
  const [isMounted, setIsMounted] = useState(false);
  const { isSmartphone } = useDeviceType();
  const isMobile = isSmartphone;

  // URL 쿼리 파라미터에서 채널 ID 추출
  const channelId = searchParams?.get('channel') || null;

  // URL에서 채널 ID가 변경되면 채널 설정
  useEffect(() => {
    if (channelId && currentWorkspace) {
      const channels = useWorkspaceStore.getState().channels[currentWorkspace.id] || [];
      const channel = channels.find((c) => c.id === channelId);
      if (channel && channel.id !== currentChannel?.id) {
        setCurrentChannel(channel);
      }
    } else if (!channelId && currentChannel) {
      setCurrentChannel(null);
    }
  }, [channelId, currentWorkspace, currentChannel, setCurrentChannel]);

  // 클라이언트 마운트 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 사용자가 없으면 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (isMounted && !user) {
      navigate('/login');
    }
  }, [isMounted, user, navigate]);

  // 서버 사이드에서는 항상 동일한 구조 렌더링
  if (!isMounted) {
    return (
      <div className="flex h-full min-w-0 w-full max-w-full">
        <div className="flex-shrink-0" style={{ width: '300px' }} />
        <div className="flex-1 min-w-0 flex items-center justify-center bg-muted/30">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">채널을 선택하거나 새로 만들어주세요</p>
          </div>
        </div>
      </div>
    );
  }

  // 클라이언트에서 사용자가 없으면 null
  if (!user) {
    return null;
  }

  // 모바일 레이아웃
  if (isMobile) {
    return (
      <>
        {/* 모바일: 사이드바만 전체 화면으로 표시 */}
        <div className="flex h-full min-w-0 w-full max-w-full">
          <WorkspaceSidebar className="flex-shrink-0 w-full" />
        </div>

        {/* 모바일: 채널 Sheet */}
        {channelId && currentChannel && (
          <Sheet open={!!channelId} onOpenChange={(open) => !open && navigate('/workspace')}>
            <SheetContent
              side="right"
              className="w-full sm:w-full p-0 flex flex-col"
              fullscreen
              hideClose={true}
            >
              <SheetTitle className="sr-only">{currentChannel.name}</SheetTitle>
              <SheetDescription className="sr-only">채널</SheetDescription>
              <ChannelView channel={currentChannel} />
            </SheetContent>
          </Sheet>
        )}
      </>
    );
  }

  // 데스크톱 레이아웃
  const channelArea = currentChannel ? (
    <ChannelView channel={currentChannel} />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <div className="text-center text-muted-foreground">
        <p className="text-lg">채널을 선택하거나 새로 만들어주세요</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full min-w-0">
      <WorkspaceSidebar className="flex-shrink-0 w-[300px]" />
      <main className="flex-1 min-w-0 h-full w-full flex">
        {channelArea}
      </main>
    </div>
  );
};

