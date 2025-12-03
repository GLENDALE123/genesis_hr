/**
 * 메시지 관련 확장 타입 정의
 */

import type { ChatMessage } from '@/features/chat/types/chat.types';

/**
 * 고정된 메시지
 */
export interface PinnedMessage {
  id: string;
  messageId: string;
  channelId: string;
  workspaceId: string;
  pinnedBy: string; // UID
  pinnedAt: string; // ISO string
  message: ChatMessage;
}

/**
 * 메시지 편집 히스토리
 */
export interface MessageEditHistory {
  id: string;
  messageId: string;
  editedBy: string; // UID
  editedAt: string; // ISO string
  previousText: string;
  newText: string;
}

/**
 * 채널 멘션 타입
 */
export type ChannelMentionType = 'here' | 'channel' | 'everyone';

/**
 * 멘션 데이터
 */
export interface MentionData {
  type: 'user' | ChannelMentionType;
  userId?: string; // user 멘션인 경우
  channelId?: string; // 채널 멘션인 경우
  workspaceId?: string; // 워크스페이스 멘션인 경우
}

