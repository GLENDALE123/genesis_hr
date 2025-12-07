/**
 * 채널 멤버 초대 다이얼로그
 */

import React, { useState, useEffect } from 'react';
import { ChannelService } from '../services/channelService';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Check, Search, UserPlus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import type { Channel } from '../types/channel.types';

export interface ChannelInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  onInviteComplete?: () => void;
}

export const ChannelInviteDialog: React.FC<ChannelInviteDialogProps> = ({
  open,
  onOpenChange,
  channel,
  onInviteComplete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedUserIds(new Set());
      return;
    }

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const users = await getAllUsersWithAuthInfo();
        // 이미 채널 멤버인 사용자 제외
        const availableUsers = users.filter(
          (user) => !channel.members.includes(user.uid || '')
        );
        setAllUsers(availableUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [open, channel.members]);

  const filteredUsers = allUsers.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query)
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
      await ChannelService.updateChannelMembers({
        channelId: channel.id,
        memberIds: Array.from(selectedUserIds),
        action: 'add',
      }, channel.workspaceId);
      onInviteComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to invite users:', error);
      alert('멤버 초대에 실패했습니다.');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>멤버 초대</DialogTitle>
          <DialogDescription>
            {channel.name} 채널에 멤버를 초대하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="사용자 검색..."
              className="pl-9"
            />
          </div>

          {/* 사용자 목록 */}
          <div className="max-h-64 overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                로딩 중...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? '검색 결과가 없습니다.' : '초대할 수 있는 사용자가 없습니다.'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user.uid || '');
                  return (
                    <button
                      key={user.uid}
                      onClick={() => handleToggleUser(user.uid || '')}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors',
                        isSelected && 'bg-accent'
                      )}
                    >
                      <Avatar className="h-10 w-10">
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
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 선택된 사용자 수 */}
          {selectedUserIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedUserIds.size}명 선택됨
            </p>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={handleInvite}
              disabled={selectedUserIds.size === 0 || isInviting}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isInviting ? '초대 중...' : '초대'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

