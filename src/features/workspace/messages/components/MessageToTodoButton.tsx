/**
 * 메시지에서 할 일 생성 버튼/기능
 * Jandi 스타일: 메시지에서 직접 할 일 생성
 */

import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { CheckSquare } from 'lucide-react';
import { useTodoStore, TodoForm } from '@/features/workspace/todos';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import { toast } from 'sonner';
import type { ChatMessage } from '@/features/chat/types/chat.types';

export interface MessageToTodoButtonProps {
  message: ChatMessage;
  channelId: string;
  workspaceId: string;
  onComplete?: () => void;
}

export const MessageToTodoButton: React.FC<MessageToTodoButtonProps> = ({
  message,
  channelId,
  workspaceId,
  onComplete,
}) => {
  const { user } = useAuthStore();
  const { createTodo } = useTodoStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignees, setAssignees] = useState<
    Array<{ uid: string; displayName: string; photoURL?: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 담당자 목록 로드
  React.useEffect(() => {
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

    if (isDialogOpen) {
      loadAssignees();
    }
  }, [isDialogOpen]);

  const handleCreateTodo = async (data: {
    title?: string;
    description?: string;
    assigneeIds?: string[];
    dueDate?: Date | null;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<void> => {
    if (!user?.uid) return;

    try {
      setIsSubmitting(true);
      await createTodo(
        {
          workspaceId,
          channelId,
          title: data.title || message.text.substring(0, 100),
          description: data.description || message.text,
          assigneeIds: data.assigneeIds,
          dueDate: data.dueDate === null ? undefined : data.dueDate,
          priority: data.priority,
          messageId: message.id,
        },
        user.uid
      );
      toast.success('할 일이 생성되었습니다.');
      setIsDialogOpen(false);
      onComplete?.();
    } catch (error) {
      toast.error('할 일 생성에 실패했습니다.');
      console.error('할 일 생성 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        onClick={() => setIsDialogOpen(true)}
      >
        <CheckSquare className="h-4 w-4 mr-2" />
        할 일로 만들기
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>메시지에서 할 일 생성</DialogTitle>
          </DialogHeader>
          <TodoForm
            assignees={assignees}
            onSubmit={(data) => {
              handleCreateTodo({
                ...data,
                dueDate: data.dueDate instanceof Date ? data.dueDate : data.dueDate === null ? null : undefined,
              });
            }}
            onCancel={() => setIsDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

