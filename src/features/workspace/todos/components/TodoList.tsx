/**
 * 할 일 목록 컴포넌트
 * Jandi 스타일의 간단한 할 일 목록
 */

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Input } from '@/shared/components/ui/input';
import { Plus, Loader2, Check, X, CheckCircle2 } from 'lucide-react';
import { useTodoStore } from '../store/todoStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { TodoItem } from './TodoItem';
import { TodoForm } from './TodoForm';
import { TodoFilter } from './TodoFilter';
import { LoadingSpinner } from '@/shared/components/common';
import type { Todo, UpdateTodoData, TodoFilterOptions } from '../types/todo.types';
import { Timestamp } from 'firebase/firestore';

export interface TodoListProps {
  workspaceId: string;
  channelId: string;
  className?: string;
}

export const TodoList: React.FC<TodoListProps> = ({
  workspaceId,
  channelId,
  className,
}) => {
  const { user } = useAuthStore();
  const {
    todos,
    filterOptions,
    isLoading,
    errors,
    setFilterOptions,
    updateFilterOptions,
    createTodo,
    updateTodoData,
    deleteTodo,
    toggleTodo,
    subscribeToTodos,
    fetchStats,
  } = useTodoStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [assignees, setAssignees] = useState<
    Array<{ uid: string; displayName: string; photoURL?: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  const channelTodos = todos[channelId] || [];
  const channelFilterOptions = filterOptions[channelId] || {
    filter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };
  const channelLoading = isLoading[channelId] || false;
  const channelError = errors[channelId];

  // 필터 옵션 초기화
  useEffect(() => {
    if (!filterOptions[channelId]) {
      setFilterOptions(channelId, {
        filter: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    }
  }, [channelId, filterOptions, setFilterOptions]);

  // 할 일 구독
  useEffect(() => {
    if (!workspaceId || !channelId) return;

    const unsubscribe = subscribeToTodos(workspaceId, channelId, channelFilterOptions);

    return () => {
      unsubscribe();
    };
  }, [workspaceId, channelId, subscribeToTodos, channelFilterOptions]);

  // 통계 조회
  useEffect(() => {
    if (!workspaceId || !channelId) return;
    fetchStats(workspaceId, channelId, user?.uid);
  }, [workspaceId, channelId, user?.uid, fetchStats]);

  // 담당자 목록 로드
  useEffect(() => {
    const loadAssignees = async () => {
      try {
        const users = await getAllUsersWithAuthInfo();
        setAssignees(
          users.map((u) => ({
            uid: u.uid || '',
            displayName: u.displayName || u.name || '',
            photoURL: u.photoURL || undefined,
          }))
        );
      } catch (error) {
        console.error('담당자 목록 로드 실패:', error);
      }
    };

    loadAssignees();
  }, []);

  const handleCreateTodo = async (data: UpdateTodoData) => {
    if (!user?.uid) return;

    try {
      setIsSubmitting(true);
      await createTodo(
        {
          workspaceId,
          channelId,
          title: data.title || '',
          description: data.description,
          assigneeIds: data.assigneeIds,
          dueDate: data.dueDate === null ? undefined : data.dueDate,
          priority: data.priority,
        },
        user.uid
      );
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('할 일 생성 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTodo = async (todoId: string, updates: Partial<Todo>) => {
    if (!user?.uid) return;

    try {
      await updateTodoData(
        workspaceId,
        channelId,
        todoId,
        {
          title: updates.title,
          description: updates.description,
          assigneeIds: updates.assigneeIds,
          dueDate: updates.dueDate,
          completed: updates.completed,
          priority: updates.priority,
        },
        user.uid
      );
    } catch (error) {
      console.error('할 일 업데이트 실패:', error);
    }
  };

  const handleToggleTodo = async (todoId: string) => {
    if (!user?.uid) return;

    try {
      await toggleTodo(workspaceId, channelId, todoId, user.uid);
    } catch (error) {
      console.error('할 일 토글 실패:', error);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!user?.uid) return;

    try {
      await deleteTodo(workspaceId, channelId, todoId);
    } catch (error) {
      console.error('할 일 삭제 실패:', error);
    }
  };

  const handleFilterChange = (options: TodoFilterOptions) => {
    setFilterOptions(channelId, options);
  };

  const handleClearFilters = () => {
    setFilterOptions(channelId, {
      filter: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  // 빠른 추가 핸들러
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !quickAddText.trim() || isQuickAdding) return;

    try {
      setIsQuickAdding(true);
      await createTodo(
        {
          workspaceId,
          channelId,
          title: quickAddText.trim(),
        },
        user.uid
      );
      setQuickAddText('');
      // 입력 필드에 포커스 유지
      quickAddInputRef.current?.focus();
    } catch (error) {
      console.error('빠른 추가 실패:', error);
    } finally {
      setIsQuickAdding(false);
    }
  };

  // 키보드 단축키: 'n' 키로 할 일 추가 다이얼로그 열기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCreateDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 내 할 일 필터 적용 (클라이언트 측)
  const filteredTodos = React.useMemo(() => {
    let filtered = [...channelTodos];

    // 내 할 일 필터
    if (channelFilterOptions.filter === 'my-todos' && user?.uid) {
      filtered = filtered.filter((todo) => todo.assigneeIds.includes(user.uid));
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (channelFilterOptions.sortBy) {
        case 'dueDate':
          const aDate = a.dueDate?.toMillis() || 0;
          const bDate = b.dueDate?.toMillis() || 0;
          comparison = aDate - bDate;
          break;
        case 'createdAt':
          comparison = a.createdAt.toMillis() - b.createdAt.toMillis();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority || 'medium'];
          const bPriority = priorityOrder[b.priority || 'medium'];
          comparison = bPriority - aPriority;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return channelFilterOptions.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [channelTodos, channelFilterOptions, user?.uid]);

  return (
    <div className={className}>
      {/* 헤더 및 필터 */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">할 일</h2>
            {channelTodos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                총 {channelTodos.length}개
              </span>
            )}
            <span className="text-xs text-muted-foreground/70">
              (Ctrl/Cmd + N: 새 할 일, Ctrl/Cmd + K: 빠른 추가)
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="gap-1.5 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">할 일 추가</span>
          </Button>
        </div>
        <TodoFilter
          filterOptions={channelFilterOptions}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          currentUserId={user?.uid}
        />
      </div>

      {/* 빠른 추가 */}
      <div className="px-4 py-3 border-b bg-muted/20">
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              ref={quickAddInputRef}
              placeholder="할 일을 입력하고 Enter를 누르세요... (Ctrl/Cmd + K로 포커스)"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              disabled={isQuickAdding}
              className="h-9 pr-10 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/20"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuickAddText('');
                  quickAddInputRef.current?.blur();
                }
              }}
            />
            {quickAddText && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-muted"
                onClick={() => setQuickAddText('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!quickAddText.trim() || isQuickAdding}
            className="gap-1.5 h-9 px-3 shadow-sm"
          >
            {isQuickAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            추가
          </Button>
        </form>
      </div>

      {/* 할 일 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1.5">
          {channelLoading && channelTodos.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : channelError ? (
            <div className="text-center text-sm text-destructive py-12">
              {channelError}
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="text-sm font-medium text-foreground mb-1">
                할 일이 없습니다
              </div>
              <div className="text-xs text-muted-foreground max-w-xs mx-auto space-y-1">
                <p>위 입력 필드에서 할 일을 추가하거나, 메시지에서 할 일로 만들 수 있습니다.</p>
                <p className="text-muted-foreground/70">
                  팁: Ctrl/Cmd + K로 빠른 추가 필드에 포커스
                </p>
              </div>
            </div>
          ) : (
            filteredTodos.map((todo, index) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                index={index}
                onToggle={handleToggleTodo}
                onUpdate={handleUpdateTodo}
                onDelete={handleDeleteTodo}
                onMove={(fromIndex, toIndex) => {
                  // 드래그 앤 드롭으로 순서 변경 (로컬 상태만 변경)
                  // 실제 우선순위는 서버에서 관리
                }}
                assignees={assignees}
                currentUserId={user?.uid}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 할 일 생성</DialogTitle>
          </DialogHeader>
          <TodoForm
            assignees={assignees}
            onSubmit={handleCreateTodo}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

