/**
 * Todo 위젯
 * 워크스페이스 Todo를 표시하는 위젯
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceTodos } from '@/shared/hooks/useWorkspaceTodos';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/shared/lib/utils';
import { CheckSquare, Square, Clock, Hash } from 'lucide-react';

export const TodoWidget: React.FC = () => {
  const { todos, isLoading, error, toggleTodo } = useWorkspaceTodos();
  const navigate = useNavigate();

  const handleTodoClick = (
    workspaceId: string,
    channelId: string,
    todoId: string
  ) => {
    // 워크스페이스 페이지로 이동하고 해당 채널 선택
    navigate(`/workspace?workspace=${workspaceId}&channel=${channelId}&todo=${todoId}`);
  };

  const handleToggle = async (
    e: React.MouseEvent,
    workspaceId: string,
    channelId: string,
    todoId: string
  ) => {
    e.stopPropagation();
    await toggleTodo(workspaceId, channelId, todoId);
  };

  const formatDueDate = (timestamp: any) => {
    if (!timestamp) return null;
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}월 ${day}일`;
    } catch {
      return null;
    }
  };

  const isOverdue = (todo: (typeof todos)[0]) => {
    if (todo.completed || !todo.dueDate) return false;
    try {
      const dueDate = todo.dueDate.toDate ? todo.dueDate.toDate() : new Date(todo.dueDate);
      return dueDate < new Date();
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-xs font-semibold text-muted-foreground">할 일</h3>
        <div className="text-xs text-muted-foreground">
          {todos.filter((t) => !t.completed).length}개
        </div>
      </div>

      {/* Todo 목록 */}
      <ScrollArea className="flex-1">
        <div className="px-2 py-2 space-y-1">
          {isLoading && (
            <div className="text-center text-xs text-muted-foreground py-4">
              로딩 중...
            </div>
          )}

          {error && (
            <div className="text-center text-xs text-destructive py-4">
              {error}
            </div>
          )}

          {!isLoading && !error && todos.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-4">
              할 일이 없습니다.
            </div>
          )}

          {!isLoading &&
            !error &&
            todos.map((todo) => {
              const overdue = isOverdue(todo);
              const dueDateStr = formatDueDate(todo.dueDate);

              return (
                <div
                  key={`${todo.workspaceId}_${todo.channelId}_${todo.id}`}
                  className={cn(
                    'rounded-md p-2 cursor-pointer transition-colors hover:bg-accent',
                    todo.completed && 'opacity-60'
                  )}
                  onClick={() =>
                    handleTodoClick(todo.workspaceId, todo.channelId, todo.id)
                  }
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="mt-0.5"
                      onClick={(e) =>
                        handleToggle(
                          e,
                          todo.workspaceId,
                          todo.channelId,
                          todo.id
                        )
                      }
                    >
                      {todo.completed ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-sm font-medium truncate',
                          todo.completed && 'line-through text-muted-foreground'
                        )}
                      >
                        {todo.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          <span className="truncate">
                            {todo.workspaceName} / {todo.channelName}
                          </span>
                        </div>
                        {dueDateStr && (
                          <div
                            className={cn(
                              'flex items-center gap-1 text-xs',
                              overdue
                                ? 'text-destructive font-medium'
                                : 'text-muted-foreground'
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            <span>{dueDateStr}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
};

