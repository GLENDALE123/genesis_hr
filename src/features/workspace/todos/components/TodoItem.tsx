/**
 * 할 일 아이템 컴포넌트
 * Jandi 스타일의 간단한 할 일 아이템
 */

import React, { useState, useRef } from 'react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MoreVertical, Edit, Trash2, Calendar, User, Eye, GripVertical, MessageCircle, Clock, Copy, CheckCircle2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import type { Todo } from '../types/todo.types';
import { TodoForm } from './TodoForm';
import { TodoDetailModal } from './TodoDetailModal';
import { Timestamp } from 'firebase/firestore';

export interface TodoItemProps {
  todo: Todo;
  index?: number;
  onToggle: (todoId: string) => void;
  onUpdate: (todoId: string, updates: Partial<Todo>) => void;
  onDelete: (todoId: string) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
  assignees?: Array<{ uid: string; displayName: string; photoURL?: string }>;
  currentUserId?: string;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  index = 0,
  onToggle,
  onUpdate,
  onDelete,
  onMove,
  assignees = [],
  currentUserId,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const handleToggle = async () => {
    setIsCompleting(true);
    onToggle(todo.id);
    // 애니메이션을 위한 짧은 지연
    setTimeout(() => setIsCompleting(false), 300);
  };

  const handleDelete = () => {
    if (confirm('할 일을 삭제하시겠습니까?')) {
      onDelete(todo.id);
    }
  };

  const handleCopy = () => {
    const text = `${todo.title}${todo.description ? `\n${todo.description}` : ''}`;
    navigator.clipboard.writeText(text);
    // 간단한 피드백 (추후 토스트로 변경 가능)
  };

  const handleDoubleClick = () => {
    setIsEditDialogOpen(true);
  };

  // 마감일 포맷팅
  const formatDueDate = (dueDate: Timestamp) => {
    const date = dueDate.toDate();
    if (isToday(date)) {
      return '오늘';
    } else if (isTomorrow(date)) {
      return '내일';
    } else if (isPast(date)) {
      return format(date, 'MM/dd (E)', { locale: ko });
    } else {
      return format(date, 'MM/dd (E)', { locale: ko });
    }
  };

  // 지연된 할 일인지 확인
  const isOverdue =
    !todo.completed &&
    todo.dueDate &&
    isPast(todo.dueDate.toDate());

  // 담당자 정보 가져오기
  const todoAssignees = assignees.filter((user) =>
    todo.assigneeIds.includes(user.uid)
  );

  // 드래그 핸들러
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== index && onMove) {
      onMove(fromIndex, index);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group flex items-start gap-3 p-3.5 rounded-lg border border-transparent hover:border-border hover:bg-accent/40 hover:shadow-sm transition-all duration-200 cursor-pointer relative',
          todo.completed && 'opacity-60 bg-muted/30',
          isDragging && 'opacity-50 scale-95 shadow-lg z-50',
          dragOver && 'ring-2 ring-primary border-primary bg-primary/5 scale-[1.02]'
        )}
        onClick={() => setIsDetailModalOpen(true)}
        draggable={!!onMove}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 드래그 핸들 */}
        {onMove && (
          <div
            className="flex-shrink-0 pt-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* 체크박스 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex-shrink-0 pt-0.5 transition-transform hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={handleToggle}
                  className={cn(
                    'h-5 w-5 cursor-pointer rounded-md transition-all duration-200 hover:ring-2 hover:ring-primary/50',
                    isCompleting && 'animate-pulse scale-110'
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{todo.completed ? '완료 취소' : '완료하기'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 할 일 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3
                ref={titleRef}
                className={cn(
                  'text-sm font-medium leading-5 cursor-text select-text',
                  todo.completed && 'line-through text-muted-foreground',
                  isOverdue && !todo.completed && 'text-destructive',
                  isCompleting && 'animate-pulse'
                )}
                onDoubleClick={handleDoubleClick}
                title="더블클릭하여 편집"
              >
                {todo.title}
              </h3>
              {todo.description && (
                <p
                  className={cn(
                    'text-xs text-muted-foreground mt-1.5 line-clamp-2',
                    todo.completed && 'line-through'
                  )}
                >
                  {todo.description}
                </p>
              )}
            </div>

            {/* 액션 메뉴 */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDetailModalOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  상세보기
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  복사
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>

          {/* 메타 정보 */}
          <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
            {/* 담당자 */}
            {todoAssignees.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex items-center -space-x-1.5">
                        {todoAssignees.slice(0, 4).map((assignee, idx) => (
                          <Avatar
                            key={assignee.uid}
                            className="h-6 w-6 border-2 border-background hover:z-10 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <AvatarImage src={assignee.photoURL} alt={assignee.displayName} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getUserInitial(assignee, assignee.displayName.charAt(0))}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {todoAssignees.length > 4 && (
                          <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                            <span className="text-[9px] font-medium text-muted-foreground">
                              +{todoAssignees.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>담당자: {todoAssignees.map((a) => a.displayName).join(', ')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* 마감일 */}
            {todo.dueDate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md cursor-help',
                        isOverdue
                          ? 'text-destructive font-medium bg-destructive/10'
                          : 'text-muted-foreground bg-muted'
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      <span>{formatDueDate(todo.dueDate)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      마감일: {format(todo.dueDate.toDate(), 'yyyy년 MM월 dd일 HH:mm', {
                        locale: ko,
                      })}
                      {isOverdue && ' (지연됨)'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* 우선순위 */}
            {todo.priority && todo.priority !== 'medium' && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs px-1.5 py-0.5 font-medium',
                  todo.priority === 'high' &&
                    'border-orange-500/50 text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400',
                  todo.priority === 'low' &&
                    'border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400'
                )}
              >
                {todo.priority === 'high' ? '높음' : '낮음'}
              </Badge>
            )}

            {/* 댓글 수 표시 */}
            {todo.commentCount !== undefined && todo.commentCount > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer">
                      <MessageCircle className="h-3 w-3" />
                      <span className="text-xs font-medium">{todo.commentCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{todo.commentCount}개의 댓글</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>할 일 수정</DialogTitle>
          </DialogHeader>
          <TodoForm
            todo={todo}
            assignees={assignees}
            onSubmit={(data) => {
              const updates: Partial<Todo> = {
                ...data,
                dueDate: data.dueDate === null || data.dueDate === undefined 
                  ? undefined 
                  : data.dueDate instanceof Date 
                    ? Timestamp.fromDate(data.dueDate)
                    : data.dueDate,
              };
              onUpdate(todo.id, updates);
              setIsEditDialogOpen(false);
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 상세보기 모달 */}
      <TodoDetailModal
        todo={todo}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onUpdate={onUpdate}
        assignees={assignees}
      />
    </>
  );
};

