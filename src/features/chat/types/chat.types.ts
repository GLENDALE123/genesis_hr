/**
 * 채팅 관련 타입 정의
 */

/**
 * 메시지 상태
 */
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * 채팅방 타입
 */
export type ChatRoomType = 'direct' | 'group';

/**
 * 메시지 첨부파일
 */
export interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType?: string;
  thumbnailUrl?: string; // 이미지의 경우 썸네일 URL
}

/**
 * 채팅방 참여자
 */
export interface ChatRoomParticipant {
  uid: string;
  displayName: string;
  photoURL?: string;
  joinedAt: string; // ISO string
}

/**
 * 채팅방
 */
export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  name?: string; // 그룹 채팅방의 경우에만 사용
  participants: ChatRoomParticipant[];
  createdBy: string; // 생성자 UID
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string; // ISO string
  };
  unreadCount?: Record<string, number>; // 사용자별 읽지 않은 메시지 수
}

/**
 * 채팅 메시지
 */
export interface ChatMessage {
  id: string;
  chatRoomId: string;
  text: string;
  sender: {
    uid: string;
    displayName: string;
    photoURL?: string;
  };
  timestamp: string; // ISO string
  status: MessageStatus;
  readBy: string[]; // 읽은 사용자 UID 배열
  attachments?: MessageAttachment[];
  mentionedUserIds?: string[]; // 멘션된 사용자 UID 배열
  editedAt?: string; // ISO string
  replyTo?: string; // 답장 대상 메시지 ID
}

/**
 * 임시 채팅방 (클라이언트에만 존재)
 */
export interface TemporaryChatRoom {
  id: string; // temp_로 시작하는 임시 ID
  type: ChatRoomType;
  participants: ChatRoomParticipant[];
  createdAt: string; // ISO string
}

/**
 * 타이핑 상태
 */
export interface TypingStatus {
  userId: string;
  userName: string;
  timestamp: string; // ISO string
}

