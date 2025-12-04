/**
 * 할 일 관련 타입 정의
 * Jandi 스타일의 간단한 할 일 관리 기능
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * 할 일 우선순위
 */
export type TodoPriority = 'low' | 'medium' | 'high';

/**
 * 할 일 상태 (보드뷰용)
 */
export type TodoStatus = 'todo' | 'in-progress' | 'done';

/**
 * 할 일 필터 타입
 */
export type TodoFilter = 'all' | 'my-todos' | 'completed' | 'incomplete' | 'overdue';

/**
 * 할 일 정렬 타입
 */
export type TodoSortBy = 'dueDate' | 'createdAt' | 'priority' | 'title';

/**
 * 할 일
 */
export interface Todo {
  id: string;
  channelId: string;
  workspaceId: string;
  title: string;
  description?: string;
  assigneeIds: string[]; // 담당자 목록
  dueDate?: Timestamp; // 마감일
  completed: boolean;
  status?: TodoStatus; // 보드뷰 상태 (todo, in-progress, done)
  completedAt?: Timestamp;
  completedBy?: string; // 완료한 사용자 UID
  createdAt: Timestamp;
  createdBy: string; // 생성한 사용자 UID
  updatedAt: Timestamp;
  updatedBy: string; // 마지막 수정한 사용자 UID
  messageId?: string; // 메시지에서 생성된 경우 원본 메시지 ID
  priority?: TodoPriority; // 우선순위
  commentCount?: number; // 댓글 수
  unreadCommentCount?: number; // 읽지 않은 댓글 수
  lastCommentAt?: Timestamp; // 마지막 댓글 시간
}

/**
 * 할 일 생성 데이터
 */
export interface CreateTodoData {
  channelId: string;
  workspaceId: string;
  title: string;
  description?: string;
  assigneeIds?: string[];
  dueDate?: Date | Timestamp;
  messageId?: string;
  priority?: TodoPriority;
  status?: TodoStatus;
}

/**
 * 할 일 업데이트 데이터
 */
export interface UpdateTodoData {
  title?: string;
  description?: string;
  assigneeIds?: string[];
  dueDate?: Date | Timestamp | null;
  completed?: boolean;
  priority?: TodoPriority;
  status?: TodoStatus;
}

/**
 * 할 일 필터 옵션
 */
export interface TodoFilterOptions {
  filter: TodoFilter;
  sortBy: TodoSortBy;
  sortOrder: 'asc' | 'desc';
  searchQuery?: string;
}

/**
 * 할 일 통계
 */
export interface TodoStats {
  total: number;
  completed: number;
  incomplete: number;
  overdue: number;
  myTodos: number;
}

