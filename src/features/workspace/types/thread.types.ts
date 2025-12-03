/**
 * 스레드 관련 타입 정의
 */

import type { ChatMessage } from '@/features/chat/types/chat.types';

/**
 * 스레드
 */
export interface Thread {
  id: string;
  channelId: string;
  workspaceId: string;
  parentMessageId: string;
  messages: ChatMessage[];
  participants: string[]; // UID 배열
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isResolved: boolean; // 해결됨 표시
  resolvedBy?: string; // 해결한 사용자 UID
  resolvedAt?: string; // ISO string
  unreadCount?: Record<string, number>; // 사용자별 읽지 않은 메시지 수
}

/**
 * 스레드 생성 데이터
 */
export interface CreateThreadData {
  channelId: string;
  workspaceId: string;
  parentMessageId: string;
  initialMessage: Omit<ChatMessage, 'id' | 'timestamp' | 'status' | 'readBy'>;
}

/**
 * 스레드 메시지 추가 데이터
 */
export interface AddThreadMessageData {
  threadId: string;
  message: Omit<ChatMessage, 'id' | 'timestamp' | 'status' | 'readBy'>;
}

