/**
 * 채팅 페이지 클라이언트 컴포넌트
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/features/chat/components/ChatSidebar';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';

export const ChatPageClient: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { temporaryRooms, removeChatRoom, removeTemporaryRoom } = useChatStore();

  // 임시 채팅방 정리 (메인 페이지로 돌아왔을 때)
  useEffect(() => {
    temporaryRooms.forEach((room) => {
      removeChatRoom(room.id);
      removeTemporaryRoom(room.id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 사용자가 없으면 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-full min-w-0 w-full max-w-full">
      <ChatSidebar className="flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">채팅방을 선택하거나 새로 만들어주세요</p>
        </div>
      </div>
    </div>
  );
};

