/**
 * 멘션 드롭다운 컴포넌트
 */

import React from 'react';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { getUserDisplayName, getUserInitial } from '@/shared/utils/userUtils';
import type { UserProfile } from '@/features/auth/types';

interface UserWithUid extends UserProfile {
  uid: string;
  displayName?: string;
  name?: string;
}

interface MentionDropdownProps {
  users: UserWithUid[];
  selectedIndex: number;
  onSelect: (user: UserWithUid) => void;
  mentionListRef?: React.RefObject<HTMLDivElement | null>;
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  users,
  selectedIndex,
  onSelect,
  mentionListRef,
}) => {
  if (users.length === 0) return null;

  return (
    <div
      ref={mentionListRef}
      className="absolute z-50 bottom-full mb-1 w-64 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="max-h-60 overflow-y-auto">
        {users.map((user, index) => (
          <div
            key={user.uid}
            onClick={() => onSelect(user)}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs bg-muted">
                {getUserInitial(user, '?')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {getUserDisplayName(user, null) || '알 수 없음'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

