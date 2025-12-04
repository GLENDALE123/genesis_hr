/**
 * 메시지 편집 히스토리 서비스
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type { MessageEditHistory } from '../types/message.types';

/**
 * 편집 히스토리 서브컬렉션 경로 가져오기
 */
const getEditHistoryCollectionPath = (workspaceId: string, channelId: string) => {
  return `workspaces/${workspaceId}/channels/${channelId}/messageEditHistory`;
};

export class MessageEditHistoryService {
  /**
   * 편집 히스토리 추가
   */
  static async addEditHistory(
    messageId: string,
    channelId: string,
    workspaceId: string,
    editedBy: string,
    previousText: string,
    newText: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const historyData: Omit<MessageEditHistory, 'id'> = {
      messageId,
      channelId,
      workspaceId,
      editedBy,
      editedAt: new Date().toISOString(),
      previousText,
      newText,
    };

    const editHistoryRef = collection(db, getEditHistoryCollectionPath(workspaceId, channelId));
    const docRef = await addDoc(editHistoryRef, historyData);
    return docRef.id;
  }

  /**
   * 메시지의 편집 히스토리 조회
   */
  static async getMessageEditHistory(
    messageId: string,
    channelId: string,
    workspaceId: string
  ): Promise<MessageEditHistory[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, getEditHistoryCollectionPath(workspaceId, channelId)),
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
