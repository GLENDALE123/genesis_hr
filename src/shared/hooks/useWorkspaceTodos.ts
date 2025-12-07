/**
 * 워크스페이스 Todo 조회 훅
 * 사용자가 담당자인 모든 워크스페이스 Todo를 조회
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { WorkspaceService } from '@/features/workspace/services/workspaceService';
import { ChannelService } from '@/features/workspace/channels/services/channelService';
import { useTodoStore } from '@/features/workspace/todos/store/todoStore';
import type { Todo } from '@/features/workspace/todos/types/todo.types';
import type { Workspace } from '@/features/workspace/types/workspace.types';
import type { Channel } from '@/features/workspace/channels/types/channel.types';

interface WorkspaceTodo extends Todo {
  workspaceId: string;
  workspaceName: string;
  channelId: string;
  channelName: string;
}

export const useWorkspaceTodos = () => {
  const { user } = useAuthStore();
  const { subscribeToTodos, toggleTodo } = useTodoStore();
  const [todos, setTodos] = useState<WorkspaceTodo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRefs = useRef<Array<() => void>>([]);
  const todoStoreUnsubscribes = useRef<Array<() => void>>([]);

  // 워크스페이스와 채널 정보 캐시
  const [workspaceCache, setWorkspaceCache] = useState<Record<string, Workspace>>({});
  const [channelCache, setChannelCache] = useState<Record<string, Channel>>({});

  // 워크스페이스 정보 가져오기
  const fetchWorkspaceInfo = useCallback(async (workspaceId: string): Promise<Workspace | null> => {
    if (workspaceCache[workspaceId]) {
      return workspaceCache[workspaceId];
    }

    try {
      const workspace = await WorkspaceService.getWorkspace(workspaceId);
      if (workspace) {
        setWorkspaceCache((prev) => ({ ...prev, [workspaceId]: workspace }));
      }
      return workspace;
    } catch (err) {
      console.error(`워크스페이스 정보 조회 실패 (${workspaceId}):`, err);
      return null;
    }
  }, [workspaceCache]);

  // 채널 정보 가져오기
  const fetchChannelInfo = useCallback(async (
    workspaceId: string,
    channelId: string
  ): Promise<Channel | null> => {
    const cacheKey = `${workspaceId}_${channelId}`;
    if (channelCache[cacheKey]) {
      return channelCache[cacheKey];
    }

    try {
      const channel = await ChannelService.getChannel(channelId, workspaceId);
      if (channel) {
        setChannelCache((prev) => ({ ...prev, [cacheKey]: channel }));
      }
      return channel;
    } catch (err) {
      console.error(`채널 정보 조회 실패 (${workspaceId}/${channelId}):`, err);
      return null;
    }
  }, [channelCache]);

  // Todo 목록 업데이트
  const updateTodos = useCallback(async (
    workspaceId: string,
    channelId: string,
    channelTodos: Todo[]
  ) => {
    const workspace = await fetchWorkspaceInfo(workspaceId);
    const channel = await fetchChannelInfo(workspaceId, channelId);

    if (!workspace || !channel) {
      return;
    }

    // 담당자 필터링 (assigneeIds에 현재 사용자 포함)
    const myTodos = channelTodos.filter(
      (todo) => todo.assigneeIds && todo.assigneeIds.includes(user?.uid || '')
    );

    const workspaceTodos: WorkspaceTodo[] = myTodos.map((todo) => ({
      ...todo,
      workspaceId,
      workspaceName: workspace.name,
      channelId,
      channelName: channel.name,
    }));

    setTodos((prev) => {
      // 기존 Todo 제거 (같은 채널의 Todo)
      const filtered = prev.filter(
        (t) => !(t.workspaceId === workspaceId && t.channelId === channelId)
      );
      // 새로운 Todo 추가
      return [...filtered, ...workspaceTodos];
    });
  }, [user?.uid, fetchWorkspaceInfo, fetchChannelInfo]);

  // 초기 로드 및 구독 설정
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadTodos = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 사용자가 속한 모든 워크스페이스 가져오기
        const workspaces = await WorkspaceService.getUserWorkspaces(user.uid);

        if (!isMounted) return;

        // 각 워크스페이스의 채널 가져오기
        const channelPromises = workspaces.map(async (workspace) => {
          try {
            const channels = await ChannelService.getWorkspaceChannels(workspace.id, false);
            return { workspace, channels };
          } catch (err) {
            console.error(`채널 조회 실패 (${workspace.id}):`, err);
            return { workspace, channels: [] };
          }
        });

        const workspaceChannels = await Promise.all(channelPromises);

        // 기존 구독 정리
        unsubscribeRefs.current.forEach((unsub) => unsub());
        unsubscribeRefs.current = [];
        todoStoreUnsubscribes.current.forEach((unsub) => unsub());
        todoStoreUnsubscribes.current = [];

        // 각 채널의 Todo 구독
        workspaceChannels.forEach(({ workspace, channels }) => {
          channels.forEach((channel) => {
            // 내 할 일 필터 옵션 (searchQuery에 userId 전달)
            const filterOptions = {
              filter: 'my-todos' as const,
              sortBy: 'dueDate' as const,
              sortOrder: 'asc' as const,
              searchQuery: user.uid, // userId를 searchQuery로 전달
            };

            // Todo 구독
            const unsubscribe = subscribeToTodos(
              workspace.id,
              channel.id,
              filterOptions
            );

            unsubscribeRefs.current.push(unsubscribe);

            // TodoStore 구독으로 실시간 업데이트
            // subscribeToTodos가 store를 업데이트하므로, store 변경을 감지
            const todoStoreUnsubscribe = useTodoStore.subscribe(
              (state) => {
                if (!isMounted) return;
                const channelTodos = state.todos[channel.id];
                if (channelTodos) {
                  updateTodos(workspace.id, channel.id, channelTodos);
                }
              }
            );

            todoStoreUnsubscribes.current.push(todoStoreUnsubscribe);
          });
        });

        setIsLoading(false);
      } catch (err) {
        console.error('워크스페이스 Todo 로드 실패:', err);
        setError(err instanceof Error ? err.message : 'Todo 로드 실패');
        setIsLoading(false);
      }
    };

    loadTodos();

    return () => {
      isMounted = false;
      unsubscribeRefs.current.forEach((unsub) => unsub());
      unsubscribeRefs.current = [];
      todoStoreUnsubscribes.current.forEach((unsub) => unsub());
      todoStoreUnsubscribes.current = [];
    };
  }, [user?.uid, subscribeToTodos, updateTodos]);

  // Todo 완료/미완료 토글
  const handleToggleTodo = useCallback(async (
    workspaceId: string,
    channelId: string,
    todoId: string
  ) => {
    if (!user?.uid) return;

    try {
      await toggleTodo(workspaceId, channelId, todoId, user.uid);
    } catch (err) {
      console.error('Todo 토글 실패:', err);
    }
  }, [user?.uid, toggleTodo]);

  // 정렬된 Todo 목록 (마감일 순, 미완료 우선)
  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => {
      // 완료 상태로 먼저 정렬 (미완료 우선)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // 마감일이 있는 것 우선
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // 마감일 순 정렬
      if (a.dueDate && b.dueDate) {
        const aTime = a.dueDate.toMillis();
        const bTime = b.dueDate.toMillis();
        return aTime - bTime;
      }

      // 생성일 순 정렬 (최신 우선)
      const aCreated = a.createdAt.toMillis();
      const bCreated = b.createdAt.toMillis();
      return bCreated - aCreated;
    });
  }, [todos]);

  return {
    todos: sortedTodos,
    isLoading,
    error,
    toggleTodo: handleToggleTodo,
  };
};
