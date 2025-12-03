/**
 * 메시지 편집 서비스
 */

import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { MessageEditHistoryService } from './messageEditHistoryService';
import type { ChatMessage } from '@/features/chat/types/chat.types';

const CHANNEL_MESSAGES_COLLECTION = 'channelMessages';

export class MessageEditService {
  /**
   * 메시지 편집
   */
  static async editMessage(
    messageId: string,
    newText: string,
    editedBy: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    // 기존 메시지 가져오기
    const docRef = doc(db, CHANNEL_MESSAGES_COLLECTION, messageId);
    const messageDoc = await getDoc(docRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const message = messageDoc.data() as ChatMessage;

    // 편집 히스토리 추가
    await MessageEditHistoryService.addEditHistory(
      messageId,
      editedBy,
      message.text,
      newText
    );

    // 메시지 업데이트
    await updateDoc(docRef, {
      text: newText,
      editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 메시지 삭제 (soft delete)
   */
  static async deleteMessage(messageId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHANNEL_MESSAGES_COLLECTION, messageId);
    await updateDoc(docRef, {
      text: '[삭제된 메시지입니다]',
      deletedAt: new Date().toISOString(),
      isDeleted: true,
    });
  }
}

