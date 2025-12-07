/**
 * 할 일 생성/수정 폼 컴포넌트
 * Jandi 스타일의 간단한 할 일 폼
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, X, User } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import type { Todo, TodoPriority, UpdateTodoData } from '../types/todo.types';

export interface TodoFormProps {
  todo?: Todo;
  assignees: Array<{ uid: string; displayName: string; photoURL?: string }>;
  onSubmit: (data: UpdateTodoData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const TodoForm: React.FC<TodoFormProps> = ({
  todo,
  assignees,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState(todo?.title || '');
  const [description, setDescription] = useState(todo?.description || '');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    todo?.assigneeIds || []
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    todo?.dueDate ? todo.dueDate.toDate() : undefined
  );
  const [priority, setPriority] = useState<TodoPriority>(
    todo?.priority || 'medium'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeIds: selectedAssignees,
      dueDate: dueDate || undefined,
      priority: priority !== 'medium' ? priority : undefined,
    });
  };

  const toggleAssignee = (uid: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const selectedAssigneeUsers = assignees.filter((user) =>
    selectedAssignees.includes(user.uid)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 제목 */}
      <div>
        <Label htmlFor="title" className="text-sm font-medium">
          제목 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일 제목을 입력하세요"
          required
          className="mt-1.5"
          autoFocus
        />
      </div>

      {/* 설명 */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          설명
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="할 일에 대한 설명을 입력하세요 (선택사항)"
          rows={3}
          className="mt-1.5 resize-none"
        />
      </div>

      {/* 담당자 */}
      <div>
        <Label>담당자</Label>
        <div className="mt-1 space-y-2">
          {/* 선택된 담당자 표시 */}
          {selectedAssigneeUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedAssigneeUsers.map((user) => (
                <Badge
                  key={user.uid}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback className="text-[8px]">
                      {getUserInitial(user, user.displayName.charAt(0))}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{user.displayName}</span>
                  <button
                    type="button"
                    onClick={() => toggleAssignee(user.uid)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* 담당자 선택 드롭다운 */}
          <Select
            value=""
            onValueChange={(value) => {
              if (value && !selectedAssignees.includes(value)) {
                toggleAssignee(value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="담당자 선택" />
            </SelectTrigger>
            <SelectContent>
              {assignees
                .filter((user) => !selectedAssignees.includes(user.uid))
                .map((user) => (
                  <SelectItem key={user.uid} value={user.uid}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback className="text-xs">
                          {getUserInitial(user, user.displayName.charAt(0))}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 마감일 및 우선순위 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 마감일 */}
        <div>
          <Label>마감일</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal mt-1',
                  !dueDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? (
                  format(dueDate, 'yyyy-MM-dd', { locale: ko })
                ) : (
                  <span>날짜 선택</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
              {dueDate && (
                <div className="p-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setDueDate(undefined)}
                  >
                    날짜 제거
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* 우선순위 */}
        <div>
          <Label>우선순위</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as TodoPriority)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">낮음</SelectItem>
              <SelectItem value="medium">보통</SelectItem>
              <SelectItem value="high">높음</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={!title.trim() || isSubmitting}>
          {isSubmitting ? '저장 중...' : todo ? '수정' : '생성'}
        </Button>
      </div>
    </form>
  );
};

