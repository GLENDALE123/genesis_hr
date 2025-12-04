/**
 * 모든 할 일 통합 뷰 페이지
 * Jandi 스타일: 모든 워크스페이스의 할 일을 한 곳에서 관리
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Plus, Loader2, Check, X, CheckCircle2, Hash } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { TodoService } from '@/features/workspace/services/todoService';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { TodoItem } from '@/features/workspace/components/TodoItem';
import { TodoForm } from '@/features/workspace/components/TodoForm';
import { TodoFilter } from '@/features/workspace/components/TodoFilter';
import { LoadingSpinner } from '@/shared/components/common';
import type { Todo, UpdateTodoData, TodoFilterOptions } from '@/features/workspace/types/todo.types';
import { Timestamp } from 'firebase/firestore';

export default function AllTodosPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [assignees, setAssignees] = useState<
    Array<{ uid: string; displayName: string; photoURL?: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<TodoFilterOptions>({
    filter: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    incomplete: 0,
    overdue: 0,
    myTodos: 0,
  });

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

  // 할 일 목록 로드
  useEffect(() => {
    if (!user?.uid) return;

    const loadTodos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const allTodos = await TodoService.getAllTodos(user.uid, filterOptions);
        setTodos(allTodos);
        
        // 통계 계산
        const allStats = await TodoService.getAllTodoStats(user.uid);
        setStats(allStats);
      } catch (err) {
        console.error('할 일 목록 로드 실패:', err);
        setError('할 일 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTodos();
  }, [user?.uid, filterOptions]);

  // 빠른 추가 핸들러
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !quickAddText.trim() || isQuickAdding) return;

    // 빠른 추가는 기본 워크스페이스/채널이 필요하므로 다이얼로그로 전환
    setIsCreateDialogOpen(true);
    setQuickAddText('');
  };

  // 할 일 생성
  const handleCreateTodo = async (data: UpdateTodoData) => {
    if (!user?.uid) return;

    // 워크스페이스와 채널 선택이 필요하므로 워크스페이스 페이지로 이동
    navigate('/workspace');
  };

  // 할 일 업데이트
  const handleUpdateTodo = async (todoId: string, updates: Partial<Todo>) => {
    if (!user?.uid || !updates) return;

    try {
      await TodoService.updateTodo(
        updates.workspaceId || '',
        updates.channelId || '',
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
      
      // 목록 새로고침
      const allTodos = await TodoService.getAllTodos(user.uid, filterOptions);
      setTodos(allTodos);
    } catch (error) {
      console.error('할 일 업데이트 실패:', error);
    }
  };

  // 할 일 토글
  const handleToggleTodo = async (todoId: string) => {
    if (!user?.uid) return;

    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    try {
      await TodoService.toggleTodo(todo.workspaceId, todo.channelId, todoId, user.uid);
      
      // 목록 새로고침
      const allTodos = await TodoService.getAllTodos(user.uid, filterOptions);
      setTodos(allTodos);
    } catch (error) {
      console.error('할 일 토글 실패:', error);
    }
  };

  // 할 일 삭제
  const handleDeleteTodo = async (todoId: string) => {
    if (!user?.uid) return;

    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    try {
      await TodoService.deleteTodo(todo.workspaceId, todo.channelId, todoId);
      
      // 목록 새로고침
      const allTodos = await TodoService.getAllTodos(user.uid, filterOptions);
      setTodos(allTodos);
    } catch (error) {
      console.error('할 일 삭제 실패:', error);
    }
  };

  // 필터 변경
  const handleFilterChange = (options: TodoFilterOptions) => {
    setFilterOptions(options);
  };

  // 필터 초기화
  const handleClearFilters = () => {
    setFilterOptions({
      filter: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  // 필터링 및 정렬된 할 일 목록
  const filteredTodos = useMemo(() => {
    let filtered = [...todos];

    // 내 할 일 필터
    if (filterOptions.filter === 'my-todos' && user?.uid) {
      filtered = filtered.filter((todo) => todo.assigneeIds.includes(user.uid));
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filterOptions.sortBy) {
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

      return filterOptions.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [todos, filterOptions, user?.uid]);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">모든 할 일</h1>
            {stats.total > 0 && (
              <span className="text-xs text-muted-foreground">
                총 {stats.total}개 (미완료 {stats.incomplete}개)
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/workspace')}
            className="gap-1.5 h-8"
          >
            <Hash className="h-3.5 w-3.5" />
            <span className="text-xs">워크스페이스에서 추가</span>
          </Button>
        </div>

        {/* 필터 */}
        <TodoFilter
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          currentUserId={user?.uid}
        />
      </div>

      {/* 할 일 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center text-sm text-destructive py-12">
              {error}
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
                <p>워크스페이스 채널에서 할 일을 생성할 수 있습니다.</p>
                <p className="text-muted-foreground/70">
                  워크스페이스로 이동하여 할 일을 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            filteredTodos.map((todo, index) => (
              <div key={`${todo.workspaceId}-${todo.channelId}-${todo.id}`} className="relative">
                {/* 워크스페이스/채널 정보 */}
                <div className="absolute top-1 right-1 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/workspace?workspace=${todo.workspaceId}&channel=${todo.channelId}`)}
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    채널로 이동
                  </Button>
                </div>
                <TodoItem
                  todo={todo}
                  index={index}
                  onToggle={handleToggleTodo}
                  onUpdate={handleUpdateTodo}
                  onDelete={handleDeleteTodo}
                  assignees={assignees}
                  currentUserId={user?.uid}
                />
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

