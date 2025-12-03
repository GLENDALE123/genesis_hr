/**
 * 스레드 서비스
 * Firestore 기반 스레드 관리
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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { ChatService } from '@/features/chat/services/chatService';
import { MessageStatus } from '@/features/chat/types/chat.types';
import type {
  Thread,
  CreateThreadData,
  AddThreadMessageData,
} from '../types/thread.types';
import type { ChatMessage } from '@/features/chat/types/chat.types';

const THREADS_COLLECTION = 'threads';
const THREAD_MESSAGES_COLLECTION = 'threadMessages';

export class ThreadService {
  /**
   * 스레드 생성
   */
  static async createThread(data: CreateThreadData): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const now = new Date().toISOString();
    
    // 초기 메시지 생성
    const initialMessage: ChatMessage = {
      ...data.initialMessage,
      id: `thread-msg-${Date.now()}`,
      timestamp: now,
      status: MessageStatus.SENT,
      readBy: [data.initialMessage.sender.uid],
    };

    // 스레드 생성
    const threadData: Omit<Thread, 'id'> = {
      channelId: data.channelId,
      workspaceId: data.workspaceId,
      parentMessageId: data.parentMessageId,
      messages: [initialMessage],
      participants: [data.initialMessage.sender.uid],
      createdAt: now,
      updatedAt: now,
      isResolved: false,
      unreadCount: {},
    };

    const docRef = await addDoc(collection(db, THREADS_COLLECTION), threadData);
    return docRef.id;
  }

  /**
   * 스레드 조회
   */
  static async getThread(threadId: string): Promise<Thread | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, THREADS_COLLECTION, threadId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Thread;
  }

  /**
   * 채널의 스레드 목록 조회
   */
  static async getChannelThreads(channelId: string): Promise<Thread[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, THREADS_COLLECTION),
      where('channelId', '==', channelId),
      where('isResolved', '==', false),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Thread[];
  }

  /**
   * 메시지의 스레드 조회
   */
  static async getMessageThread(parentMessageId: string): Promise<Thread | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, THREADS_COLLECTION),
      where('parentMessageId', '==', parentMessageId),
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
    } as Thread;
  }

  /**
   * 스레드에 메시지 추가
   */
  static async addThreadMessage(data: AddThreadMessageData): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const thread = await this.getThread(data.threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const now = new Date().toISOString();
    const newMessage: ChatMessage = {
      ...data.message,
      id: `thread-msg-${Date.now()}`,
      timestamp: now,
      status: MessageStatus.SENT,
      readBy: [data.message.sender.uid],
    };

    const updatedMessages = [...thread.messages, newMessage];
    const updatedParticipants = [...new Set([...thread.participants, data.message.sender.uid])];

    const docRef = doc(db, THREADS_COLLECTION, data.threadId);
    await updateDoc(docRef, {
      messages: updatedMessages,
      participants: updatedParticipants,
      updatedAt: now,
    });
  }

  /**
   * 스레드 해결 표시
   */
  static async resolveThread(threadId: string, resolvedBy: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, THREADS_COLLECTION, threadId);
    await updateDoc(docRef, {
      isResolved: true,
      resolvedBy,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 스레드 해결 취소
   */
  static async unresolveThread(threadId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, THREADS_COLLECTION, threadId);
    await updateDoc(docRef, {
      isResolved: false,
      resolvedBy: null,
      resolvedAt: null,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 스레드 읽지 않은 메시지 수 업데이트
   */
  static async updateUnreadCount(
    threadId: string,
    userId: string,
    count: number
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, THREADS_COLLECTION, threadId);
    const thread = await this.getThread(threadId);

    if (!thread) {
      throw new Error('Thread not found');
    }

    const unreadCount = thread.unreadCount || {};
    unreadCount[userId] = count;

    await updateDoc(docRef, {
      unreadCount,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 채널의 스레드 목록 실시간 구독
   */
  static subscribeToChannelThreads(
    channelId: string,
    callback: (threads: Thread[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const q = query(
      collection(db, THREADS_COLLECTION),
      where('channelId', '==', channelId),
      where('isResolved', '==', false),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const threads: Thread[] = [];
        querySnapshot.forEach((doc) => {
          threads.push({
            id: doc.id,
            ...doc.data(),
          } as Thread);
        });
        callback(threads);
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }

  /**
   * 스레드 실시간 구독
   */
  static subscribeToThread(
    threadId: string,
    callback: (thread: Thread | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const docRef = doc(db, THREADS_COLLECTION, threadId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback({
            id: docSnap.id,
            ...docSnap.data(),
          } as Thread);
        } else {
          callback(null);
        }
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }
}

