/**
 * 워크스페이스 권한 유틸리티
 */

import type { UserRole } from '@/features/auth/types';
import type { WorkspaceRole, WorkspaceMember, Channel, ChannelPermissions } from '../types';

/**
 * 워크스페이스 역할이 채널 관리 권한이 있는지 확인
 */
export const canManageWorkspace = (
  userRole: WorkspaceRole | undefined,
  userId?: string,
  workspaceCreatedBy?: string
): boolean => {
  if (!userRole) return false;
  if (userId && workspaceCreatedBy && userId === workspaceCreatedBy) return true; // 소유자는 항상 권한 있음
  return userRole === 'owner' || userRole === 'admin';
};

/**
 * 채널 생성 권한이 있는지 확인
 */
export const canCreateChannel = (
  userRole: WorkspaceRole | undefined,
  workspaceSettings: { allowChannelCreation: boolean }
): boolean => {
  if (!userRole) return false;
  if (!workspaceSettings.allowChannelCreation) {
    return userRole === 'owner' || userRole === 'admin';
  }
  return true; // 모든 멤버가 생성 가능
};

/**
 * 채널 관리 권한이 있는지 확인
 */
export const canManageChannel = (
  userRole: WorkspaceRole | undefined,
  userId: string,
  channel: Channel
): boolean => {
  if (!userRole) return false;
  if (userId === channel.createdBy) return true; // 생성자는 항상 권한 있음
  if (userRole === 'owner' || userRole === 'admin') return true;
  return channel.permissions.canManageChannel;
};

/**
 * 채널 멤버 관리 권한이 있는지 확인
 */
export const canManageChannelMembers = (
  userRole: WorkspaceRole | undefined,
  userId: string,
  channel: Channel
): boolean => {
  if (!userRole) return false;
  if (userId === channel.createdBy) return true;
  if (userRole === 'owner' || userRole === 'admin') return true;
  return channel.permissions.canManageMembers;
};

/**
 * 채널에 메시지 전송 권한이 있는지 확인
 */
export const canSendMessage = (
  userId: string,
  channel: Channel
): boolean => {
  if (!channel.members.includes(userId)) return false;
  if (channel.isArchived) return false;
  return channel.permissions.canSendMessages;
};

/**
 * 메시지 수정 권한이 있는지 확인
 */
export const canEditMessage = (
  userId: string,
  messageSenderId: string,
  channel: Channel
): boolean => {
  if (userId === messageSenderId) {
    return channel.permissions.canEditMessages;
  }
  // 다른 사람의 메시지는 관리자만 수정 가능
  return canManageChannel(undefined, userId, channel);
};

/**
 * 메시지 삭제 권한이 있는지 확인
 */
export const canDeleteMessage = (
  userId: string,
  messageSenderId: string,
  channel: Channel
): boolean => {
  if (userId === messageSenderId) {
    return channel.permissions.canDeleteMessages;
  }
  // 다른 사람의 메시지는 관리자만 삭제 가능
  return canManageChannel(undefined, userId, channel);
};

/**
 * 사용자가 채널에 접근할 수 있는지 확인
 */
export const canAccessChannel = (
  userId: string,
  channel: Channel
): boolean => {
  if (channel.type === 'public' || channel.type === 'board') return true;
  return channel.members.includes(userId);
};

/**
 * 사용자의 워크스페이스 역할 가져오기
 */
export const getUserWorkspaceRole = (
  userId: string,
  members: WorkspaceMember[]
): WorkspaceRole | undefined => {
  const member = members.find((m) => m.uid === userId);
  return member?.role;
};

/**
 * 기본 채널 권한 생성
 */
export const createDefaultChannelPermissions = (
  type: 'public' | 'private' | 'board'
): ChannelPermissions => {
  if (type === 'private') {
    return {
      ...DEFAULT_PRIVATE_CHANNEL_PERMISSIONS,
    };
  }
  if (type === 'board') {
    // 보드뷰는 기본적으로 공개 채널 권한과 동일하지만, 메시지 전송은 불가
    return {
      canSendMessages: false,
      canEditMessages: true,
      canDeleteMessages: true,
      canManageChannel: true,
      canManageMembers: true,
    };
  }
  return {
    ...DEFAULT_PUBLIC_CHANNEL_PERMISSIONS,
  };
};

// DEFAULT_PRIVATE_CHANNEL_PERMISSIONS와 DEFAULT_PUBLIC_CHANNEL_PERMISSIONS는 channel.types.ts에서 import
import {
  DEFAULT_PUBLIC_CHANNEL_PERMISSIONS,
  DEFAULT_PRIVATE_CHANNEL_PERMISSIONS,
} from '../types/channel.types';

