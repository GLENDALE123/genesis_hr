/**
 * 채널 목록 컴포넌트
 * 디스코드/슬랙 스타일의 채널 목록
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ChannelService } from '../services/channelService';
import { UnreadMessageService, BookmarkService } from '../../messages';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Lock, Plus, Settings, Star, LayoutGrid } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import { DraggableChannelItem } from './DraggableChannelItem';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { DEPARTMENT_OPTIONS } from '@/shared/constants/departments';
import type { Channel, ChannelType, ChannelCategory } from '../types/channel.types';

export interface ChannelListProps {
  workspaceId: string;
}

export const ChannelList: React.FC<ChannelListProps> = ({ workspaceId }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentChannel,
    channels,
    setCurrentChannel,
    setChannels,
  } = useWorkspaceStore();
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('public');
  const [newChannelCategory, setNewChannelCategory] = useState<ChannelCategory | 'none'>('none');
  const [newChannelViewType, setNewChannelViewType] = useState<'message' | 'board'>('message');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [bookmarkedChannels, setBookmarkedChannels] = useState<Set<string>>(new Set());
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingFolderCreation, setPendingFolderCreation] = useState<{
    activeChannel: Channel;
    overChannel: Channel;
  } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Channel | null>(null);
  const [folderToRename, setFolderToRename] = useState<Channel | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState('');
  const [folderCreateChannelId, setFolderCreateChannelId] = useState<string | null>(null);

  const workspaceChannels = channels[workspaceId] || [];

  // 드래그 앤 드롭 센서 설정 (일정 거리 이상 이동해야 드래그 시작)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 이동해야 드래그 시작
      },
    })
  );

  // 폴더를 기본적으로 열린 상태로 설정
  useEffect(() => {
    const folders = workspaceChannels.filter((channel) => channel.isFolder);
    if (folders.length > 0) {
      const folderIds = new Set(folders.map((folder) => folder.id));
      setOpenFolders((prev) => {
        // 기존에 열린 폴더와 새로 발견된 폴더를 병합
        const merged = new Set(prev);
        folderIds.forEach((id) => merged.add(id));
        return merged;
      });
    }
  }, [workspaceChannels]);

  // 북마크된 채널 구독
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = BookmarkService.subscribeToUserBookmarks(
      user.uid,
      (bookmarks) => {
        const bookmarkedSet = new Set(bookmarks.map((b) => b.channelId));
        setBookmarkedChannels(bookmarkedSet);
      },
      (error) => {
        console.error('Error subscribing to bookmarks:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  // 읽지 않은 메시지 수 구독
  useEffect(() => {
    if (!user?.uid || workspaceChannels.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    workspaceChannels.forEach((channel) => {
      const unsubscribe = UnreadMessageService.subscribeToChannelUnreadCount(
        channel.id,
        workspaceId,
        user.uid,
        (count) => {
          setUnreadCounts((prev) => ({
            ...prev,
            [channel.id]: count,
          }));
        },
        (error) => {
          console.error(`Error subscribing to unread count for channel ${channel.id}:`, error);
        }
      );
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user?.uid, workspaceChannels, workspaceId]);

  // 채널을 카테고리별로 그룹화 (폴더 안에 있는 채널은 제외)
  const groupedChannels = React.useMemo(() => {
    const groups: Record<string, typeof workspaceChannels> = {
      general: [],
      department: [],
      project: [],
      topic: [],
    };

    workspaceChannels.forEach((channel) => {
      // 폴더 안에 있는 채널은 제외
      if (channel.parentFolderId) {
        return;
      }
      
      const category = channel.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(channel);
    });

    return groups;
  }, [workspaceChannels]);

  const handleCreateChannel = async () => {
    if (!user?.uid || !newChannelName.trim()) return;

    try {
      const channelId = await ChannelService.createChannel(
        {
          workspaceId,
          name: newChannelName.trim(),
          description: newChannelDescription.trim() || undefined,
          type: newChannelType,
          category: newChannelCategory === 'none' ? undefined : newChannelCategory,
          viewType: newChannelViewType,
        },
        user.uid
      );

      // 폴더 안에 생성하는 경우
      if (folderCreateChannelId) {
        await ChannelService.moveChannelToFolder(channelId, folderCreateChannelId, workspaceId);
        setOpenFolders((prev) => new Set(prev).add(folderCreateChannelId!));
        setFolderCreateChannelId(null);
      }

      // 생성된 채널로 전환
      const newChannel = await ChannelService.getChannel(channelId, workspaceId);
      if (newChannel) {
        setCurrentChannel(newChannel);
        navigate(`/workspace?channel=${channelId}`);
      }

      setIsCreateChannelOpen(false);
      setNewChannelName('');
      setNewChannelDescription('');
      setNewChannelType('public');
      setNewChannelCategory('none');
      setNewChannelViewType('message');
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const handleChannelClick = (channelId: string) => {
    // workspaceId와 channelId를 모두 확인하여 정확한 채널 찾기
    const channel = workspaceChannels.find((c) => c.id === channelId && c.workspaceId === workspaceId);
    if (channel) {
      setCurrentChannel(channel);
      navigate(`/workspace?channel=${channelId}`, { replace: true });
    }
  };

  const handleBookmarkToggle = async (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation(); // 채널 클릭 이벤트 방지
    if (!user?.uid) return;

    try {
      const isBookmarked = bookmarkedChannels.has(channelId);
      if (isBookmarked) {
        await BookmarkService.removeBookmark(channelId, user.uid);
      } else {
        await BookmarkService.addBookmark(channelId, workspaceId, user.uid);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !user?.uid) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeChannel = workspaceChannels.find((c) => c.id === activeId);
    const overChannel = workspaceChannels.find((c) => c.id === overId);

    if (!activeChannel || !overChannel) return;

    // 폴더는 드래그 불가
    if (activeChannel.isFolder) return;

    // 같은 채널 위에 드롭하면 폴더 생성 확인 다이얼로그 표시
    if (!overChannel.isFolder) {
      setPendingFolderCreation({
        activeChannel,
        overChannel,
      });
    } else {
      // 폴더 위에 드롭하면 폴더 안으로 이동
      try {
        await ChannelService.moveChannelToFolder(activeId, overId, workspaceId);
        setOpenFolders((prev) => new Set(prev).add(overId));
      } catch (error) {
        console.error('Failed to move channel to folder:', error);
      }
    }
  };

  const handleFolderToggle = (folderId: string) => {
    setOpenFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleConfirmFolderCreation = async () => {
    if (!pendingFolderCreation || !user?.uid) return;

    const { activeChannel, overChannel } = pendingFolderCreation;
    const activeId = activeChannel.id;
    const overId = overChannel.id;

    try {
      // 폴더 생성
      const folderId = await ChannelService.createFolder(
        workspaceId,
        `${activeChannel.name}, ${overChannel.name}`,
        user.uid
      );

      // 두 채널을 폴더 안으로 이동
      await ChannelService.moveChannelToFolder(activeId, folderId, workspaceId);
      await ChannelService.moveChannelToFolder(overId, folderId, workspaceId);

      // 폴더 열기
      setOpenFolders((prev) => new Set(prev).add(folderId));
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setPendingFolderCreation(null);
    }
  };

  const handleFolderCreateChannel = (folderId: string) => {
    setFolderCreateChannelId(folderId);
    setIsCreateChannelOpen(true);
  };

  const handleFolderRename = (folderId: string) => {
    const folder = workspaceChannels.find((c) => c.id === folderId);
    if (folder) {
      setFolderToRename(folder);
      setFolderRenameValue(folder.name);
    }
  };

  const handleConfirmFolderRename = async () => {
    if (!folderToRename || !folderRenameValue.trim()) return;

    try {
      await ChannelService.renameFolder(
        folderToRename.id,
        workspaceId,
        folderRenameValue.trim()
      );
      setFolderToRename(null);
      setFolderRenameValue('');
    } catch (error) {
      console.error('Failed to rename folder:', error);
    }
  };

  const handleFolderDelete = (folderId: string) => {
    const folder = workspaceChannels.find((c) => c.id === folderId);
    if (folder) {
      setFolderToDelete(folder);
    }
  };

  const handleConfirmFolderDelete = async () => {
    if (!folderToDelete) return;

    try {
      await ChannelService.deleteFolder(folderToDelete.id, workspaceId);
      setFolderToDelete(null);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 채널 헤더 */}
      <div className="flex-shrink-0 px-2 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
            채널
          </h3>
          <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 채널 생성</DialogTitle>
                <DialogDescription>
                  워크스페이스에 새로운 채널을 생성하세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="channel-name">채널 이름</Label>
                  <Input
                    id="channel-name"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="예: 일반, 개발팀, 프로젝트-a"
                  />
                </div>
                <div>
                  <Label htmlFor="channel-description">설명 (선택사항)</Label>
                  <Textarea
                    id="channel-description"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="채널에 대한 설명을 입력하세요"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="channel-type">채널 타입</Label>
                  <Select
                    value={newChannelType}
                    onValueChange={(value) => setNewChannelType(value as ChannelType)}
                  >
                    <SelectTrigger id="channel-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">공개 채널</SelectItem>
                      <SelectItem value="private">비공개 채널</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="channel-category">카테고리 (선택사항)</Label>
                  <Select
                    value={newChannelCategory}
                    onValueChange={(value) => setNewChannelCategory(value as ChannelCategory | 'none')}
                  >
                    <SelectTrigger id="channel-category">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      <SelectItem value="department">부서</SelectItem>
                      <SelectItem value="project">프로젝트</SelectItem>
                      <SelectItem value="topic">주제</SelectItem>
                      <SelectItem value="general">일반</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="channel-view-type">뷰 타입</Label>
                  <Select
                    value={newChannelViewType}
                    onValueChange={(value) => setNewChannelViewType(value as 'message' | 'board')}
                  >
                    <SelectTrigger id="channel-view-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">메시지 뷰</SelectItem>
                      <SelectItem value="board">보드뷰</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    뷰 타입은 채널 생성 후 변경할 수 없습니다.
                  </p>
                </div>
                <Button onClick={handleCreateChannel} className="w-full">
                  생성
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 채널 목록 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          {/* 일반 채널 */}
          {groupedChannels.general.length > 0 && (
            <div className="mb-4">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                일반
              </div>
              <div className="space-y-0.5">
                  {groupedChannels.general.map((channel) => {
                    const isBookmarked = bookmarkedChannels.has(channel.id);
                    const isFolderOpen = openFolders.has(channel.id);
                    const folderChannels = channel.isFolder
                      ? workspaceChannels.filter((c) => c.parentFolderId === channel.id)
                      : [];

                    return (
                      <React.Fragment key={channel.id}>
                        <DraggableChannelItem
                          channel={channel}
                          isBookmarked={isBookmarked}
                          isActive={currentChannel?.id === channel.id}
                          unreadCount={unreadCounts[channel.id] || 0}
                          isFolderOpen={isFolderOpen}
                          onChannelClick={handleChannelClick}
                          onBookmarkToggle={handleBookmarkToggle}
                          onFolderToggle={handleFolderToggle}
                          onFolderCreateChannel={handleFolderCreateChannel}
                          onFolderRename={handleFolderRename}
                          onFolderDelete={handleFolderDelete}
                        />
                        {channel.isFolder && isFolderOpen && folderChannels.length > 0 && (
                          <div className="ml-4 space-y-0.5">
                            {folderChannels.map((folderChannel) => {
                              const isFolderBookmarked = bookmarkedChannels.has(folderChannel.id);
                              return (
                                <DraggableChannelItem
                                  key={folderChannel.id}
                                  channel={folderChannel}
                                  isBookmarked={isFolderBookmarked}
                                  isActive={currentChannel?.id === folderChannel.id}
                                  unreadCount={unreadCounts[folderChannel.id] || 0}
                                  onChannelClick={handleChannelClick}
                                  onBookmarkToggle={handleBookmarkToggle}
                                />
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
            </div>
          )}

        {/* 부서 채널 */}
        {groupedChannels.department.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              부서
            </div>
            <div className="space-y-0.5">
              {groupedChannels.department.map((channel) => {
                const isBookmarked = bookmarkedChannels.has(channel.id);
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel.id)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'flex items-center gap-2 group',
                      currentChannel?.id === channel.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <div
                      className="h-4 w-4 flex-shrink-0 flex items-center justify-center relative"
                      onClick={(e) => handleBookmarkToggle(e, channel.id)}
                    >
                      {isBookmarked ? (
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Star className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="truncate">{channel.name}</span>
                      {channel.type === 'private' && (
                        <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      )}
                      {channel.viewType === 'board' && (
                        <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {unreadCounts[channel.id] > 0 && (
                      <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center">
                        {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 프로젝트 채널 */}
        {groupedChannels.project.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              프로젝트
            </div>
            <div className="space-y-0.5">
              {groupedChannels.project.map((channel) => {
                const isBookmarked = bookmarkedChannels.has(channel.id);
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel.id)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'flex items-center gap-2 group',
                      currentChannel?.id === channel.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <div
                      className="h-4 w-4 flex-shrink-0 flex items-center justify-center relative"
                      onClick={(e) => handleBookmarkToggle(e, channel.id)}
                    >
                      {isBookmarked ? (
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Star className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="truncate">{channel.name}</span>
                      {channel.type === 'private' && (
                        <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      )}
                      {channel.viewType === 'board' && (
                        <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {unreadCounts[channel.id] > 0 && (
                      <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center">
                        {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 주제 채널 */}
        {groupedChannels.topic.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              주제
            </div>
            <div className="space-y-0.5">
              {groupedChannels.topic.map((channel) => {
                const isBookmarked = bookmarkedChannels.has(channel.id);
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel.id)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'flex items-center gap-2 group',
                      currentChannel?.id === channel.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <div
                      className="h-4 w-4 flex-shrink-0 flex items-center justify-center relative"
                      onClick={(e) => handleBookmarkToggle(e, channel.id)}
                    >
                      {isBookmarked ? (
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Star className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="truncate">{channel.name}</span>
                      {channel.type === 'private' && (
                        <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      )}
                      {channel.viewType === 'board' && (
                        <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {unreadCounts[channel.id] > 0 && (
                      <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center">
                        {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

          {/* 채널이 없을 때 */}
          {workspaceChannels.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              채널이 없습니다.
              <br />
              새 채널을 생성해보세요.
            </div>
          )}
        </div>
        <DragOverlay>
          {activeId ? (
            (() => {
              const activeChannel = workspaceChannels.find((c) => c.id === activeId);
              if (!activeChannel) return null;
              return (
                <div className="w-full text-left px-2 py-1.5 rounded text-sm bg-accent text-accent-foreground flex items-center gap-2 opacity-90">
                  <div className="h-4 w-4 flex-shrink-0" />
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="truncate">{activeChannel.name}</span>
                  </div>
                </div>
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 폴더 생성 확인 다이얼로그 */}
      <AlertDialog
        open={pendingFolderCreation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFolderCreation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>폴더 생성</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingFolderCreation?.activeChannel.name}"과 "{pendingFolderCreation?.overChannel.name}" 채널을 폴더로 묶으시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFolderCreation}>
              생성
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 폴더 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={folderToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFolderToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>폴더를 정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              폴더를 삭제해도 해당 폴더 내 채널들은 사라지지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFolderDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 폴더 이름 변경 다이얼로그 */}
      <Dialog
        open={folderToRename !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFolderToRename(null);
            setFolderRenameValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>폴더 이름 변경</DialogTitle>
            <DialogDescription>
              폴더 이름을 변경하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-rename">폴더 이름</Label>
              <Input
                id="folder-rename"
                value={folderRenameValue}
                onChange={(e) => setFolderRenameValue(e.target.value)}
                placeholder="폴더 이름을 입력하세요"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && folderRenameValue.trim()) {
                    handleConfirmFolderRename();
                  }
                }}
              />
            </div>
            <Button onClick={handleConfirmFolderRename} className="w-full" disabled={!folderRenameValue.trim()}>
              변경
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

