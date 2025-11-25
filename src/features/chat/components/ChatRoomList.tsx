/**
 * 채팅방 목록 컴포넌트
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';
import { Plus, Search, LogOut } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChatService } from '../services/chatService';
import { formatChatDate } from '../utils/dateFormat';
import { getUserInfo } from './UserList';
import { getUserDisplayName, getUserInitial } from '@/shared/utils/userUtils';
import type { ChatRoom } from '../types/chat.types';
import { Input } from '@/shared/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
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

export interface ChatRoomListProps {
  onRoomClick?: (roomId: string) => void;
  onCreateRoomClick?: () => void;
}

export const ChatRoomList: React.FC<ChatRoomListProps> = ({
  onRoomClick,
  onCreateRoomClick,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const {
    chatRooms,
    isLoadingRooms,
    setChatRooms,
    setIsLoadingRooms,
    unreadCounts,
    removeChatRoom: removeRoomFromStore,
  } = useChatStore();
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leavingRoomId, setLeavingRoomId] = useState<string | null>(null);
  const [roomToLeave, setRoomToLeave] = useState<ChatRoom | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 사용자 정보 로드 확인 (기본 정보로 먼저 표시 가능하도록 변경)
  useEffect(() => {
    // 사용자 정보가 로드되었는지 확인하지만, 기본 정보로 먼저 표시
    setUsersLoaded(true); // 기본 정보(room.participants)로 먼저 표시
  }, []);

  // 채팅방 목록 구독
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoadingRooms(true);
    const unsubscribe = ChatService.subscribeToChatRooms(
      user.uid,
      (rooms) => {
        if (!isMountedRef.current) return;
        setChatRooms(rooms);
        setIsLoadingRooms(false);
      },
      (error) => {
        if (!isMountedRef.current) return;
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

  // 채팅방 이름 가져오기 (기본 정보 우선, 사용자 정보는 나중에 업데이트)
  const getChatRoomName = (room: ChatRoom): string => {
    if (!user?.uid) return '채팅방';

    if (room.type === 'direct') {
      const otherParticipant = room.participants.find((p) => p.uid !== user.uid);
      if (!otherParticipant) return '채팅방';

      // 먼저 기본 정보(room.participants) 사용
      let displayName = otherParticipant.displayName || '사용자';
      
      // 사용자 정보가 로드되었으면 더 상세한 정보로 업데이트 (선택적)
      if (usersLoaded) {
        const userInfo = getUserInfo(otherParticipant.uid);
        if (userInfo?.displayName) {
          displayName = userInfo.displayName;
        }
      }

      return displayName;
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
      navigate(`/chat?room=${roomId}`);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    if (!user?.uid) return;
    try {
      setLeavingRoomId(roomId);
      await ChatService.leaveChatRoom(roomId, user.uid);
      removeRoomFromStore(roomId);

      if (searchParams?.get('room') === roomId) {
        navigate('/chat');
      }
    } catch (error) {
      console.error('Failed to leave chat room:', error);
    } finally {
      setLeavingRoomId((current) => (current === roomId ? null : current));
    }
  };

  const openLeaveDialog = (room: ChatRoom) => {
    setRoomToLeave(room);
  };

  const handleConfirmLeave = async () => {
    if (!roomToLeave) return;
    await handleLeaveRoom(roomToLeave.id);
    setRoomToLeave(null);
  };

  const handleCloseLeaveDialog = (open: boolean) => {
    if (!open) {
      setRoomToLeave(null);
    }
  };

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sortedRooms;
    }

    return sortedRooms.filter((room) => {
      const roomName = getChatRoomName(room).toLowerCase();
      const lastMessageText = room.lastMessage?.text?.toLowerCase() || '';
      return roomName.includes(query) || lastMessageText.includes(query);
    });
  }, [sortedRooms, searchQuery, usersLoaded]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 border-b p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="채팅방 검색..."
            className="pl-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoadingRooms ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Spinner className="size-6" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <p className="text-sm text-center">
                {searchQuery.trim()
                  ? '검색 결과가 없습니다.'
                  : '첫 메시지를 보내 채팅을 시작하세요.'}
              </p>
              {!searchQuery.trim() && onCreateRoomClick && (
                <Button onClick={onCreateRoomClick} className="mt-2" size="sm" variant="outline">
                  <Plus className="mr-2 size-4" />
                  새 채팅방 만들기
                </Button>
              )}
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = searchParams?.get('room') === room.id;
              const unreadCount = getUnreadCount(room);
              const roomName = getChatRoomName(room);

              // 1:1 채팅의 경우 상대방 아바타 (기본 정보 우선 사용)
              const otherParticipant =
                room.type === 'direct'
                  ? room.participants.find((p) => p.uid !== user?.uid)
                  : null;

              // 기본 정보(room.participants)를 먼저 사용, 사용자 정보는 선택적으로 업데이트
              let avatarUrl: string | undefined;
              let avatarName: string;
              
              if (otherParticipant) {
                avatarUrl = otherParticipant.photoURL || undefined;
                avatarName = otherParticipant.displayName || '사용자';
                
                // 사용자 정보가 로드되었으면 더 상세한 정보로 업데이트 (선택적)
                if (usersLoaded) {
                  const userInfo = getUserInfo(otherParticipant.uid);
                  if (userInfo?.photoURL) {
                    avatarUrl = userInfo.photoURL;
                  }
                  if (userInfo?.displayName) {
                    avatarName = userInfo.displayName;
                  }
                }
              } else {
                avatarName = roomName;
              }

              return (
                <ContextMenu key={room.id}>
                  <ContextMenuTrigger>
                    <div
                      onClick={() => handleRoomClick(room.id)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                        ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                      `}
                    >
                      <div className="relative flex-shrink-0">
                    {room.type === 'direct' ? (
                      <Avatar
                        className="[width:var(--avatar-size,3rem)] [height:var(--avatar-size,3rem)]"
                        style={{ '--avatar-size': '3rem' } as React.CSSProperties}
                      >
                        <AvatarImage src={avatarUrl} alt={avatarName} />
                        <AvatarFallback className="flex items-center justify-center font-semibold text-muted-foreground [font-size:calc(var(--avatar-size,3rem)*0.35)]">
                          {getUserInitial(
                            { displayName: avatarName },
                            getUserInitial(otherParticipant || { displayName: roomName }, 'U')
                          )}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar
                        className="[width:var(--avatar-size,3rem)] [height:var(--avatar-size,3rem)]"
                        style={{ '--avatar-size': '3rem' } as React.CSSProperties}
                      >
                        <AvatarFallback className="flex items-center justify-center font-semibold text-muted-foreground [font-size:calc(var(--avatar-size,3rem)*0.35)]">
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
                        className={`mt-1 truncate text-sm ${
                          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}
                      >
                        {room.lastMessage.text}
                      </p>
                    )}
                  </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={leavingRoomId === room.id}
                      onClick={() => openLeaveDialog(room)}
                    >
                      <LogOut className="mr-2 size-4 text-destructive" />
                      {leavingRoomId === room.id ? '나가는 중...' : '채팅방 나가기'}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })
          )}
      </div>
      </ScrollArea>
      <AlertDialog open={!!roomToLeave} onOpenChange={handleCloseLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>채팅방 나가기</AlertDialogTitle>
            <AlertDialogDescription>
              {roomToLeave
                ? `'${getChatRoomName(roomToLeave)}' 채팅방을 나가시겠습니까?`
                : '선택한 채팅방을 나가시겠습니까?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!leavingRoomId}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              disabled={!!leavingRoomId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leavingRoomId ? '나가는 중...' : '나가기'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

