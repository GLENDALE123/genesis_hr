/**
 * 개별 채팅방 페이지 클라이언트 컴포넌트
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/features/chat/components/ChatSidebar';
import { ChatView } from '@/features/chat/components/ChatView';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ChatService } from '@/features/chat/services/chatService';
import { getUserInfo } from '@/features/chat/components/UserList';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { Input } from '@/shared/components/ui/input';
import { Search } from 'lucide-react';

export interface ChatRoomPageClientProps {
  chatRoomId: string;
}

export const ChatRoomPageClient: React.FC<ChatRoomPageClientProps> = ({
  chatRoomId,
}) => {
  const router = useRouter();
  const { user, userProfile } = useAuthStore();
  const { currentChatRoom, setCurrentChatRoom, temporaryRooms } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [usersLoaded, setUsersLoaded] = useState(false);

  // 사용자 정보 로드 확인
  useEffect(() => {
    const checkUsersLoaded = () => {
      const checkInterval = setInterval(() => {
        // UserList의 globalUsersRef를 확인
        setUsersLoaded(true); // 일단 true로 설정
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        setUsersLoaded(true);
      }, 2000);
    };

    checkUsersLoaded();
  }, []);

  // 채팅방 로드
  useEffect(() => {
    if (!chatRoomId || !user?.uid) return;

    // 임시 채팅방인 경우
    if (chatRoomId.startsWith('temp_')) {
      const tempRoom = temporaryRooms.find((r) => r.id === chatRoomId);
      if (tempRoom) {
        setCurrentChatRoom({
          id: tempRoom.id,
          type: tempRoom.type,
          participants: tempRoom.participants,
          createdBy: user.uid,
          createdAt: tempRoom.createdAt,
          updatedAt: tempRoom.createdAt,
        });
      }
      return;
    }

    // Firestore에서 채팅방 로드
    const loadChatRoom = async () => {
      try {
        const room = await ChatService.getChatRoom(chatRoomId);
        if (room) {
          setCurrentChatRoom(room);
        } else {
          // 채팅방이 없으면 메인 페이지로 리다이렉트
          router.push('/chat');
        }
      } catch (error) {
        console.error('Failed to load chat room:', error);
        router.push('/chat');
      }
    };

    loadChatRoom();
  }, [chatRoomId, user?.uid, router, setCurrentChatRoom, temporaryRooms]);

  // 채팅방 이름 가져오기
  const getRoomName = () => {
    if (!currentChatRoom || !user?.uid) return '채팅방';

    if (currentChatRoom.type === 'direct') {
      const otherParticipant = currentChatRoom.participants.find(
        (p) => p.uid !== user.uid
      );
      if (!otherParticipant) return '채팅방';

      if (usersLoaded) {
        const userInfo = getUserInfo(otherParticipant.uid);
        if (userInfo?.displayName) {
          return userInfo.displayName;
        }
      }

      return otherParticipant.displayName || '사용자';
    }

    return currentChatRoom.name || '그룹 채팅';
  };

  if (!currentChatRoom) {
    return (
      <div className="flex h-full">
        <ChatSidebar className="flex-shrink-0" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 w-full max-w-full">
      <ChatSidebar className="flex-shrink-0" />
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <div className="flex-shrink-0 border-b bg-background px-4 py-3 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-lg font-semibold truncate flex-1 min-w-0">
              {getRoomName()}
            </h1>
            {/* 검색바 */}
            <div className="relative flex-shrink-0" style={{ width: '200px' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="메시지 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
        {/* 채팅 영역 */}
        <div className="flex-1 min-w-0">
          <ChatView
            chatRoomId={chatRoomId}
            searchQuery={searchQuery}
            currentUserId={user?.uid || ''}
          />
        </div>
      </div>
    </div>
  );
};

