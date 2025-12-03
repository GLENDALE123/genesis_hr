/**
 * 워크스페이스 관련 타입 정의
 */

import type { UserRole } from '@/features/auth/types';
import type { ChannelPermissions } from './channel.types';

/**
 * 워크스페이스 멤버
 */
export interface WorkspaceMember {
  uid: string;
  role: WorkspaceRole;
  joinedAt: string; // ISO string
  displayName?: string;
  photoURL?: string;
}

/**
 * 워크스페이스 역할
 */
export type WorkspaceRole = 'owner' | 'admin' | 'member';

/**
 * 워크스페이스 설정
 */
export interface WorkspaceSettings {
  allowMemberInvite: boolean;
  allowChannelCreation: boolean;
  defaultChannelPermissions: ChannelPermissions;
}

/**
 * 워크스페이스
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string; // 아이콘 URL 또는 이모지
  createdBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  isActive: boolean;
}

/**
 * 워크스페이스 생성 데이터
 */
export interface CreateWorkspaceData {
  name: string;
  description?: string;
  icon?: string;
  settings?: Partial<WorkspaceSettings>;
}

/**
 * 워크스페이스 업데이트 데이터
 */
export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
  icon?: string;
  settings?: Partial<WorkspaceSettings>;
}

