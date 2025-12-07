/**
 * 반응(Reaction) 서비스
 * Firestore 기반 메시지 반응 관리
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
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type {
  MessageReaction,
  AddReactionData,
  RemoveReactionData,
} from '../types/reaction.types';

const REACTIONS_COLLECTION = 'messageReactions';

export class ReactionService {
  /**
   * 반응 추가
   */
  static async addReaction(data: AddReactionData): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    // 기존 반응이 있는지 확인
    const existingReaction = await this.getReaction(
      data.messageId,
      data.emoji
    );

    if (existingReaction) {
      // 이미 반응이 있으면 사용자만 추가
      if (!existingReaction.users.includes(data.userId)) {
        const docRef = doc(db, REACTIONS_COLLECTION, existingReaction.id);
        await updateDoc(docRef, {
          users: arrayUnion(data.userId),
          count: existingReaction.count + 1,
          updatedAt: new Date().toISOString(),
        });
        return existingReaction.id;
      }
      return existingReaction.id;
    }

    // 새 반응 생성
    const now = new Date().toISOString();
    const reactionData: Omit<MessageReaction, 'id'> = {
      messageId: data.messageId,
      channelId: data.channelId,
      workspaceId: data.workspaceId,
      emoji: data.emoji,
      users: [data.userId],
      count: 1,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, REACTIONS_COLLECTION), reactionData);
    return docRef.id;
  }

  /**
   * 반응 제거
   */
  static async removeReaction(data: RemoveReactionData): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const reaction = await this.getReaction(data.messageId, data.emoji);
    if (!reaction) {
      throw new Error('Reaction not found');
    }

    if (!reaction.users.includes(data.userId)) {
      return; // 이미 제거됨
    }

    const docRef = doc(db, REACTIONS_COLLECTION, reaction.id);
    const updatedUsers = reaction.users.filter((uid) => uid !== data.userId);
    const updatedCount = updatedUsers.length;

    if (updatedCount === 0) {
      // 반응이 없으면 문서 삭제
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(docRef);
    } else {
      await updateDoc(docRef, {
        users: updatedUsers,
        count: updatedCount,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * 메시지의 반응 조회
   */
  static async getReaction(
    messageId: string,
    emoji: string
  ): Promise<MessageReaction | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, REACTIONS_COLLECTION),
      where('messageId', '==', messageId),
      where('emoji', '==', emoji)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as MessageReaction;
  }

  /**
   * 메시지의 모든 반응 조회
   */
  static async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, REACTIONS_COLLECTION),
      where('messageId', '==', messageId),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MessageReaction[];
  }

  /**
   * 채널의 모든 반응 조회 (선택사항)
   */
  static async getChannelReactions(channelId: string): Promise<MessageReaction[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, REACTIONS_COLLECTION),
      where('channelId', '==', channelId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MessageReaction[];
  }

  /**
   * 메시지 반응 실시간 구독
   */
  static subscribeToMessageReactions(
    messageId: string,
    callback: (reactions: MessageReaction[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const q = query(
      collection(db, REACTIONS_COLLECTION),
      where('messageId', '==', messageId)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const reactions: MessageReaction[] = [];
        querySnapshot.forEach((doc) => {
          reactions.push({
            id: doc.id,
            ...doc.data(),
          } as MessageReaction);
        });
        callback(reactions);
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }
}

