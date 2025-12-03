/**
 * 메시지 편집 히스토리 서비스
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type { MessageEditHistory } from '../types/message.types';

const EDIT_HISTORY_COLLECTION = 'messageEditHistory';

export class MessageEditHistoryService {
  /**
   * 편집 히스토리 추가
   */
  static async addEditHistory(
    messageId: string,
    editedBy: string,
    previousText: string,
    newText: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const historyData: Omit<MessageEditHistory, 'id'> = {
      messageId,
      editedBy,
      editedAt: new Date().toISOString(),
      previousText,
      newText,
    };

    const docRef = await addDoc(collection(db, EDIT_HISTORY_COLLECTION), historyData);
    return docRef.id;
  }

  /**
   * 메시지의 편집 히스토리 조회
   */
  static async getMessageEditHistory(
    messageId: string
  ): Promise<MessageEditHistory[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, EDIT_HISTORY_COLLECTION),
      where('messageId', '==', messageId),
      orderBy('editedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MessageEditHistory[];
  }
}

