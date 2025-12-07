/**
 * 할 일 알림 서비스
 * Jandi 스타일: 담당자 지정, 마감일 임박 알림
 */

import { NotificationType, NotificationPriority } from '@/shared/services/notifications/notificationService';
import { functions } from '@/shared/services/firebase/config';
import { httpsCallable } from 'firebase/functions';
import type { Todo } from '../types/todo.types';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface NotificationPayload {
  type: string;
  requestId: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  targetUsers: string[];
  relatedData?: Record<string, any>;
  senderName?: string;
  senderUid?: string;
  senderAvatar?: string;
}

export class TodoNotificationService {
  /**
   * Firebase Functions를 통한 알림 전송
   */
  private static async sendNotification(payload: NotificationPayload): Promise<void> {
    if (!functions) {
      console.warn('Firebase Functions가 초기화되지 않았습니다.');
      return;
    }

    try {
      const createNotification = httpsCallable(functions, 'createNotification');
      await createNotification(payload);
    } catch (error) {
      console.error('할 일 알림 전송 실패:', error);
    }
  }

  /**
   * 할 일 담당자 지정 알림
   */
  static async notifyTodoAssigned(
    todo: Todo,
    assigneeIds: string[],
    assignedBy: { uid: string; displayName: string; photoURL?: string }
  ): Promise<void> {
    if (assigneeIds.length === 0) return;

    try {
      await this.sendNotification({
        type: NotificationType.TODO_ASSIGNED,
        requestId: todo.id,
        title: '할 일이 할당되었습니다',
        body: `${assignedBy.displayName}님이 "${todo.title}" 할 일을 할당했습니다.`,
        priority: NotificationPriority.NORMAL,
        targetUsers: assigneeIds,
        senderName: assignedBy.displayName,
        senderUid: assignedBy.uid,
        senderAvatar: assignedBy.photoURL,
        relatedData: {
          channelId: todo.channelId,
          workspaceId: todo.workspaceId,
          todoId: todo.id,
        },
      });
    } catch (error) {
      console.error('할 일 할당 알림 전송 실패:', error);
    }
  }

  /**
   * 할 일 마감일 임박 알림
   */
  static async notifyTodoDueSoon(
    todo: Todo,
    daysUntilDue: number
  ): Promise<void> {
    if (!todo.dueDate || todo.completed || todo.assigneeIds.length === 0) return;

    const dueDateStr = format(todo.dueDate.toDate(), 'yyyy-MM-dd (E)', { locale: ko });
    const daysText = daysUntilDue === 0 ? '오늘' : `${daysUntilDue}일 후`;

    try {
      await this.sendNotification({
        type: NotificationType.TODO_DUE_SOON,
        requestId: todo.id,
        title: `할 일 마감일이 ${daysText}입니다`,
        body: `"${todo.title}" 할 일의 마감일이 ${dueDateStr}입니다.`,
        priority: daysUntilDue === 0 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
        targetUsers: todo.assigneeIds,
        relatedData: {
          channelId: todo.channelId,
          workspaceId: todo.workspaceId,
          todoId: todo.id,
          dueDate: dueDateStr,
        },
      });
    } catch (error) {
      console.error('할 일 마감일 임박 알림 전송 실패:', error);
    }
  }

  /**
   * 할 일 완료 알림
   */
  static async notifyTodoCompleted(
    todo: Todo,
    completedBy: { uid: string; displayName: string; photoURL?: string }
  ): Promise<void> {
    // 담당자에게만 알림 (완료한 사람 제외)
    const notifyTo = todo.assigneeIds.filter((id) => id !== completedBy.uid);
    if (notifyTo.length === 0) return;

    try {
      await this.sendNotification({
        type: NotificationType.TODO_COMPLETED,
        requestId: todo.id,
        title: '할 일이 완료되었습니다',
        body: `${completedBy.displayName}님이 "${todo.title}" 할 일을 완료했습니다.`,
        priority: NotificationPriority.LOW,
        targetUsers: notifyTo,
        senderName: completedBy.displayName,
        senderUid: completedBy.uid,
        senderAvatar: completedBy.photoURL,
        relatedData: {
          channelId: todo.channelId,
          workspaceId: todo.workspaceId,
          todoId: todo.id,
        },
      });
    } catch (error) {
      console.error('할 일 완료 알림 전송 실패:', error);
    }
  }

  /**
   * 마감일 임박 할 일 체크 및 알림 (일일 배치 작업용)
   */
  static async checkAndNotifyDueTodos(
    todos: Todo[],
    checkDays: number[] = [0, 1] // 오늘, 내일
  ): Promise<void> {
    const now = Timestamp.now();
    const notifications: Promise<void>[] = [];

    todos.forEach((todo) => {
      if (todo.completed || !todo.dueDate || todo.assigneeIds.length === 0) return;

      const dueDate = todo.dueDate.toDate();
      const nowDate = now.toDate();
      const diffDays = Math.ceil((dueDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

      if (checkDays.includes(diffDays)) {
        notifications.push(this.notifyTodoDueSoon(todo, diffDays));
      }
    });

    await Promise.all(notifications);
  }
}

