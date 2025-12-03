/**
 * 채널 관련 타입 정의
 */

import type { UserRole } from '@/features/auth/types';

/**
 * 채널 타입
 */
export type ChannelType = 'public' | 'private';

/**
 * 채널 카테고리
 */
export type ChannelCategory = 'department' | 'project' | 'topic' | 'general';

/**
 * 채널 권한
 */
export interface ChannelPermissions {
  // 메시지 권한
  canSendMessages: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  
  // 채널 관리 권한
  canManageChannel: boolean; // 채널 설정 변경
  canManageMembers: boolean; // 멤버 추가/제거
  
  // 역할별 권한 설정
  rolePermissions?: Record<UserRole, Partial<ChannelPermissions>>;
}

/**
 * 기본 채널 권한
 */
export const DEFAULT_PUBLIC_CHANNEL_PERMISSIONS: ChannelPermissions = {
  canSendMessages: true,
  canEditMessages: true,
  canDeleteMessages: true,
  canManageChannel: false,
  canManageMembers: false,
};

export const DEFAULT_PRIVATE_CHANNEL_PERMISSIONS: ChannelPermissions = {
  canSendMessages: true,
  canEditMessages: true,
  canDeleteMessages: true,
  canManageChannel: true,
  canManageMembers: true,
};

/**
 * 채널
 */
export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  topic?: string; // 채널 토픽 (슬랙 스타일)
  type: ChannelType;
  category?: ChannelCategory;
  members: string[]; // UID 배열
  createdBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: string; // ISO string
  };
  unreadCount?: Record<string, number>; // 사용자별 읽지 않은 메시지 수
  permissions: ChannelPermissions;
  isArchived: boolean;
  archivedAt?: string; // ISO string
}

/**
 * 채널 생성 데이터
 */
export interface CreateChannelData {
  workspaceId: string;
  name: string;
  description?: string;
  type: ChannelType;
  category?: ChannelCategory;
  memberIds?: string[]; // 초대할 멤버 UID 배열
  permissions?: Partial<ChannelPermissions>;
}

/**
 * 채널 업데이트 데이터
 */
export interface UpdateChannelData {
  name?: string;
  description?: string;
  topic?: string;
  type?: ChannelType;
  category?: ChannelCategory;
  permissions?: Partial<ChannelPermissions>;
}

/**
 * 채널 멤버 추가/제거 데이터
 */
export interface ChannelMemberUpdate {
  channelId: string;
  memberIds: string[];
  action: 'add' | 'remove';
}

