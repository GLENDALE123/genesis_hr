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
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { MessageStatus } from '@/features/chat/types/chat.types';
import type { ChatMessage, MessageAttachment } from '@/features/chat/types/chat.types';
import { MentionService } from './mentionService';
import { ChannelService } from './channelService';

const CHANNEL_MESSAGES_COLLECTION = 'channelMessages';
const MESSAGE_PAGINATION = {
  INITIAL_BATCH: 50,
  OLDER_PAGE_SIZE: 30,
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
    attachments?: MessageAttachment[],
    mentionedUserIds?: string[],
    replyTo?: string
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
    const messageData: Omit<ChatMessage, 'id'> = {
      directMessageRoomId: channelId,
      chatRoomId: channelId, // 채널 ID를 chatRoomId로 사용
      text,
      sender,
      timestamp: now,
      status: MessageStatus.SENT,
      readBy: [sender.uid],
      ...(attachments && attachments.length > 0 && { attachments }),
      mentionedUserIds: allMentionedUserIds.length > 0 ? allMentionedUserIds : undefined,
      ...(replyTo && { replyTo }),
    };

    const docRef = await addDoc(
      collection(db, CHANNEL_MESSAGES_COLLECTION),
      messageData
    );

    // 채널의 마지막 메시지 업데이트
    await ChannelService.updateLastMessage(channelId, {
      text: text.substring(0, 100),
      senderId: sender.uid,
      senderName: sender.displayName,
      timestamp: now,
    });

    // 읽지 않은 메시지 수 업데이트 (보낸 사람 제외한 모든 채널 멤버)
    const { UnreadMessageService } = await import('./unreadMessageService');
    const channel = await ChannelService.getChannel(channelId);
    if (channel) {
      const otherMembers = channel.members.filter((uid) => uid !== sender.uid);
      await Promise.all(
        otherMembers.map((uid) =>
          UnreadMessageService.incrementUnreadCount(channelId, uid)
        )
      );
    }

    return docRef.id;
  }

  /**
   * 채널의 초기 메시지 조회
   */
  static async fetchInitialMessages(
    channelId: string,
    limitCount: number = MESSAGE_PAGINATION.INITIAL_BATCH
  ): Promise<ChatMessage[]> {
    if (!db) throw new Error('Firestore is not initialized');

    try {
      // 인덱스 문제를 피하기 위해 orderBy 없이 조회 후 클라이언트에서 정렬
      const q = query(
        collection(db, CHANNEL_MESSAGES_COLLECTION),
        where('chatRoomId', '==', channelId),
        limit(limitCount * 2) // 정렬 후 limit을 적용하기 위해 더 많이 가져옴
      );

      const querySnapshot = await getDocs(q);
      const messages: ChatMessage[] = [];

      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        } as ChatMessage);
      });

      // 클라이언트에서 시간순으로 정렬 (최신순)
      messages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // 내림차순 (최신순)
      });

      // limit 적용
      const limitedMessages = messages.slice(0, limitCount);

      // 시간순으로 정렬 (오래된 것부터)
      return limitedMessages.reverse();
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
    beforeTimestamp: string,
    limitCount: number = MESSAGE_PAGINATION.OLDER_PAGE_SIZE
  ): Promise<ChatMessage[]> {
    if (!db) throw new Error('Firestore is not initialized');

    try {
      // 인덱스 문제를 피하기 위해 orderBy 없이 조회 후 클라이언트에서 정렬
      const q = query(
        collection(db, CHANNEL_MESSAGES_COLLECTION),
        where('chatRoomId', '==', channelId),
        limit(limitCount * 3) // 정렬 후 필터링하기 위해 더 많이 가져옴
      );

      const querySnapshot = await getDocs(q);
      const messages: ChatMessage[] = [];

      querySnapshot.forEach((doc) => {
        const message = {
          id: doc.id,
          ...doc.data(),
        } as ChatMessage;
        
        // beforeTimestamp 이전의 메시지만 필터링
        if (new Date(message.timestamp).getTime() < new Date(beforeTimestamp).getTime()) {
          messages.push(message);
        }
      });

      // 클라이언트에서 시간순으로 정렬 (최신순)
      messages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // 내림차순 (최신순)
      });

      // limit 적용
      const limitedMessages = messages.slice(0, limitCount);

      return limitedMessages.reverse();
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
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = MESSAGE_PAGINATION.INITIAL_BATCH
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    try {
      // 인덱스 문제를 피하기 위해 orderBy 없이 조회 후 클라이언트에서 정렬
      const q = query(
        collection(db, CHANNEL_MESSAGES_COLLECTION),
        where('chatRoomId', '==', channelId),
        limit(limitCount * 2) // 정렬 후 limit을 적용하기 위해 더 많이 가져옴
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const messages: ChatMessage[] = [];
          querySnapshot.forEach((doc) => {
            messages.push({
              id: doc.id,
              ...doc.data(),
            } as ChatMessage);
          });
          
          // 클라이언트에서 시간순으로 정렬 (최신순)
          messages.sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA; // 내림차순 (최신순)
          });

          // limit 적용
          const limitedMessages = messages.slice(0, limitCount);

          // 시간순으로 정렬 (오래된 것부터)
          callback(limitedMessages.reverse());
        },
        (error) => {
          console.error('Failed to subscribe to channel messages:', error);
          // 인덱스 에러인 경우 빈 배열로 콜백 호출
          if (error instanceof Error && error.message.includes('index')) {
            console.warn('Firestore index required. Returning empty messages array.');
            callback([]);
          } else {
            onError?.(error);
          }
        }
      );

      return unsubscribe;
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
    messageId: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNEL_MESSAGES_COLLECTION, messageId);
    const messageDoc = await getDoc(docRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const message = messageDoc.data() as ChatMessage;
    if (!message.readBy.includes(userId)) {
      await updateDoc(docRef, {
        readBy: arrayUnion(userId),
      });
    }
  }
}

