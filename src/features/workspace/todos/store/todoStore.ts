/**
 * 할 일 Zustand 스토어
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TodoService } from '../services/todoService';
import type {
  Todo,
  CreateTodoData,
  UpdateTodoData,
  TodoFilterOptions,
  TodoStats,
} from '../types/todo.types';

interface TodoState {
  // 채널별 할 일 목록 (channelId -> todos[])
  todos: Record<string, Todo[]>; // channelId -> todos[]
  // 채널별 통계 (channelId -> stats)
  stats: Record<string, TodoStats>; // channelId -> stats
  // 필터 옵션 (channelId -> filterOptions)
  filterOptions: Record<string, TodoFilterOptions>; // channelId -> filterOptions
  // 로딩 상태
  isLoading: Record<string, boolean>; // channelId -> loading
  // 에러 상태
  errors: Record<string, string | null>; // channelId -> error
}

interface TodoActions {
  // 할 일 목록 관리
  setTodos: (channelId: string, todos: Todo[]) => void;
  addTodo: (channelId: string, todo: Todo) => void;
  updateTodo: (channelId: string, todoId: string, updates: Partial<Todo>) => void;
  removeTodo: (channelId: string, todoId: string) => void;

  // 통계 관리
  setStats: (channelId: string, stats: TodoStats) => void;
  updateStats: (channelId: string, updater: (prev: TodoStats) => TodoStats) => void;

  // 필터 옵션 관리
  setFilterOptions: (channelId: string, options: TodoFilterOptions) => void;
  updateFilterOptions: (
    channelId: string,
    updater: (prev: TodoFilterOptions) => TodoFilterOptions
  ) => void;

  // 로딩 상태
  setIsLoading: (channelId: string, loading: boolean) => void;
  setError: (channelId: string, error: string | null) => void;

  // 서비스 메서드
  createTodo: (data: CreateTodoData, userId: string) => Promise<string>;
  updateTodoData: (
    workspaceId: string,
    channelId: string,
    todoId: string,
    data: UpdateTodoData,
    userId: string
  ) => Promise<void>;
  deleteTodo: (workspaceId: string, channelId: string, todoId: string) => Promise<void>;
  toggleTodo: (workspaceId: string, channelId: string, todoId: string, userId: string) => Promise<void>;
  fetchTodos: (
    workspaceId: string,
    channelId: string,
    filterOptions?: TodoFilterOptions
  ) => Promise<void>;
  fetchStats: (workspaceId: string, channelId: string, userId?: string) => Promise<void>;
  subscribeToTodos: (
    workspaceId: string,
    channelId: string,
    filterOptions?: TodoFilterOptions
  ) => () => void;

  // 초기화
  resetChannel: (channelId: string) => void;
  reset: () => void;
}

const initialState: TodoState = {
  todos: {},
  stats: {},
  filterOptions: {},
  isLoading: {},
  errors: {},
};

const defaultFilterOptions: TodoFilterOptions = {
  filter: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

type TodoStore = TodoState & TodoActions;

export const useTodoStore = create<TodoStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 할 일 목록 관리
      setTodos: (channelId, todos) =>
        set((state) => ({
          todos: {
            ...state.todos,
            [channelId]: todos,
          },
        })),

      addTodo: (channelId, todo) =>
        set((state) => ({
          todos: {
            ...state.todos,
            [channelId]: [...(state.todos[channelId] || []), todo],
          },
        })),

      updateTodo: (channelId, todoId, updates) =>
        set((state) => ({
          todos: {
            ...state.todos,
            [channelId]: (state.todos[channelId] || []).map((todo) =>
              todo.id === todoId ? { ...todo, ...updates } : todo
            ),
          },
        })),

      removeTodo: (channelId, todoId) =>
        set((state) => ({
          todos: {
            ...state.todos,
            [channelId]: (state.todos[channelId] || []).filter((todo) => todo.id !== todoId),
          },
        })),

      // 통계 관리
      setStats: (channelId, stats) =>
        set((state) => ({
          stats: {
            ...state.stats,
            [channelId]: stats,
          },
        })),

      updateStats: (channelId, updater) =>
        set((state) => ({
          stats: {
            ...state.stats,
            [channelId]: updater(state.stats[channelId] || getDefaultStats()),
          },
        })),

      // 필터 옵션 관리
      setFilterOptions: (channelId, options) =>
        set((state) => ({
          filterOptions: {
            ...state.filterOptions,
            [channelId]: options,
          },
        })),

      updateFilterOptions: (channelId, updater) =>
        set((state) => ({
          filterOptions: {
            ...state.filterOptions,
            [channelId]: updater(
              state.filterOptions[channelId] || defaultFilterOptions
            ),
          },
        })),

      // 로딩 상태
      setIsLoading: (channelId, loading) =>
        set((state) => ({
          isLoading: {
            ...state.isLoading,
            [channelId]: loading,
          },
        })),

      setError: (channelId, error) =>
        set((state) => ({
          errors: {
            ...state.errors,
            [channelId]: error,
          },
        })),

      // 서비스 메서드
      createTodo: async (data, userId) => {
        try {
          const todoId = await TodoService.createTodo(data, userId);
          // 통계 업데이트
          await get().fetchStats(data.workspaceId, data.channelId, userId);
          return todoId;
        } catch (error) {
          get().setError(data.channelId, error instanceof Error ? error.message : '할 일 생성 실패');
          throw error;
        }
      },

      updateTodoData: async (workspaceId, channelId, todoId, data, userId) => {
        try {
          await TodoService.updateTodo(workspaceId, channelId, todoId, data, userId);
          // 로컬 상태 업데이트
          get().updateTodo(channelId, todoId, {
            ...data,
            updatedAt: new Date() as any, // 임시로 any 사용
            updatedBy: userId,
          } as Partial<Todo>);
          // 통계 업데이트
          await get().fetchStats(workspaceId, channelId, userId);
        } catch (error) {
          get().setError(channelId, error instanceof Error ? error.message : '할 일 업데이트 실패');
          throw error;
        }
      },

      deleteTodo: async (workspaceId, channelId, todoId) => {
        try {
          await TodoService.deleteTodo(workspaceId, channelId, todoId);
          get().removeTodo(channelId, todoId);
          // 통계 업데이트
          const userId = undefined; // 필요시 파라미터로 받기
          await get().fetchStats(workspaceId, channelId, userId);
        } catch (error) {
          get().setError(channelId, error instanceof Error ? error.message : '할 일 삭제 실패');
          throw error;
        }
      },

      toggleTodo: async (workspaceId, channelId, todoId, userId) => {
        try {
          await TodoService.toggleTodo(workspaceId, channelId, todoId, userId);
          // 로컬 상태 업데이트
          const todos = get().todos[channelId] || [];
          const todo = todos.find((t) => t.id === todoId);
          if (todo) {
            get().updateTodo(channelId, todoId, {
              completed: !todo.completed,
              completedAt: !todo.completed ? (new Date() as any) : undefined,
              completedBy: !todo.completed ? userId : undefined,
            } as Partial<Todo>);
          }
          // 통계 업데이트
          await get().fetchStats(workspaceId, channelId, userId);
        } catch (error) {
          get().setError(channelId, error instanceof Error ? error.message : '할 일 토글 실패');
          throw error;
        }
      },

      fetchTodos: async (workspaceId, channelId, filterOptions) => {
        const options = filterOptions || get().filterOptions[channelId] || defaultFilterOptions;
        get().setIsLoading(channelId, true);
        get().setError(channelId, null);

        try {
          const todos = await TodoService.getChannelTodos(workspaceId, channelId, options);
          get().setTodos(channelId, todos);
        } catch (error) {
          get().setError(
            channelId,
            error instanceof Error ? error.message : '할 일 목록 조회 실패'
          );
        } finally {
          get().setIsLoading(channelId, false);
        }
      },

      fetchStats: async (workspaceId, channelId, userId) => {
        try {
          const stats = await TodoService.getTodoStats(workspaceId, channelId, userId);
          get().setStats(channelId, stats);
        } catch (error) {
          console.error('통계 조회 실패:', error);
        }
      },

      subscribeToTodos: (workspaceId, channelId, filterOptions) => {
        const options = filterOptions || get().filterOptions[channelId] || defaultFilterOptions;
        get().setIsLoading(channelId, true);
        get().setError(channelId, null);

        return TodoService.subscribeToChannelTodos(
          workspaceId,
          channelId,
          (todos) => {
            get().setTodos(channelId, todos);
            get().setIsLoading(channelId, false);
          },
          (error) => {
            get().setError(channelId, error.message);
            get().setIsLoading(channelId, false);
          },
          options
        );
      },

      // 초기화
      resetChannel: (channelId) =>
        set((state) => {
          const newTodos = { ...state.todos };
          const newStats = { ...state.stats };
          const newFilterOptions = { ...state.filterOptions };
          const newIsLoading = { ...state.isLoading };
          const newErrors = { ...state.errors };

          delete newTodos[channelId];
          delete newStats[channelId];
          delete newFilterOptions[channelId];
          delete newIsLoading[channelId];
          delete newErrors[channelId];

          return {
            todos: newTodos,
            stats: newStats,
            filterOptions: newFilterOptions,
            isLoading: newIsLoading,
            errors: newErrors,
          };
        }),

      reset: () => set(initialState),
    }),
    { name: 'TodoStore' }
  )
);

/**
 * 기본 통계
 */
function getDefaultStats(): TodoStats {
  return {
    total: 0,
    completed: 0,
    incomplete: 0,
    overdue: 0,
    myTodos: 0,
  };
}



