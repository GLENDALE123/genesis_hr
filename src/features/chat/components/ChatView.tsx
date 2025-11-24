/**
 * 채팅 뷰 컴포넌트
 * 메시지 목록 표시 및 실시간 구독
 */

'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Button } from '@/shared/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { ChatService } from '../services/chatService';
import { ChatMessageComponent } from './ChatMessage';
import { ChatInput } from '@/shared/components/common/ChatInput';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { SCROLL_CONFIG } from '../constants';
import type { ChatMessage } from '../types/chat.types';

export interface ChatViewProps {
  chatRoomId: string;
  searchQuery?: string;
  currentUserId: string;
  onSearchResultsChange?: (results: Array<{ id: string; index: number }>) => void;
  hideInput?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chatRoomId,
  searchQuery = '',
  currentUserId,
  onSearchResultsChange,
  hideInput = false,
}) => {
  const navigate = useNavigate();
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

  // 검색 결과 추적 (2글자 이상일 때만)
  useEffect(() => {
    if (!onSearchResultsChange) return;
    
    const trimmedQuery = searchQuery?.trim() || '';
    if (trimmedQuery.length >= 2) {
      const query = trimmedQuery.toLowerCase();
      // 최신 메시지가 먼저 오도록 역순으로 검색
      const results = roomMessages
        .slice()
        .reverse() // 배열을 역순으로
        .map((msg, originalIndex) => {
          // 역순으로 변환된 인덱스를 원래 인덱스로 변환
          const actualIndex = roomMessages.length - 1 - originalIndex;
          return { msg, index: actualIndex };
        })
        .filter(({ msg }) => msg.text.toLowerCase().includes(query))
        .map(({ msg, index }) => ({ id: msg.id, index }));
      
      onSearchResultsChange(results);
    } else {
      onSearchResultsChange([]);
    }
  }, [searchQuery, roomMessages, onSearchResultsChange]);

  // 메시지 구독 및 읽음 처리
  useEffect(() => {
    if (!chatRoomId || chatRoomId.startsWith('temp_') || !isMounted || !currentUserId) {
      setMessages(chatRoomId, []);
      return;
    }

    const unsubscribe = ChatService.subscribeToMessages(
      chatRoomId,
      async (newMessages) => {
        setMessages(chatRoomId, newMessages);
        
        // 읽지 않은 메시지를 읽음 처리 (자신이 보낸 메시지 제외)
        const unreadMessages = newMessages.filter(
          (msg) => msg.sender.uid !== currentUserId && !msg.readBy.includes(currentUserId)
        );
        
        // 읽지 않은 메시지가 있으면 읽음 처리
        if (unreadMessages.length > 0) {
          // 병렬로 읽음 처리 (성능 최적화)
          const markAsReadPromises = unreadMessages.map((msg) =>
            ChatService.markMessageAsRead(msg.id, currentUserId).catch((error) => {
              // 개별 메시지 읽음 처리 실패는 조용히 처리
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Failed to mark message ${msg.id} as read:`, error);
              }
            })
          );
          
          await Promise.allSettled(markAsReadPromises);
        }
      },
      (error) => {
        console.error('Failed to subscribe to messages:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [chatRoomId, isMounted, currentUserId, setMessages]);

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

  // 검색 결과로 스크롤은 ChatRoomPageClient에서 처리하므로 제거

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
    
    // 이름+직급 가져오기 (UserList에서 사용하는 방식과 동일)
    const senderDisplayName = getUserDisplayName(
      { displayName: user.displayName, email: user.email },
      { position: userProfile?.position },
      '사용자'
    );

    try {
      const result = await ChatService.sendMessage(
        chatRoomId,
        text,
        {
          uid: user.uid,
          displayName: senderDisplayName,
          photoURL: user.photoURL || undefined,
        },
        undefined,
        undefined,
        undefined,
        tempRoom
      );

      // 임시 채팅방인 경우 저장된 채팅방 ID로 URL 업데이트
      if (tempRoom && result.roomId !== chatRoomId) {
        navigate(`/chat?room=${result.roomId}`);
      }
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

  // 연속된 메시지 그룹 판단 (1분 기준)
  const isFirstInGroup = (index: number): boolean => {
    if (index === 0) return true;
    const currentMessage = roomMessages[index];
    const previousMessage = roomMessages[index - 1];
    return (
      currentMessage.sender.uid !== previousMessage.sender.uid ||
      new Date(currentMessage.timestamp).getTime() -
        new Date(previousMessage.timestamp).getTime() >
        60 * 1000 // 1분 이상 차이
    );
  };

  // 연속된 메시지 그룹의 마지막 메시지인지 판단 (1분 기준)
  const isLastInGroup = (index: number): boolean => {
    if (index === roomMessages.length - 1) return true;
    const currentMessage = roomMessages[index];
    const nextMessage = roomMessages[index + 1];
    return (
      currentMessage.sender.uid !== nextMessage.sender.uid ||
      new Date(nextMessage.timestamp).getTime() -
        new Date(currentMessage.timestamp).getTime() >
        60 * 1000 // 1분 이상 차이
    );
  };

  return (
    <div className="flex flex-col h-full min-w-0 relative overflow-hidden">
      {/* 메시지 영역 */}
      <ScrollArea className="flex-1 min-h-0 min-w-0" ref={scrollAreaRef}>
        <div className="py-4 space-y-0.5 min-w-0">
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
                  searchQuery={searchQuery}
                  participants={currentChatRoom?.participants || []}
                  isFirstInGroup={isFirstInGroup(index)}
                  isLastInGroup={isLastInGroup(index)}
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
      {!hideInput && (
        <div className="flex-shrink-0 border-t bg-background p-4 min-w-0 sticky bottom-0 z-10">
          <ChatInput
            onSubmit={handleSendMessage}
            placeholder="메시지를 입력하세요..."
            disabled={!user}
            users={[]} // TODO: 채팅방 참여자 목록 전달
            currentUserUid={user?.uid}
          />
        </div>
      )}
    </div>
  );
};

