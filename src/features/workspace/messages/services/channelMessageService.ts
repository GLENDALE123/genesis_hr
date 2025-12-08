/**
 * 채널 메시지 서비스
 * 채널별 메시지 관리 (기존 ChatService와 유사하지만 채널 전용)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type { ChannelMessage, ChannelMessageAttachment, ChannelMessageMetadata } from '../types/channelMessage.types';
import { MentionService } from './mentionService';
import { ChannelService } from '@/features/workspace/channels';

const MESSAGE_PAGINATION = {
  INITIAL_BATCH: 50,
  OLDER_PAGE_SIZE: 30,
};

/**
 * 채널 메시지 서브컬렉션 경로 가져오기
 */
const getMessagesCollectionPath = (workspaceId: string, channelId: string) => {
  return `workspaces/${workspaceId}/channels/${channelId}/messages`;
};

export class ChannelMessageService {
  /**
   * 채널에 메시지 전송
   */
  static async sendMessage(
    channelId: string,
    workspaceId: string,
    text: string,
    sender: {
      uid: string;
      displayName: string;
      photoURL?: string;
    },
    attachments?: ChannelMessageAttachment[],
    mentionedUserIds?: string[],
    replyTo?: string,
    metadata?: ChannelMessageMetadata
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    // 멘션 파싱 및 대상 사용자 확장
    const parsedMentions = MentionService.parseMentions(text);
    const expandedMentionTargets = await MentionService.getMentionTargets(
      parsedMentions,
      channelId,
      workspaceId
    );

    // 기존 멘션과 확장된 멘션 합치기
    const allMentionedUserIds = [
      ...(mentionedUserIds || []),
      ...expandedMentionTargets,
    ].filter((uid, index, self) => self.indexOf(uid) === index); // 중복 제거

    const now = new Date().toISOString();
    const messageData: any = {
      channelId,
      workspaceId,
      text,
      sender,
      timestamp: now,
      readBy: [sender.uid],
    };

    // attachments가 있고 길이가 0보다 크면 추가
    if (attachments && attachments.length > 0) {
      messageData.attachments = attachments;
    }

    // mentionedUserIds가 있고 길이가 0보다 크면 추가 (undefined 방지)
    if (allMentionedUserIds.length > 0) {
      messageData.mentionedUserIds = allMentionedUserIds;
    }

    // replyTo가 있으면 추가
    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    // metadata가 있으면 추가
    if (metadata) {
      messageData.metadata = metadata;
    }

    const messagesRef = collection(
      db,
      getMessagesCollectionPath(workspaceId, channelId)
    );
    const docRef = await addDoc(messagesRef, messageData);

    // 채널의 마지막 메시지 업데이트 (에러가 발생해도 메시지 전송은 성공한 것으로 처리)
    try {
      await ChannelService.updateLastMessage(channelId, workspaceId, {
        text: text.substring(0, 100),
        senderId: sender.uid,
        senderName: sender.displayName,
        timestamp: now,
      });
    } catch (error) {
      // 마지막 메시지 업데이트 실패는 메시지 전송 실패로 처리하지 않음
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to update last message, but message was sent:', error);
      }
    }

    // 읽지 않은 메시지 수 업데이트 (보낸 사람 제외한 모든 채널 멤버)
    // 에러가 발생해도 메시지 전송은 성공한 것으로 처리
    try {
      const { UnreadMessageService } = await import('./unreadMessageService');
      const channel = await ChannelService.getChannel(channelId, workspaceId);
      if (channel) {
        const otherMembers = channel.members.filter((uid) => uid !== sender.uid);
        // 에러가 발생해도 계속 진행 (비동기로 실행하여 블로킹 방지)
        Promise.allSettled(
          otherMembers.map((uid) =>
            UnreadMessageService.incrementUnreadCount(channelId, workspaceId, uid).catch((err) => {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Failed to increment unread count for user ${uid}:`, err);
              }
            })
          )
        ).catch(() => {
          // 에러는 무시하고 계속 진행
        });
      }
    } catch (error) {
      // 읽지 않은 메시지 수 업데이트 실패는 메시지 전송 실패로 처리하지 않음
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to update unread count, but message was sent:', error);
      }
    }

    return docRef.id;
  }

  /**
   * 채널의 초기 메시지 조회
   */
  static async fetchInitialMessages(
    channelId: string,
    workspaceId: string,
    limitCount: number = MESSAGE_PAGINATION.INITIAL_BATCH
  ): Promise<ChannelMessage[]> {
    if (!db) throw new Error('Firestore is not initialized');

    try {
      // 서브컬렉션에서 직접 조회 (인덱스 불필요)
      const q = query(
        collection(db, getMessagesCollectionPath(workspaceId, channelId)),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const messages: ChannelMessage[] = [];

      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          channelId,
          workspaceId,
          ...doc.data(),
        } as ChannelMessage);
      });

      // 시간순으로 정렬 (오래된 것부터)
      return messages.reverse();
    } catch (error) {
      console.error('Failed to fetch initial channel messages:', error);
      // 인덱스 에러인 경우 빈 배열 반환
      if (error instanceof Error && error.message.includes('index')) {
        console.warn('Firestore index required. Returning empty messages array.');
        return [];
      }
      throw error;
    }
  }

  /**
   * 채널의 이전 메시지 조회
   */
  static async fetchOlderMessages(
    channelId: string,
    workspaceId: string,
    beforeTimestamp: string,
    limitCount: number = MESSAGE_PAGINATION.OLDER_PAGE_SIZE
  ): Promise<ChannelMessage[]> {
    if (!db) throw new Error('Firestore is not initialized');

    try {
      // 서브컬렉션에서 직접 조회
      const q = query(
        collection(db, getMessagesCollectionPath(workspaceId, channelId)),
        where('timestamp', '<', beforeTimestamp),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const messages: ChannelMessage[] = [];

      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          channelId,
          workspaceId,
          ...doc.data(),
        } as ChannelMessage);
      });

      // 시간순으로 정렬 (오래된 것부터)
      return messages.reverse();
    } catch (error) {
      console.error('Failed to fetch older channel messages:', error);
      // 인덱스 에러인 경우 빈 배열 반환
      if (error instanceof Error && error.message.includes('index')) {
        console.warn('Firestore index required. Returning empty messages array.');
        return [];
      }
      throw error;
    }
  }

  /**
   * 채널 메시지 실시간 구독
   */
  static subscribeToChannelMessages(
    channelId: string,
    workspaceId: string,
    callback: (messages: ChannelMessage[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = MESSAGE_PAGINATION.INITIAL_BATCH
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    try {
      // 서브컬렉션에서 직접 구독
      const q = query(
        collection(db, getMessagesCollectionPath(workspaceId, channelId)),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      let unsubscribeFn: (() => void) | null = null;

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const messages: ChannelMessage[] = [];
          querySnapshot.forEach((doc) => {
            messages.push({
              id: doc.id,
              channelId,
              workspaceId,
              ...doc.data(),
            } as ChannelMessage);
          });
          
          // 시간순으로 정렬 (오래된 것부터)
          callback(messages.reverse());
        },
        (error) => {
          // 권한 오류인 경우 구독을 자동으로 정리
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isPermissionError = 
            errorMessage.includes('permission') || 
            errorMessage.includes('insufficient') ||
            errorMessage.includes('Missing or insufficient permissions');
          
          if (isPermissionError) {
            console.warn('⚠️ [ChannelMessageService] 권한 오류로 인해 구독을 중단합니다:', error);
            // 구독 정리
            if (unsubscribeFn) {
              unsubscribeFn();
              unsubscribeFn = null;
            }
          } else {
            console.error('Failed to subscribe to channel messages:', error);
          }
          onError?.(error);
        }
      );

      unsubscribeFn = unsubscribe;

      return () => {
        if (unsubscribeFn) {
          unsubscribeFn();
          unsubscribeFn = null;
        }
      };
    } catch (error) {
      console.error('Failed to create subscription:', error);
      onError?.(error as Error);
      return () => {};
    }
  }

  /**
   * 메시지 읽음 표시
   */
  static async markMessageAsRead(
    channelId: string,
    workspaceId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(
      db,
      getMessagesCollectionPath(workspaceId, channelId),
      messageId
    );
    const messageDoc = await getDoc(docRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const message = messageDoc.data() as ChannelMessage;
    if (!message.readBy.includes(userId)) {
      await updateDoc(docRef, {
        readBy: arrayUnion(userId),
      });
    }
  }

  /**
   * 메시지 수정
   */
  static async updateMessage(
    channelId: string,
    workspaceId: string,
    messageId: string,
    text: string,
    attachments?: ChannelMessageAttachment[]
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(
      db,
      getMessagesCollectionPath(workspaceId, channelId),
      messageId
    );

    const messageDoc = await getDoc(docRef);
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const now = new Date().toISOString();
    const updateData: any = {
      text,
      editedAt: now,
    };

    // attachments가 제공된 경우 업데이트
    if (attachments !== undefined) {
      if (attachments.length > 0) {
        updateData.attachments = attachments;
      } else {
        // 빈 배열인 경우 attachments 필드 제거
        updateData.attachments = [];
      }
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * 메시지 삭제
   * 메시지와 관련된 스레드, 고정 메시지도 함께 처리해야 함
   */
  static async deleteMessage(
    channelId: string,
    workspaceId: string,
    messageId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(
      db,
      getMessagesCollectionPath(workspaceId, channelId),
      messageId
    );

    // 메시지 존재 확인
    const messageDoc = await getDoc(docRef);
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    // 메시지 삭제
    await deleteDoc(docRef);

    // 관련된 고정 메시지도 삭제 (PinnedMessageService에서 처리하거나 여기서 처리)
    try {
      const { PinnedMessageService } = await import('./pinnedMessageService');
      const pinnedMessages = await PinnedMessageService.getChannelPinnedMessages(
        channelId,
        workspaceId
      );
      const pinnedMessage = pinnedMessages.find((p) => p.messageId === messageId);
      if (pinnedMessage) {
        await PinnedMessageService.unpinMessage(
          pinnedMessage.id,
          channelId,
          workspaceId
        );
      }
    } catch (error) {
      // 고정 메시지 삭제 실패는 메시지 삭제 실패로 처리하지 않음
      console.warn('Failed to delete pinned message:', error);
    }
  }
}

