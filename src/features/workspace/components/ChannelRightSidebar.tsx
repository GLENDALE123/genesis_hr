/**
 * 채널 우측 사이드바
 * 채널 관련 기능들을 모아놓은 사이드바
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PinnedMessageService } from '../services/pinnedMessageService';
import { BookmarkService } from '../services/bookmarkService';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Hash,
  Lock,
  Users,
  Settings,
  Pin,
  Bell,
  BellOff,
  Info,
  X,
  Star,
  UserPlus,
  Keyboard,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { getUserInitial } from '@/shared/utils/userUtils';
import type { Channel } from '../types/channel.types';
import type { PinnedMessage } from '../types/message.types';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { ChannelNotificationSettings } from './ChannelNotificationSettings';
import { ChannelInviteDialog } from './ChannelInviteDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { ChannelSettingsDialog } from './ChannelSettingsDialog';

export interface ChannelRightSidebarProps {
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelUpdate?: (channel: Channel) => void;
  onChannelDelete?: (channelId: string) => void;
}

export const ChannelRightSidebar: React.FC<ChannelRightSidebarProps> = ({
  channel,
  open,
  onOpenChange,
  onChannelUpdate,
  onChannelDelete,
}) => {
  const { user } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // 고정 메시지 구독
  useEffect(() => {
    if (!channel.workspaceId || !open) return;

    const unsubscribe = PinnedMessageService.subscribeToChannelPinnedMessages(
      channel.id,
      channel.workspaceId,
      (pinned) => {
        setPinnedMessages(pinned);
      },
      (error) => {
        console.error('Error subscribing to pinned messages:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [channel.id, channel.workspaceId, open]);

  // 채널 멤버 로드
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const users = await getAllUsersWithAuthInfo();
        const members = users.filter((u) => channel.members.includes(u.uid));
        setChannelMembers(members);
      } catch (error) {
        console.error('Failed to load channel members:', error);
      }
    };

    if (open) {
      loadMembers();
    }
  }, [channel.members, open]);

  // 북마크 상태 확인
  useEffect(() => {
    if (!user?.uid || !open) return;

    const checkBookmark = async () => {
      try {
        const bookmark = await BookmarkService.getBookmark(channel.id, user.uid);
        setIsBookmarked(!!bookmark);
      } catch (error) {
        console.error('Failed to check bookmark:', error);
      }
    };

    checkBookmark();
  }, [channel.id, user?.uid, open]);

  const handleToggleBookmark = async () => {
    if (!user?.uid) return;

    try {
      if (isBookmarked) {
        await BookmarkService.removeBookmark(channel.id, user.uid);
        setIsBookmarked(false);
      } else {
        await BookmarkService.addBookmark(channel.id, channel.workspaceId, user.uid);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleUnpinMessage = async (pinnedMessageId: string) => {
    if (!channel.workspaceId) return;
    
    try {
      await PinnedMessageService.unpinMessage(pinnedMessageId, channel.id, channel.workspaceId);
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="h-full flex flex-col bg-background">
        {/* 헤더 */}
        <div className="px-3 py-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              {channel.type === 'private' ? (
                <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              ) : channel.viewType === 'board' ? (
                <div className="h-3.5 w-3.5 flex-shrink-0 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-current rounded-sm" />
                </div>
              ) : (
                <Hash className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <h3 className="text-xs font-semibold truncate">{channel.name}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
            <div className="p-2 space-y-3">
              {/* 채널 정보 */}
              <div className="space-y-1.5">
                {channel.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{channel.description}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs justify-start"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Info className="h-3.5 w-3.5 mr-1.5" />
                  채널 정보
                </Button>
              </div>

              {/* 빠른 액션 */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">빠른 액션</h3>
                <div className="grid grid-cols-1 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPinnedOpen(true)}
                    className="w-full h-7 text-xs justify-start"
                  >
                    <Pin className="h-3.5 w-3.5 mr-1.5" />
                    고정 메시지
                    {pinnedMessages.length > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] min-w-[18px] text-center">
                        {pinnedMessages.length}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsInviteOpen(true)}
                    className="w-full h-7 text-xs justify-start"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    멤버 초대
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleBookmark}
                    className={cn(
                      'w-full h-7 text-xs justify-start',
                      isBookmarked && 'bg-yellow-50 dark:bg-yellow-950'
                    )}
                  >
                    <Star
                      className={cn(
                        'h-3.5 w-3.5 mr-1.5',
                        isBookmarked && 'fill-yellow-500 text-yellow-500'
                      )}
                    />
                    {isBookmarked ? '북마크 해제' : '북마크 추가'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsNotificationSettingsOpen(true)}
                    className="w-full h-7 text-xs justify-start"
                  >
                    <Bell className="h-3.5 w-3.5 mr-1.5" />
                    알림 설정
                  </Button>
                </div>
              </div>

              {/* 멤버 목록 */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  멤버 ({channelMembers.length})
                </h3>
                <div className="space-y-0.5">
                  {channelMembers.slice(0, 8).map((member) => (
                    <div
                      key={member.uid}
                      className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={member.photoURL} alt={member.displayName} />
                        <AvatarFallback className="text-[10px]">
                          {getUserInitial(member, member.displayName?.charAt(0) || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {member.displayName || member.name || '사용자'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {channelMembers.length > 8 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        // 멤버 목록 전체 보기 (나중에 구현)
                      }}
                    >
                      {channelMembers.length - 8}명 더 보기
                    </Button>
                  )}
                </div>
              </div>

              {/* 설정 */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">설정</h3>
                <div className="space-y-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs justify-start"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    채널 설정
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs justify-start"
                    onClick={() => setIsShortcutsOpen(true)}
                  >
                    <Keyboard className="h-3.5 w-3.5 mr-1.5" />
                    키보드 단축키
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

      {/* 다이얼로그들 */}
      <ChannelSettingsDialog
        channel={channel}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onChannelUpdate={onChannelUpdate}
        onChannelDelete={onChannelDelete}
      />

      <Dialog open={isPinnedOpen} onOpenChange={setIsPinnedOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>고정 메시지</DialogTitle>
            <DialogDescription>
              이 채널에 고정된 메시지 목록입니다.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-3">
              {pinnedMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  고정된 메시지가 없습니다.
                </p>
              ) : (
                pinnedMessages.map((pinned) => (
                  <div
                    key={pinned.id}
                    className="p-3 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>
                            {getUserInitial(
                              { displayName: pinned.message.sender.displayName },
                              pinned.message.sender.displayName?.charAt(0) || '?'
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {pinned.message.sender.displayName}
                        </span>
                      </div>
                      {user?.uid === pinned.pinnedBy && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleUnpinMessage(pinned.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{pinned.message.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(pinned.pinnedAt).toLocaleString('ko-KR')}에 고정됨
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ChannelInviteDialog
        channel={channel}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
      />

      <ChannelNotificationSettings
        channel={channel}
        open={isNotificationSettingsOpen}
        onOpenChange={setIsNotificationSettingsOpen}
      />

      <KeyboardShortcutsDialog
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />
    </>
  );
};

