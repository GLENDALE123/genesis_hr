/**
 * 채팅 뷰 컴포넌트
 * 메시지 목록 표시 및 실시간 구독
 */

'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Button } from '@/shared/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { ChatService } from '../services/chatService';
import { ChatMessageComponent } from './ChatMessage';
import { ChatInput } from '@/shared/components/common/ChatInput';
import { useAuthStore } from '@/features/auth/store/authStore';
import { SCROLL_CONFIG } from '../constants';
import type { ChatMessage } from '../types/chat.types';

export interface ChatViewProps {
  chatRoomId: string;
  searchQuery?: string;
  currentUserId: string;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chatRoomId,
  searchQuery = '',
  currentUserId,
}) => {
  const router = useRouter();
  const { user, userProfile } = useAuthStore();
  const {
    messages,
    setMessages,
    addMessage,
    currentChatRoom,
    setCurrentChatRoom,
    temporaryRooms,
  } = useChatStore();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const roomMessages = useMemo(() => {
    if (!chatRoomId || chatRoomId === 'new') return [];
    return messages[chatRoomId] || [];
  }, [messages, chatRoomId]);

  // 검색 결과 하이라이트할 메시지 ID
  const highlightedMessageIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const query = searchQuery.toLowerCase();
    return new Set(
      roomMessages
        .filter((msg) => msg.text.toLowerCase().includes(query))
        .map((msg) => msg.id)
    );
  }, [roomMessages, searchQuery]);

  // 메시지 구독
  useEffect(() => {
    if (!chatRoomId || chatRoomId.startsWith('temp_') || !isMounted) {
      setMessages(chatRoomId, []);
      return;
    }

    const unsubscribe = ChatService.subscribeToMessages(
      chatRoomId,
      (newMessages) => {
        setMessages(chatRoomId, newMessages);
      },
      (error) => {
        console.error('Failed to subscribe to messages:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [chatRoomId, isMounted, setMessages]);

  // 컴포넌트 마운트 확인
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 스크롤 위치 확인
  useEffect(() => {
    const checkScrollPosition = () => {
      if (!scrollAreaRef.current) return;

      const element = scrollAreaRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;

      const atBottom =
        scrollHeight - scrollTop - clientHeight < SCROLL_CONFIG.SCROLL_THRESHOLD;
      setIsAtBottom(atBottom);
      setShowScrollButton(!atBottom && roomMessages.length > 0);
    };

    const scrollElement = scrollAreaRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', checkScrollPosition);
      }
    };
  }, [roomMessages]);

  // 새 메시지 도착 시 스크롤
  useEffect(() => {
    if (isAtBottom && roomMessages.length > 0) {
      scrollToBottom();
    } else if (roomMessages.length > 0) {
      setShowScrollButton(true);
    }
  }, [roomMessages, isAtBottom]);

  // 검색 결과로 스크롤
  useEffect(() => {
    if (searchQuery.trim() && highlightedMessageIds.size > 0) {
      const firstHighlighted = roomMessages.find((msg) =>
        highlightedMessageIds.has(msg.id)
      );
      if (firstHighlighted) {
        scrollToMessage(firstHighlighted.id);
      }
    }
  }, [searchQuery, highlightedMessageIds, roomMessages]);

  // 커스텀 이벤트 리스너 (검색 결과 클릭 시 스크롤)
  useEffect(() => {
    const handleScrollToMessage = (event: CustomEvent<{ messageId: string }>) => {
      scrollToMessage(event.detail.messageId);
    };

    window.addEventListener(
      'scroll-to-message',
      handleScrollToMessage as EventListener
    );

    return () => {
      window.removeEventListener(
        'scroll-to-message',
        handleScrollToMessage as EventListener
      );
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 메시지 전송
  const handleSendMessage = async (text: string) => {
    if (!user || !text.trim()) return;

    const tempRoom = temporaryRooms.find((r) => r.id === chatRoomId);
    const displayName = getUserDisplayName(user, userProfile, '사용자');

    try {
      await ChatService.sendMessage(
        chatRoomId,
        text,
        {
          uid: user.uid,
          displayName,
          photoURL: user.photoURL || undefined,
        },
        undefined,
        undefined,
        undefined,
        tempRoom
      );

      // 임시 채팅방인 경우 URL 업데이트는 ChatService.sendMessage 내부에서 처리됨
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // 연속된 메시지에서 아바타 표시 여부 결정
  const shouldShowAvatar = (index: number): boolean => {
    if (index === 0) return true;
    const currentMessage = roomMessages[index];
    const previousMessage = roomMessages[index - 1];
    return (
      currentMessage.sender.uid !== previousMessage.sender.uid ||
      new Date(currentMessage.timestamp).getTime() -
        new Date(previousMessage.timestamp).getTime() >
        5 * 60 * 1000 // 5분 이상 차이
    );
  };

  return (
    <div className="flex flex-col h-full min-w-0 relative">
      {/* 메시지 영역 */}
      <ScrollArea className="flex-1 min-w-0" ref={scrollAreaRef}>
        <div className="p-4 space-y-1 min-w-0">
          {roomMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>첫 메시지를 보내 채팅을 시작하세요</p>
            </div>
          ) : (
            roomMessages.map((message, index) => (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className="min-w-0"
              >
                <ChatMessageComponent
                  message={message}
                  currentUserId={currentUserId}
                  showAvatar={shouldShowAvatar(index)}
                  isSearchResult={highlightedMessageIds.has(message.id)}
                />
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 하단 스크롤 버튼 */}
      {showScrollButton && (
        <div className="absolute bottom-20 right-4 z-10">
          <Button
            onClick={scrollToBottom}
            size="icon"
            className="rounded-full w-10 h-10 shadow-lg"
          >
            <ChevronDown className="size-5" />
          </Button>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="flex-shrink-0 border-t bg-background p-4 min-w-0">
        <ChatInput
          onSubmit={handleSendMessage}
          placeholder="메시지를 입력하세요..."
          disabled={!user}
          users={[]} // TODO: 채팅방 참여자 목록 전달
          currentUserUid={user?.uid}
        />
      </div>
    </div>
  );
};

