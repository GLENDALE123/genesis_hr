/**
 * 워크스페이스 채널 메시지 관련 타입 정의
 * 1:1 채팅과 완전히 독립적인 워크스페이스 전용 타입
 */

/**
 * 메시지 첨부파일
 */
export interface ChannelMessageAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType?: string;
  thumbnailUrl?: string; // 이미지의 경우 썸네일 URL
}

/**
 * 워크스페이스 채널 메시지
 */
export interface ChannelMessage {
  id: string;
  channelId: string;
  workspaceId: string;
  text: string;
  sender: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  timestamp: string; // ISO string
  readBy: string[]; // 읽은 사용자 UID 배열
  attachments?: ChannelMessageAttachment[];
  mentionedUserIds?: string[]; // 멘션된 사용자 UID 배열
  editedAt?: string; // ISO string
  replyTo?: string; // 답장 대상 메시지 ID
  threadId?: string; // 스레드 ID (스레드 메시지인 경우)
  parentMessageId?: string; // 부모 메시지 ID (스레드 메시지인 경우)
}

/**
 * 메시지 생성 데이터
 */
export interface CreateChannelMessageData {
  channelId: string;
  workspaceId: string;
  text: string;
  sender: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  attachments?: ChannelMessageAttachment[];
  mentionedUserIds?: string[];
  replyTo?: string;
}

/**
 * 메시지 업데이트 데이터
 */
export interface UpdateChannelMessageData {
  text?: string;
  editedAt?: string;
}



