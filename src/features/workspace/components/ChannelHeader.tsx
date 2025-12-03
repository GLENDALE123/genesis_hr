/**
 * 채널 헤더 컴포넌트
 * 슬랙/디스코드 스타일의 채널 헤더 (멤버 목록, 설정, 핀 고정 등)
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChannelService } from '../services/channelService';
import { PinnedMessageService } from '../services/pinnedMessageService';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  Hash,
  Lock,
  Users,
  Settings,
  Pin,
  Bell,
  BellOff,
  Search,
  Info,
  X,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { getUserInitial } from '@/shared/utils/userUtils';
import type { Channel } from '../types/channel.types';
import type { PinnedMessage } from '../types/message.types';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { ChannelSearchDialog } from './ChannelSearchDialog';
import { ChannelNotificationSettings } from './ChannelNotificationSettings';
import { ChannelInviteDialog } from './ChannelInviteDialog';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { ReportRequestDialog } from './ReportRequestDialog';
import { ApprovalManagementPanel } from './ApprovalManagementPanel';
import { BookmarkService } from '../services/bookmarkService';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { Star, UserPlus, Keyboard, CreditCard, List } from 'lucide-react';

export interface ChannelHeaderProps {
  channel: Channel;
  onChannelUpdate?: (channel: Channel) => void;
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  onChannelUpdate,
}) => {
  const { user } = useAuthStore();
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [isNotificationMuted, setIsNotificationMuted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isReportRequestOpen, setIsReportRequestOpen] = useState(false);
  const [isApprovalManagementOpen, setIsApprovalManagementOpen] = useState(false);

  // 키보드 단축키
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.SEARCH,
      action: () => setIsSearchOpen(true),
    },
  ]);

  // 고정 메시지 구독
  useEffect(() => {
    const unsubscribe = PinnedMessageService.subscribeToChannelPinnedMessages(
      channel.id,
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
  }, [channel.id]);

  // 채널 멤버 로드
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const allUsers = await getAllUsersWithAuthInfo();
        const members = allUsers.filter((u) => channel.members.includes(u.uid || ''));
        setChannelMembers(members);
      } catch (error) {
        console.error('Failed to load channel members:', error);
      }
    };

    if (isMembersOpen) {
      loadMembers();
    }
  }, [channel.members, isMembersOpen]);

  // 북마크 상태 확인
  useEffect(() => {
    if (!user?.uid) return;

    const checkBookmark = async () => {
      try {
        const bookmark = await BookmarkService.getBookmark(channel.id, user.uid);
        setIsBookmarked(!!bookmark);
      } catch (error) {
        console.error('Failed to check bookmark:', error);
      }
    };

    checkBookmark();
  }, [channel.id, user?.uid]);

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

  const handlePinMessage = async (messageId: string) => {
    if (!user?.uid) return;
    // 메시지 정보를 가져와서 고정 (실제 구현 시 메시지 데이터 필요)
    // 일단은 placeholder
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      await PinnedMessageService.unpinMessage(messageId, channel.id);
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  return (
    <>
      <div className="flex-shrink-0 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {channel.type === 'private' ? (
              <Lock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            ) : (
              <Hash className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold truncate">{channel.name}</h2>
              {channel.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {channel.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* 검색 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="검색"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* 북마크 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={isBookmarked ? '북마크 해제' : '북마크 추가'}
              onClick={handleToggleBookmark}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  isBookmarked && 'fill-yellow-500 text-yellow-500'
                )}
              />
            </Button>

            {/* 알림 설정 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsNotificationSettingsOpen(true)}
              title="알림 설정"
            >
              {isNotificationMuted ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
            </Button>

            {/* 고정 메시지 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsPinnedOpen(true)}
              title="고정 메시지"
            >
              <Pin className="h-4 w-4" />
              {pinnedMessages.length > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {pinnedMessages.length}
                </span>
              )}
            </Button>

            {/* 결제 요청 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="보고/승인">
                  <CreditCard className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsReportRequestOpen(true)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  보고 요청
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsApprovalManagementOpen(true)}>
                  <List className="h-4 w-4 mr-2" />
                  보고/승인 관리
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 멤버 초대 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsInviteOpen(true)}
              title="멤버 초대"
            >
              <UserPlus className="h-4 w-4" />
            </Button>

            {/* 멤버 목록 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMembersOpen(true)}
              title="멤버"
            >
              <Users className="h-4 w-4" />
            </Button>

            {/* 채널 설정 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="설정">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                  <Info className="h-4 w-4 mr-2" />
                  채널 정보
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsPinnedOpen(true)}>
                  <Pin className="h-4 w-4 mr-2" />
                  고정 메시지 ({pinnedMessages.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsNotificationSettingsOpen(true)}>
                  <Bell className="h-4 w-4 mr-2" />
                  알림 설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsShortcutsOpen(true)}>
                  <Keyboard className="h-4 w-4 mr-2" />
                  키보드 단축키
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 멤버 목록 Sheet */}
      <Sheet open={isMembersOpen} onOpenChange={setIsMembersOpen}>
        <SheetContent side="right" className="w-full sm:w-96">
          <SheetHeader>
            <SheetTitle>멤버 ({channelMembers.length})</SheetTitle>
            <SheetDescription>
              {channel.name} 채널의 멤버 목록입니다.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {channelMembers.map((member) => (
              <div
                key={member.uid}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.photoURL} alt={member.displayName} />
                  <AvatarFallback>
                    {getUserInitial(member, member.displayName?.charAt(0) || '?')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.displayName || member.name || '사용자'}
                  </p>
                  {member.position && (
                    <p className="text-xs text-muted-foreground truncate">
                      {member.position}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* 고정 메시지 Sheet */}
      <Sheet open={isPinnedOpen} onOpenChange={setIsPinnedOpen}>
        <SheetContent side="right" className="w-full sm:w-96">
          <SheetHeader>
            <SheetTitle>고정 메시지 ({pinnedMessages.length})</SheetTitle>
            <SheetDescription>
              이 채널에 고정된 메시지입니다.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {pinnedMessages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                고정된 메시지가 없습니다.
              </div>
            ) : (
              pinnedMessages.map((pinned) => (
                <div
                  key={pinned.id}
                  className="p-4 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={pinned.message.sender.photoURL}
                          alt={pinned.message.sender.displayName}
                        />
                        <AvatarFallback className="text-xs">
                          {getUserInitial(
                            pinned.message.sender,
                            pinned.message.sender.displayName.charAt(0)
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
                        onClick={() => handleUnpinMessage(pinned.messageId)}
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
        </SheetContent>
      </Sheet>

      {/* 채널 설정 Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>채널 정보</DialogTitle>
            <DialogDescription>
              {channel.name} 채널의 정보를 확인하고 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>채널 이름</Label>
              <Input value={channel.name} disabled />
            </div>
            <div>
              <Label>토픽</Label>
              <Input value={channel.topic || ''} disabled placeholder="토픽이 설정되지 않았습니다" />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea value={channel.description || ''} disabled rows={3} />
            </div>
            <div>
              <Label>타입</Label>
              <Input
                value={channel.type === 'public' ? '공개 채널' : '비공개 채널'}
                disabled
              />
            </div>
            <div>
              <Label>멤버 수</Label>
              <Input value={`${channel.members.length}명`} disabled />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 검색 다이얼로그 */}
      <ChannelSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        channelId={channel.id}
        workspaceId={channel.workspaceId}
      />

      {/* 알림 설정 다이얼로그 */}
      <ChannelNotificationSettings
        open={isNotificationSettingsOpen}
        onOpenChange={setIsNotificationSettingsOpen}
        channel={channel}
      />

      {/* 멤버 초대 다이얼로그 */}
      <ChannelInviteDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        channel={channel}
        onInviteComplete={() => {
          // 멤버 목록 새로고침
          const loadMembers = async () => {
            try {
              const allUsers = await getAllUsersWithAuthInfo();
              const members = allUsers.filter((u) => channel.members.includes(u.uid || ''));
              setChannelMembers(members);
            } catch (error) {
              console.error('Failed to reload members:', error);
            }
          };
          loadMembers();
        }}
      />

      {/* 키보드 단축키 다이얼로그 */}
      <KeyboardShortcutsDialog
        open={isShortcutsOpen}
        onOpenChange={setIsShortcutsOpen}
      />

      {/* 보고 요청 다이얼로그 */}
      <ReportRequestDialog
        open={isReportRequestOpen}
        onOpenChange={setIsReportRequestOpen}
        channelId={channel.id}
      />

      {/* 보고/승인 관리 패널 */}
      <ApprovalManagementPanel
        open={isApprovalManagementOpen}
        onOpenChange={setIsApprovalManagementOpen}
      />
    </>
  );
};

