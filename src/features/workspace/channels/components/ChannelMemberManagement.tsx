/**
 * 채널 멤버 관리 컴포넌트
 * 멤버 추가 및 제거 기능 제공
 */

import React, { useState, useEffect } from 'react';
import { ChannelService } from '../services/channelService';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Search, UserPlus, X, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Channel } from '../types/channel.types';

export interface ChannelMemberManagementProps {
  channel: Channel;
  onMemberUpdate?: () => void;
}

export const ChannelMemberManagement: React.FC<ChannelMemberManagementProps> = ({
  channel,
  onMemberUpdate,
}) => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  // 모든 사용자 및 채널 멤버 로드
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const users = await getAllUsersWithAuthInfo();
        setAllUsers(users);
        
        // 채널 멤버 정보 가져오기
        const members = users.filter((u) => channel.members.includes(u.uid || ''));
        setChannelMembers(members);
      } catch (error) {
        console.error('Failed to load users:', error);
        toast.error('사용자 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [channel.members]);

  // 초대 가능한 사용자 필터링
  const availableUsers = allUsers.filter(
    (user) => !channel.members.includes(user.uid || '')
  );

  const filteredAvailableUsers = availableUsers.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query)
    );
  });

  const filteredChannelMembers = channelMembers.filter((member) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.displayName?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.name?.toLowerCase().includes(query)
    );
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleInvite = async () => {
    if (selectedUserIds.size === 0) return;

    setIsInviting(true);
    try {
      await ChannelService.updateChannelMembers(
        {
          channelId: channel.id,
          memberIds: Array.from(selectedUserIds),
          action: 'add',
        },
        channel.workspaceId
      );
      setSelectedUserIds(new Set());
      toast.success(`${selectedUserIds.size}명의 멤버가 추가되었습니다.`);
      onMemberUpdate?.();
    } catch (error) {
      console.error('Failed to invite users:', error);
      toast.error('멤버 초대에 실패했습니다.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (memberUid === channel.createdBy) {
      toast.error('채널 생성자는 제거할 수 없습니다.');
      return;
    }

    setIsRemoving(memberUid);
    try {
      await ChannelService.updateChannelMembers(
        {
          channelId: channel.id,
          memberIds: [memberUid],
          action: 'remove',
        },
        channel.workspaceId
      );
      toast.success('멤버가 제거되었습니다.');
      onMemberUpdate?.();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('멤버 제거에 실패했습니다.');
    } finally {
      setIsRemoving(null);
    }
  };

  const canManageMembers = channel.permissions?.canManageMembers || false;

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="멤버 검색..."
          className="pl-9"
        />
      </div>

      {/* 채널 멤버 목록 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">채널 멤버 ({channelMembers.length})</h3>
        </div>
        <ScrollArea className="max-h-64">
          <div className="space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                로딩 중...
              </div>
            ) : filteredChannelMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다.' : '멤버가 없습니다.'}
              </div>
            ) : (
              filteredChannelMembers.map((member) => {
                const isCreator = member.uid === channel.createdBy;
                const canRemove = canManageMembers && !isCreator && member.uid !== user?.uid;
                const isRemovingMember = isRemoving === member.uid;

                return (
                  <div
                    key={member.uid}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.photoURL} alt={member.displayName} />
                      <AvatarFallback>
                        {getUserInitial(member, member.displayName?.charAt(0) || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {member.displayName || member.name || '사용자'}
                        </p>
                        {isCreator && (
                          <span className="text-xs text-muted-foreground">(생성자)</span>
                        )}
                      </div>
                      {member.position && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.position}
                        </p>
                      )}
                    </div>
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member.uid || '')}
                        disabled={isRemovingMember}
                        title="멤버 제거"
                      >
                        {isRemovingMember ? (
                          <X className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 멤버 추가 섹션 */}
      {canManageMembers && (
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">멤버 추가</h3>
          </div>
          <ScrollArea className="max-h-48">
            <div className="space-y-1">
              {filteredAvailableUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? '검색 결과가 없습니다.' : '추가할 수 있는 사용자가 없습니다.'}
                </div>
              ) : (
                filteredAvailableUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user.uid || '');
                  return (
                    <button
                      key={user.uid}
                      onClick={() => handleToggleUser(user.uid || '')}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors',
                        isSelected && 'bg-accent'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>
                          {getUserInitial(user, user.displayName?.charAt(0) || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.displayName || user.name || '사용자'}
                        </p>
                        {user.position && (
                          <p className="text-xs text-muted-foreground truncate">
                            {user.position}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <X className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
          {selectedUserIds.size > 0 && (
            <Button
              onClick={handleInvite}
              disabled={isInviting}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isInviting
                ? '초대 중...'
                : `${selectedUserIds.size}명 초대`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
