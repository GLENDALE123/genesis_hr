/**
 * 반응(Reaction) 관련 타입 정의
 */

/**
 * 메시지 반응
 */
export interface MessageReaction {
  id: string;
  messageId: string;
  channelId: string;
  workspaceId: string;
  emoji: string; // 이모지 문자열 (예: '👍', '❤️', '🎉')
  users: string[]; // 반응을 추가한 사용자 UID 배열
  count: number; // users.length와 동일하지만 빠른 접근을 위해 저장
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * 반응 추가 데이터
 */
export interface AddReactionData {
  messageId: string;
  channelId: string;
  workspaceId: string;
  emoji: string;
  userId: string;
}

/**
 * 반응 제거 데이터
 */
export interface RemoveReactionData {
  messageId: string;
  emoji: string;
  userId: string;
}

/**
 * 인기 이모지 목록 (자주 사용되는 반응)
 */
export const POPULAR_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '🙏', '👏',
  '🎉', '🔥', '💯', '✅', '❌', '⚠️', '💡', '🚀',
] as const;


