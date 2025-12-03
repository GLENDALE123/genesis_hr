/**
 * 채널 뷰 컴포넌트
 * 채널의 메시지를 표시하는 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { ThreadService } from '../services/threadService';
import { UnreadMessageService } from '../services/unreadMessageService';
import { ChatView } from '@/features/chat/components/ChatView';
import { ThreadView } from './ThreadView';
import { ChannelHeader } from './ChannelHeader';
import { useAuthStore } from '@/features/auth/store/authStore';
import { cn } from '@/shared/lib/utils';
import type { Channel } from '../types/channel.types';
import type { Thread } from '../types/thread.types';

export interface ChannelViewProps {
  channel: Channel;
}

export const ChannelView: React.FC<ChannelViewProps> = ({ channel }) => {
  const { user } = useAuthStore();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  const handleThreadClick = async (messageId: string) => {
    try {
      const thread = await ThreadService.getMessageThread(messageId);
      if (thread) {
        setSelectedThreadId(thread.id);
        setSelectedThread(thread);
      } else {
        // 스레드가 없으면 새로 생성 (나중에 구현)
        // 일단은 스레드가 있는 경우만 열기
      }
    } catch (error) {
      console.error('Failed to get thread:', error);
    }
  };

  const handleCloseThread = () => {
    setSelectedThreadId(null);
    setSelectedThread(null);
  };

  // 채널 열람 시 읽지 않은 메시지 수 초기화
  useEffect(() => {
    if (!user?.uid || !channel) return;

    // 채널을 열었을 때 읽음 처리
    const markAsRead = async () => {
      try {
        await UnreadMessageService.markChannelAsRead(channel.id, user.uid);
      } catch (error) {
        console.error('Failed to mark channel as read:', error);
      }
    };

    markAsRead();
  }, [channel?.id, user?.uid]);

  if (!user?.uid) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">로그인이 필요합니다</div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      {/* 메인 채널 뷰 */}
      <div className={cn('flex-1 min-w-0 w-full flex flex-col', selectedThreadId && 'border-r')}>
        {/* 채널 헤더 */}
        <ChannelHeader channel={channel} />
        {/* 메시지 뷰 */}
        <div className="flex-1 min-h-0">
          <ChatView
            chatRoomId={channel.id}
            currentUserId={user.uid}
            hideInput={false}
            channelId={channel.id}
            workspaceId={channel.workspaceId}
            onThreadClick={handleThreadClick}
          />
        </div>
      </div>

      {/* 스레드 뷰 */}
      {selectedThreadId && selectedThread && (
        <div className="w-96 flex-shrink-0">
          <ThreadView
            threadId={selectedThreadId}
            channelId={channel.id}
            workspaceId={channel.workspaceId}
            parentMessageId={selectedThread.parentMessageId}
            onClose={handleCloseThread}
            currentUserId={user.uid}
          />
        </div>
      )}
    </div>
  );
};
