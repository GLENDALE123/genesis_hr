/**
 * 사용자 프로필 카드 컴포넌트
 * 슬랙/디스코드 스타일의 사용자 프로필 호버 카드
 */

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/shared/components/ui/hover-card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { MessageSquare, Mail, Phone, MapPin, Calendar, Edit } from 'lucide-react';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import { UserStatusService } from '@/features/chat/services/userStatusService';
import { cn } from '@/shared/lib/utils';
import { UserCustomStatusDialog } from './UserCustomStatusDialog';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { User } from 'firebase/auth';

export interface UserProfileCardProps {
  user: {
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    position?: string;
    department?: string;
    phone?: string;
    location?: string;
  };
  children: React.ReactNode;
  showStatus?: boolean;
  allowEdit?: boolean; // 자신의 프로필인 경우 편집 허용
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user,
  children,
  showStatus = true,
  allowEdit = false,
}) => {
  const { user: currentUser } = useAuthStore();
  const [userStatus, setUserStatus] = React.useState<{
    status: 'online' | 'offline' | 'away' | 'busy';
    customStatus?: string;
  } | null>(null);
  const [isCustomStatusDialogOpen, setIsCustomStatusDialogOpen] = React.useState(false);
  const isOwnProfile = allowEdit && currentUser?.uid === user.uid;

  React.useEffect(() => {
    if (!showStatus) return;

    const loadStatus = async () => {
      try {
        const status = await UserStatusService.getUserStatus(user.uid);
        if (status) {
          setUserStatus({
            status: status.status as 'online' | 'offline' | 'away' | 'busy',
            customStatus: undefined, // UserStatusData에 customStatus가 없을 수 있음
          });
        }
      } catch (error) {
        console.error('Failed to load user status:', error);
      }
    };

    loadStatus();

    // 실시간 상태 구독
    const unsubscribe = UserStatusService.subscribeToUserStatus(
      user.uid,
      (status) => {
        if (status) {
          setUserStatus({
            status: status.status as 'online' | 'offline' | 'away' | 'busy',
            customStatus: undefined,
          });
        }
      },
      (error) => {
        console.error('Error subscribing to user status:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user.uid, showStatus]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'online':
        return '온라인';
      case 'away':
        return '자리비움';
      case 'busy':
        return '방해 금지';
      default:
        return '오프라인';
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.photoURL} alt={user.displayName} />
              <AvatarFallback>
                {getUserInitial(user, user.displayName?.charAt(0) || '?')}
              </AvatarFallback>
            </Avatar>
            {showStatus && userStatus && (
              <div
                className={cn(
                  'absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background',
                  getStatusColor(userStatus.status)
                )}
                title={getStatusText(userStatus.status)}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">
                {user.displayName || '사용자'}
              </h4>
              {userStatus && (
                <Badge variant="outline" className="text-xs">
                  {getStatusText(userStatus.status)}
                </Badge>
              )}
            </div>

            {user.position && (
              <p className="text-xs text-muted-foreground mb-2">{user.position}</p>
            )}

            {userStatus?.customStatus && (
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs text-muted-foreground italic flex-1">
                  "{userStatus.customStatus}"
                </p>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomStatusDialogOpen(true);
                    }}
                    title="상태 메시지 편집"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            {isOwnProfile && !userStatus?.customStatus && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCustomStatusDialogOpen(true);
                }}
              >
                <Edit className="h-3 w-3 mr-1" />
                상태 메시지 추가
              </Button>
            )}

            <div className="space-y-1 mt-3">
              {user.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.location && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.department && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{user.department}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1">
                <MessageSquare className="h-3 w-3 mr-1" />
                메시지
              </Button>
            </div>
          </div>
        </div>
      </HoverCardContent>

      {/* 커스텀 상태 메시지 다이얼로그 */}
      {isOwnProfile && (
        <UserCustomStatusDialog
          open={isCustomStatusDialogOpen}
          onOpenChange={setIsCustomStatusDialogOpen}
        />
      )}
    </HoverCard>
  );
};

