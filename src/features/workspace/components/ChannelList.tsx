/**
 * 채널 목록 컴포넌트
 * 디스코드/슬랙 스타일의 채널 목록
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../store/workspaceStore';
import { ChannelService } from '../services/channelService';
import { UnreadMessageService } from '../services/unreadMessageService';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/ui/button';
import { Hash, Lock, Plus, Settings, Star } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { BookmarkService } from '../services/bookmarkService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
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
import type { ChannelType, ChannelCategory } from '../types/channel.types';

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

  const workspaceChannels = channels[workspaceId] || [];

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

  // 채널을 카테고리별로 그룹화
  const groupedChannels = React.useMemo(() => {
    const groups: Record<string, typeof workspaceChannels> = {
      general: [],
      department: [],
      project: [],
      topic: [],
    };

    workspaceChannels.forEach((channel) => {
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
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {/* 일반 채널 */}
        {groupedChannels.general.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              일반
            </div>
            <div className="space-y-0.5">
              {groupedChannels.general.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'flex items-center gap-2',
                    currentChannel?.id === channel.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {channel.type === 'private' ? (
                    <Lock className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Hash className="h-4 w-4 flex-shrink-0" />
                  )}
                  {bookmarkedChannels.has(channel.id) && (
                    <Star className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500 fill-yellow-500" />
                  )}
                  <span className="truncate flex-1">{channel.name}</span>
                  {unreadCounts[channel.id] > 0 && (
                    <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center">
                      {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                    </span>
                  )}
                </button>
              ))}
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
              {groupedChannels.department.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'flex items-center gap-2',
                    currentChannel?.id === channel.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {channel.type === 'private' ? (
                    <Lock className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Hash className="h-4 w-4 flex-shrink-0" />
                  )}
                  {bookmarkedChannels.has(channel.id) && (
                    <Star className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500 fill-yellow-500" />
                  )}
                  <span className="truncate flex-1">{channel.name}</span>
                  {unreadCounts[channel.id] > 0 && (
                    <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center">
                      {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                    </span>
                  )}
                </button>
              ))}
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
              {groupedChannels.project.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'flex items-center gap-2',
                    currentChannel?.id === channel.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {channel.type === 'private' ? (
                    <Lock className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Hash className="h-4 w-4 flex-shrink-0" />
                  )}
                  {bookmarkedChannels.has(channel.id) && (
                    <Star className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500 fill-yellow-500" />
                  )}
                  <span className="truncate flex-1">{channel.name}</span>
                  {unreadCounts[channel.id] > 0 && (
                    <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center">
                      {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                    </span>
                  )}
                </button>
              ))}
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
              {groupedChannels.topic.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'flex items-center gap-2',
                    currentChannel?.id === channel.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {channel.type === 'private' ? (
                    <Lock className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Hash className="h-4 w-4 flex-shrink-0" />
                  )}
                  {bookmarkedChannels.has(channel.id) && (
                    <Star className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500 fill-yellow-500" />
                  )}
                  <span className="truncate flex-1">{channel.name}</span>
                  {unreadCounts[channel.id] > 0 && (
                    <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold min-w-[20px] text-center">
                      {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                    </span>
                  )}
                </button>
              ))}
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
    </div>
  );
};

