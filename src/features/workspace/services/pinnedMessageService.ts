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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type { PinnedMessage } from '../types/message.types';

const PINNED_MESSAGES_COLLECTION = 'pinnedMessages';

export class PinnedMessageService {
  /**
   * 메시지 고정
   */
  static async pinMessage(
    messageId: string,
    channelId: string,
    workspaceId: string,
    pinnedBy: string,
    message: any // ChatMessage 타입
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    // 이미 고정된 메시지인지 확인
    const existing = await this.getPinnedMessage(messageId, channelId);
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

    const docRef = await addDoc(collection(db, PINNED_MESSAGES_COLLECTION), pinnedData);
    return docRef.id;
  }

  /**
   * 메시지 고정 해제
   */
  static async unpinMessage(messageId: string, channelId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const pinned = await this.getPinnedMessage(messageId, channelId);
    if (!pinned) {
      throw new Error('Message is not pinned');
    }

    const docRef = doc(db, PINNED_MESSAGES_COLLECTION, pinned.id);
    await deleteDoc(docRef);
  }

  /**
   * 고정된 메시지 조회
   */
  static async getPinnedMessage(
    messageId: string,
    channelId: string
  ): Promise<PinnedMessage | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, PINNED_MESSAGES_COLLECTION),
      where('messageId', '==', messageId),
      where('channelId', '==', channelId)
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
   * 채널의 모든 고정 메시지 조회
   */
  static async getChannelPinnedMessages(channelId: string): Promise<PinnedMessage[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, PINNED_MESSAGES_COLLECTION),
      where('channelId', '==', channelId),
      orderBy('pinnedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PinnedMessage[];
  }

  /**
   * 채널의 고정 메시지 실시간 구독
   */
  static subscribeToChannelPinnedMessages(
    channelId: string,
    callback: (pinnedMessages: PinnedMessage[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const q = query(
      collection(db, PINNED_MESSAGES_COLLECTION),
      where('channelId', '==', channelId),
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
        onError?.(error);
      }
    );

    return unsubscribe;
  }
}

