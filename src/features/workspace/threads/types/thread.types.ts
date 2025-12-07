/**
 * 스레드 관련 타입 정의
 * 워크스페이스 전용 - 1:1 채팅과 독립적
 */

import type { ChannelMessage } from '@/features/workspace/messages';

/**
 * 스레드
 */
export interface Thread {
  id: string;
  channelId: string;
  workspaceId: string;
  parentMessageId: string;
  messages: ChannelMessage[];
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
  initialMessage: Omit<ChannelMessage, 'id' | 'timestamp' | 'readBy'>;
}

/**
 * 스레드 메시지 추가 데이터
 */
export interface AddThreadMessageData {
  threadId: string;
  workspaceId: string;
  channelId: string;
  message: Omit<ChannelMessage, 'id' | 'timestamp' | 'readBy'>;
}

