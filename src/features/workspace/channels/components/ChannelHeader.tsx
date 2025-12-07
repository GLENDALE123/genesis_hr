/**
 * 채널 헤더 컴포넌트
 * 슬랙/디스코드 스타일의 채널 헤더 (멤버 목록, 설정, 핀 고정 등)
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Lock,
  Search,
  Menu,
  Star,
} from 'lucide-react';
import type { Channel } from '../types/channel.types';
import { ChannelSearchDialog } from './ChannelSearchDialog';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import { useAuthStore } from '@/features/auth/store/authStore';
import { BookmarkService } from '../../messages';

export interface ChannelHeaderProps {
  channel: Channel;
  onChannelUpdate?: (channel: Channel) => void;
  onRightSidebarToggle?: () => void;
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channel,
  onChannelUpdate,
  onRightSidebarToggle,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user } = useAuthStore();
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 북마크 상태 구독
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = BookmarkService.subscribeToUserBookmarks(
      user.uid,
      (bookmarks) => {
        const bookmarkedSet = new Set(bookmarks.map((b) => b.channelId));
        setIsBookmarked(bookmarkedSet.has(channel.id));
      },
      (error) => {
        console.error('Error subscribing to bookmarks:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid, channel.id]);

  // 북마크 토글 핸들러
  const handleBookmarkToggle = async () => {
    if (!user?.uid) return;

    try {
      if (isBookmarked) {
        await BookmarkService.removeBookmark(channel.id, user.uid);
      } else {
        await BookmarkService.addBookmark(channel.id, channel.workspaceId, user.uid);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  // 키보드 단축키
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.SEARCH,
      action: () => setIsSearchOpen(true),
    },
  ]);

  return (
    <>
      <div className="flex-shrink-0 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 p-0 hover:bg-transparent"
                  onClick={handleBookmarkToggle}
                  title={isBookmarked ? '즐겨찾기 제거' : '즐겨찾기 추가'}
                >
                  <Star
                    className={isBookmarked ? 'h-4 w-4 text-yellow-500 fill-yellow-500' : 'h-4 w-4 text-muted-foreground'}
                  />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-semibold truncate">{channel.name}</h2>
                  {channel.type === 'private' && (
                    <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                </div>
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

            {/* 햄버거 버튼 - 우측 사이드바 열기 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="채널 메뉴"
              onClick={onRightSidebarToggle}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 검색 다이얼로그 */}
      <ChannelSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        channelId={channel.id}
        workspaceId={channel.workspaceId}
      />


    </>
  );
};

