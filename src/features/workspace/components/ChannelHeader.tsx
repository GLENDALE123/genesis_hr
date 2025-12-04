/**
 * 채널 헤더 컴포넌트
 * 슬랙/디스코드 스타일의 채널 헤더 (멤버 목록, 설정, 핀 고정 등)
 */

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Hash,
  Lock,
  Search,
  Menu,
} from 'lucide-react';
import type { Channel } from '../types/channel.types';
import { ChannelSearchDialog } from './ChannelSearchDialog';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

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
              {channel.type === 'private' ? (
                <Lock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              ) : channel.viewType === 'board' ? (
                <div className="h-5 w-5 flex-shrink-0 text-muted-foreground flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-current rounded-sm" />
                </div>
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

