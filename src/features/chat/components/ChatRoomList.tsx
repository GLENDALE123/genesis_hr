/**
 * 채팅방 목록 컴포넌트
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChatService } from '../services/chatService';
import { formatChatDate } from '../utils/dateFormat';
import { getUserInfo } from './UserList';
import { getUserDisplayName, getUserInitial } from '@/shared/utils/userUtils';
import type { ChatRoom } from '../types/chat.types';

export interface ChatRoomListProps {
  onRoomClick?: (roomId: string) => void;
  onCreateRoomClick?: () => void;
}

export const ChatRoomList: React.FC<ChatRoomListProps> = ({
  onRoomClick,
  onCreateRoomClick,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { chatRooms, isLoadingRooms, setChatRooms, setIsLoadingRooms, unreadCounts } =
    useChatStore();
  const [usersLoaded, setUsersLoaded] = useState(false);

  // 사용자 정보 로드 확인
  useEffect(() => {
    const checkUsersLoaded = () => {
      // UserList의 globalUsersRef를 확인
      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined') {
          // globalUsersRef는 ref이므로 직접 접근 불가
          // 대신 UserList가 로드될 때까지 대기
          setUsersLoaded(true); // 일단 true로 설정 (나중에 개선 가능)
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        setUsersLoaded(true);
      }, 2000);
    };

    checkUsersLoaded();
  }, []);

  // 채팅방 목록 구독
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoadingRooms(true);
    const unsubscribe = ChatService.subscribeToChatRooms(
      user.uid,
      (rooms) => {
        setChatRooms(rooms);
        setIsLoadingRooms(false);
      },
      (error) => {
        console.error('Failed to load chat rooms:', error);
        setIsLoadingRooms(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid, setChatRooms, setIsLoadingRooms]);

  // 읽지 않은 메시지 수 계산
  const getUnreadCount = (room: ChatRoom): number => {
    if (!user?.uid) return 0;
    return unreadCounts[room.id] || 0;
  };

  // 채팅방 이름 가져오기
  const getChatRoomName = (room: ChatRoom): string => {
    if (!user?.uid) return '채팅방';

    if (room.type === 'direct') {
      const otherParticipant = room.participants.find((p) => p.uid !== user.uid);
      if (!otherParticipant) return '채팅방';

      if (usersLoaded) {
        const userInfo = getUserInfo(otherParticipant.uid);
        if (userInfo?.displayName) {
          return userInfo.displayName;
        }
      }

      return otherParticipant.displayName || '사용자';
    }

    // 그룹 채팅
    return room.name || '그룹 채팅';
  };

  // 정렬된 채팅방 목록 (최근 메시지 순)
  const sortedRooms = useMemo(() => {
    return [...chatRooms].sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.updatedAt;
      const bTime = b.lastMessage?.timestamp || b.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [chatRooms, usersLoaded]);

  // 채팅방 클릭 핸들러
  const handleRoomClick = (roomId: string) => {
    if (onRoomClick) {
      onRoomClick(roomId);
    } else {
      router.push(`/chat?room=${roomId}`);
    }
  };

  if (isLoadingRooms) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (sortedRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm text-center">첫 메시지를 보내 채팅을 시작하세요</p>
        {onCreateRoomClick && (
          <Button
            onClick={onCreateRoomClick}
            className="mt-4"
            size="sm"
            variant="outline"
          >
            <Plus className="mr-2 size-4" />
            새 채팅방 만들기
          </Button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {sortedRooms.map((room) => {
          const isActive = searchParams?.get('room') === room.id;
          const unreadCount = getUnreadCount(room);
          const roomName = getChatRoomName(room);

          // 1:1 채팅의 경우 상대방 아바타
          const otherParticipant =
            room.type === 'direct'
              ? room.participants.find((p) => p.uid !== user?.uid)
              : null;

          const avatarUrl = otherParticipant
            ? getUserInfo(otherParticipant.uid)?.photoURL || otherParticipant.photoURL
            : undefined;
          const avatarName = otherParticipant
            ? getUserInfo(otherParticipant.uid)?.displayName || otherParticipant.displayName
            : roomName;

          return (
            <div
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
              `}
            >
              <div className="relative flex-shrink-0">
                {room.type === 'direct' ? (
                  <Avatar className="size-12">
                    <AvatarImage src={avatarUrl} alt={avatarName} />
                    <AvatarFallback>
                      {getUserInitial(
                        { displayName: avatarName },
                        getUserInitial(otherParticipant || { displayName: roomName }, 'U')
                      )}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="size-12">
                    <AvatarFallback>
                      {roomName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 size-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-medium truncate ${isActive ? 'text-primary-foreground' : ''}`}
                  >
                    {roomName}
                  </span>
                  {room.lastMessage && (
                    <span
                      className={`text-xs whitespace-nowrap ${
                        isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {formatChatDate(room.lastMessage.timestamp)}
                    </span>
                  )}
                </div>
                {room.lastMessage && (
                  <p
                    className={`text-sm truncate mt-1 ${
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}
                  >
                    {room.lastMessage.text}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

