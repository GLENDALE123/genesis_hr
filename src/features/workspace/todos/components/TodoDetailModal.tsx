/**
 * 할 일 상세보기 모달
 * Jandi 스타일: 할 일 상세 정보, 댓글, 첨부파일
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Textarea } from '@/shared/components/ui/textarea';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Calendar,
  User,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { getUserInitial } from '@/shared/utils/user/userUtils';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ThreadService } from '../../threads';
import type { Thread } from '../../threads';
import { ChannelMessageComposer, ChannelMessageComponent } from '@/features/workspace/messages';
import type { ChannelMessage } from '@/features/workspace/messages';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import type { Todo } from '../types/todo.types';
import { Timestamp } from 'firebase/firestore';

export interface TodoDetailModalProps {
  todo: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (todoId: string, updates: Partial<Todo>) => void;
  assignees?: Array<{ uid: string; displayName: string; photoURL?: string }>;
}

export const TodoDetailModal: React.FC<TodoDetailModalProps> = ({
  todo,
  open,
  onOpenChange,
  onUpdate,
  assignees = [],
}) => {
  const { user } = useAuthStore();
  const [thread, setThread] = useState<Thread | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [commentText, setCommentText] = useState('');

  // 할 일이 변경되면 스레드 로드
  useEffect(() => {
    if (!todo || !open) return;

    const loadThread = async () => {
      setIsLoadingThread(true);
      try {
        // 할 일 ID를 parentMessageId로 사용하여 스레드 찾기
        // 할 일 댓글을 위한 스레드가 없으면 생성
        let existingThread = await ThreadService.getMessageThread(todo.id, todo.workspaceId, todo.channelId);
        
        if (!existingThread) {
          // 스레드가 없으면 생성하지 않고 null 유지
          // 댓글 작성 시 자동 생성
          setThread(null);
        } else {
          setThread(existingThread);
        }
      } catch (error) {
        console.error('스레드 로드 실패:', error);
      } finally {
        setIsLoadingThread(false);
      }
    };

    loadThread();
  }, [todo?.id, open]);

  // 스레드 구독
  useEffect(() => {
    if (!thread || !open) return;

    const unsubscribe = ThreadService.subscribeToThread(
      thread.id,
      todo?.workspaceId || '',
      todo?.channelId || '',
      (updatedThread) => {
        setThread(updatedThread);
      },
      (error) => {
        console.error('스레드 구독 오류:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [thread?.id, todo?.workspaceId, todo?.channelId, open]);

  if (!todo) return null;

  // 마감일 포맷팅
  const formatDueDate = (dueDate: Timestamp) => {
    const date = dueDate.toDate();
    if (isToday(date)) {
      return '오늘';
    } else if (isTomorrow(date)) {
      return '내일';
    } else if (isPast(date)) {
      return format(date, 'yyyy년 MM월 dd일 (E)', { locale: ko });
    } else {
      return format(date, 'yyyy년 MM월 dd일 (E)', { locale: ko });
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

  // 댓글 작성
  const handleAddComment = async () => {
    if (!user?.uid || !commentText.trim() || !todo) return;

    try {
      // 스레드가 없으면 생성
      if (!thread) {
        const threadId = await ThreadService.createThread({
          channelId: todo.channelId,
          workspaceId: todo.workspaceId,
          parentMessageId: todo.id, // 할 일 ID를 parentMessageId로 사용
          initialMessage: {
            channelId: todo.channelId,
            workspaceId: todo.workspaceId,
            text: commentText.trim(),
            sender: {
              uid: user.uid,
              displayName: user.displayName || '',
              photoURL: user.photoURL || undefined,
            },
            attachments: [],
            mentionedUserIds: [],
          },
        });

        const newThread = await ThreadService.getThread(threadId, todo.workspaceId, todo.channelId);
        if (newThread) {
          setThread(newThread);
        }
      } else {
        // 기존 스레드에 메시지 추가
        await ThreadService.addThreadMessage({
          threadId: thread.id,
          workspaceId: todo.workspaceId,
          channelId: todo.channelId,
          message: {
            channelId: todo.channelId,
            workspaceId: todo.workspaceId,
            text: commentText.trim(),
            sender: {
              uid: user.uid,
              displayName: user.displayName || '',
              photoURL: user.photoURL || undefined,
            },
            attachments: [],
            mentionedUserIds: [],
          },
        });
      }

      setCommentText('');
    } catch (error) {
      console.error('댓글 작성 실패:', error);
    }
  };

  // 키보드 단축키: Escape로 닫기
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !commentText.trim()) {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, commentText, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2
              className={cn(
                'h-5 w-5',
                todo.completed ? 'text-green-500' : 'text-muted-foreground'
              )}
            />
            할 일 상세
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* 할 일 정보 */}
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className={cn(
                      'h-5 w-5 mt-0.5 flex-shrink-0',
                      todo.completed ? 'text-green-500' : 'text-muted-foreground'
                    )}
                  />
                  <div className="flex-1">
                    <h2
                      className={cn(
                        'text-xl font-semibold leading-6',
                        todo.completed && 'line-through text-muted-foreground',
                        isOverdue && !todo.completed && 'text-destructive'
                      )}
                    >
                      {todo.title}
                    </h2>
                    {todo.description && (
                      <p
                        className={cn(
                          'text-sm text-muted-foreground mt-2 leading-5',
                          todo.completed && 'line-through'
                        )}
                      >
                        {todo.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 상태 및 메타 정보 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 담당자 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">담당자</span>
                  </div>
                  {todoAssignees.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {todoAssignees.map((assignee) => (
                        <div
                          key={assignee.uid}
                          className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={assignee.photoURL} alt={assignee.displayName} />
                            <AvatarFallback className="text-xs">
                              {getUserInitial(assignee, assignee.displayName.charAt(0))}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{assignee.displayName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">담당자 없음</span>
                  )}
                </div>

                {/* 마감일 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">마감일</span>
                  </div>
                  {todo.dueDate ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm',
                          isOverdue
                            ? 'text-destructive font-medium'
                            : 'text-foreground'
                        )}
                      >
                        {formatDueDate(todo.dueDate)}
                      </span>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          지연됨
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">마감일 없음</span>
                  )}
                </div>

                {/* 우선순위 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">우선순위</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      todo.priority === 'high' && 'border-orange-500 text-orange-500',
                      todo.priority === 'low' && 'border-blue-500 text-blue-500',
                      todo.priority === 'medium' && 'border-gray-500 text-gray-500'
                    )}
                  >
                    {todo.priority === 'high'
                      ? '높음'
                      : todo.priority === 'low'
                      ? '낮음'
                      : '보통'}
                  </Badge>
                </div>

                {/* 상태 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">상태</span>
                  </div>
                  <Badge
                    variant={todo.completed ? 'secondary' : 'default'}
                    className="text-xs"
                  >
                    {todo.completed ? '완료됨' : '진행중'}
                  </Badge>
                </div>
              </div>

              {/* 생성 정보 */}
              <div className="text-xs text-muted-foreground">
                생성일: {format(todo.createdAt.toDate(), 'yyyy년 MM월 dd일 HH:mm', {
                  locale: ko,
                })}
                {todo.completed && todo.completedAt && (
                  <span className="ml-4">
                    완료일: {format(todo.completedAt.toDate(), 'yyyy년 MM월 dd일 HH:mm', {
                      locale: ko,
                    })}
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* 댓글 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">댓글</h3>
                {thread && (
                  <Badge variant="secondary" className="text-xs">
                    {thread.messages.length}
                  </Badge>
                )}
              </div>

              {/* 댓글 목록 */}
              {isLoadingThread ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <div>로딩 중...</div>
                </div>
              ) : thread && thread.messages.length > 0 ? (
                <div className="space-y-3">
                  {thread.messages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-lg border border-border bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <ChannelMessageComponent
                        message={message}
                        currentUserId={user?.uid || ''}
                        showAvatar={true}
                        channelMembers={thread.participants}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">댓글이 없습니다.</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">
                    첫 번째 댓글을 작성해보세요.
                  </div>
                </div>
              )}

              {/* 댓글 작성 */}
              <div className="space-y-3 pt-4 border-t bg-muted/30 -mx-6 px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                    <AvatarFallback className="text-xs">
                      {user?.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="댓글을 입력하세요..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                      className="resize-none bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleAddComment();
                        } else if (e.key === 'Escape') {
                          setCommentText('');
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Ctrl/Cmd + Enter로 전송
                  </span>
                  <div className="flex gap-2">
                    {commentText.trim() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommentText('')}
                        className="h-8"
                      >
                        취소
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="h-8 px-4"
                    >
                      댓글 작성
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

