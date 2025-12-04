/**
 * 스레드 뷰 컴포넌트
 * 메시지에 대한 답글 스레드 표시
 */

import React, { useEffect, useState } from 'react';
import { ThreadService } from '../services/threadService';
import { ChannelMessageComponent } from './ChannelMessage';
import type { Thread } from '../types/thread.types';
import { Button } from '@/shared/components/ui/button';
import { X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/features/auth/store/authStore';

export interface ThreadViewProps {
  threadId: string;
  channelId: string;
  workspaceId: string;
  parentMessageId: string;
  onClose: () => void;
  currentUserId: string;
}

export const ThreadView: React.FC<ThreadViewProps> = ({
  threadId,
  channelId,
  workspaceId,
  parentMessageId,
  onClose,
  currentUserId,
}) => {
  const { user } = useAuthStore();
  const [thread, setThread] = useState<Thread | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const unsubscribe = ThreadService.subscribeToThread(
      threadId,
      workspaceId,
      channelId,
      (updatedThread) => {
        setThread(updatedThread);
      },
      (error) => {
        console.error('Error subscribing to thread:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [threadId, workspaceId, channelId]);

  const handleResolve = async () => {
    if (!user?.uid || !thread) return;

    setIsResolving(true);
    try {
      await ThreadService.resolveThread(threadId, workspaceId, channelId, user.uid);
    } catch (error) {
      console.error('Failed to resolve thread:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleUnresolve = async () => {
    if (!thread || !user?.uid) return;

    setIsResolving(true);
    try {
      await ThreadService.unresolveThread(threadId, workspaceId, channelId);
    } catch (error) {
      console.error('Failed to unresolve thread:', error);
    } finally {
      setIsResolving(false);
    }
  };

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">스레드를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* 스레드 헤더 */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">스레드</h3>
            {thread.isResolved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                해결됨
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!thread.isResolved ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResolve}
                disabled={isResolving}
                className="text-xs"
              >
                해결 표시
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnresolve}
                disabled={isResolving}
                className="text-xs"
              >
                해결 취소
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {thread.messages.length}개의 답글
        </div>
      </div>

      {/* 스레드 메시지 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="space-y-4">
          {thread.messages.map((message, index) => (
            <div key={message.id} className={cn(index === 0 && 'pb-4 border-b')}>
              <ChannelMessageComponent
                message={message}
                currentUserId={currentUserId}
                showAvatar={true}
                isFirstInGroup={true}
                isLastInGroup={true}
                channelMembers={thread.participants}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

