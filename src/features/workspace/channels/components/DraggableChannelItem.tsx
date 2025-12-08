/**
 * 드래그 가능한 채널 아이템 컴포넌트
 */

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Lock, Star, LayoutGrid, Briefcase, ChevronRight, Folder, MoreHorizontal, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Channel } from '../types/channel.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export interface DraggableChannelItemProps {
  channel: Channel;
  isBookmarked: boolean;
  isActive: boolean;
  unreadCount: number;
  isFolderOpen?: boolean;
  onChannelClick: (channelId: string) => void;
  onBookmarkToggle: (e: React.MouseEvent, channelId: string) => void;
  onFolderToggle?: (folderId: string) => void;
  onFolderCreateChannel?: (folderId: string) => void;
  onFolderRename?: (folderId: string) => void;
  onFolderDelete?: (folderId: string) => void;
}

export const DraggableChannelItem: React.FC<DraggableChannelItemProps> = ({
  channel,
  isBookmarked,
  isActive,
  unreadCount,
  isFolderOpen = false,
  onChannelClick,
  onBookmarkToggle,
  onFolderToggle,
  onFolderCreateChannel,
  onFolderRename,
  onFolderDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    isDragging,
  } = useDraggable({
    id: channel.id,
    disabled: channel.isFolder === true, // 폴더는 드래그 불가
  });

  const {
    setNodeRef: setDropNodeRef,
    isOver,
  } = useDroppable({
    id: channel.id,
  });

  // 드래그와 드롭 ref를 하나로 합치기
  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  const style = {
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isOver && !channel.isFolder ? 'rgba(var(--accent), 0.1)' : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    // 드래그 중이면 클릭 무시
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    if (channel.isFolder && onFolderToggle) {
      e.stopPropagation();
      onFolderToggle(channel.id);
    } else {
      onChannelClick(channel.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(!channel.isFolder ? listeners : {})}
      className={cn(
        'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'flex items-center gap-2 group',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground',
        isDragging && 'cursor-grabbing opacity-50',
        !channel.isFolder && 'cursor-grab'
      )}
      onClick={handleClick}
    >
      {/* 폴더 토글 버튼 */}
      {channel.isFolder && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFolderToggle?.(channel.id);
          }}
          className="h-4 w-4 flex-shrink-0 flex items-center justify-center"
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 transition-transform',
              isFolderOpen && 'rotate-90'
            )}
          />
        </button>
      )}

      {/* 즐겨찾기 아이콘 (폴더가 아닐 때만 표시) */}
      {!channel.isFolder && (
        <div
          className="h-4 w-4 flex-shrink-0 flex items-center justify-center relative"
          onClick={(e) => {
            e.stopPropagation();
            onBookmarkToggle(e, channel.id);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          {isBookmarked ? (
            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
          ) : (
            <Star className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity text-yellow-500" />
          )}
        </div>
      )}

      {/* 채널 이름 및 아이콘 */}
      <div
        className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
        onClick={handleClick}
      >
        {channel.isFolder ? (
          <Folder className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        ) : null}
        <span className="truncate">{channel.name}</span>
        {channel.type === 'private' && !channel.isFolder && (
          <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
        {channel.viewType === 'board' && !channel.isFolder && (
          <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
        {channel.viewType === 'project' && !channel.isFolder && (
          <Briefcase className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
      </div>

      {/* 읽지 않은 메시지 수 */}
      {unreadCount > 0 && !channel.isFolder && (
        <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* 폴더 메뉴 (마우스 오버 시 표시) */}
      {channel.isFolder && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-4 w-4 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onFolderCreateChannel?.(channel.id);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              이 폴더에 채널 생성하기
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onFolderRename?.(channel.id);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              폴더 이름 변경
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onFolderDelete?.(channel.id);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              폴더 삭제하기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

