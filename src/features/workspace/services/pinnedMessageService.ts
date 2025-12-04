/**
 * 고정 메시지 서비스
 * Firestore 기반 메시지 고정 관리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type { PinnedMessage } from '../types/message.types';
import type { ChannelMessage } from '../types/channelMessage.types';

/**
 * 고정 메시지 서브컬렉션 경로 가져오기
 */
const getPinnedMessagesCollectionPath = (workspaceId: string, channelId: string) => {
  return `workspaces/${workspaceId}/channels/${channelId}/pinnedMessages`;
};

export class PinnedMessageService {
  /**
   * 메시지 고정
   */
  static async pinMessage(
    messageId: string,
    channelId: string,
    workspaceId: string,
    pinnedBy: string,
    message: ChannelMessage
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    // 이미 고정된 메시지인지 확인
    const existing = await this.getPinnedMessage(messageId, channelId, workspaceId);
    if (existing) {
      throw new Error('Message is already pinned');
    }

    const now = new Date().toISOString();
    const pinnedData: Omit<PinnedMessage, 'id'> = {
      messageId,
      channelId,
      workspaceId,
      pinnedBy,
      pinnedAt: now,
      message,
    };

    const pinnedMessagesRef = collection(db, getPinnedMessagesCollectionPath(workspaceId, channelId));
    const docRef = await addDoc(pinnedMessagesRef, pinnedData);
    return docRef.id;
  }

  /**
   * 고정된 메시지 고정 해제
   */
  static async unpinMessage(
    pinnedMessageId: string,
    channelId: string,
    workspaceId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, getPinnedMessagesCollectionPath(workspaceId, channelId), pinnedMessageId);
    await deleteDoc(docRef);
  }

  /**
   * 특정 메시지가 고정되었는지 확인
   */
  static async getPinnedMessage(
    messageId: string,
    channelId: string,
    workspaceId: string
  ): Promise<PinnedMessage | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, getPinnedMessagesCollectionPath(workspaceId, channelId)),
      where('messageId', '==', messageId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as PinnedMessage;
  }

  /**
   * 채널의 고정된 메시지 목록 조회
   */
  static async getChannelPinnedMessages(
    channelId: string,
    workspaceId: string
  ): Promise<PinnedMessage[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, getPinnedMessagesCollectionPath(workspaceId, channelId)),
      orderBy('pinnedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PinnedMessage[];
  }

  /**
   * 채널의 고정된 메시지 목록 실시간 구독
   */
  static subscribeToChannelPinnedMessages(
    channelId: string,
    workspaceId: string,
    callback: (pinnedMessages: PinnedMessage[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const q = query(
      collection(db, getPinnedMessagesCollectionPath(workspaceId, channelId)),
      orderBy('pinnedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const pinnedMessages: PinnedMessage[] = [];
        querySnapshot.forEach((doc) => {
          pinnedMessages.push({
            id: doc.id,
            ...doc.data(),
          } as PinnedMessage);
        });
        callback(pinnedMessages);
      },
      (error) => {
        console.error('Failed to subscribe to pinned messages:', error);
        onError?.(error);
      }
    );

    return unsubscribe;
  }
}
