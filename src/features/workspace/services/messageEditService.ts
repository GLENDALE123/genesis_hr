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
import type { ChannelMessage } from '../types/channelMessage.types';

/**
 * 채널 메시지 서브컬렉션 경로 가져오기
 */
const getMessagesCollectionPath = (workspaceId: string, channelId: string) => {
  return `workspaces/${workspaceId}/channels/${channelId}/messages`;
};

export class MessageEditService {
  /**
   * 메시지 편집
   */
  static async editMessage(
    messageId: string,
    channelId: string,
    workspaceId: string,
    newText: string,
    editedBy: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    // 기존 메시지 가져오기
    const docRef = doc(db, getMessagesCollectionPath(workspaceId, channelId), messageId);
    const messageDoc = await getDoc(docRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const message = messageDoc.data() as ChannelMessage;

    // 편집 히스토리 추가
    await MessageEditHistoryService.addEditHistory(
      messageId,
      channelId,
      workspaceId,
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
  static async deleteMessage(
    messageId: string,
    channelId: string,
    workspaceId: string,
    deletedBy: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, getMessagesCollectionPath(workspaceId, channelId), messageId);
    const messageDoc = await getDoc(docRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const message = messageDoc.data() as ChannelMessage;

    // 편집 히스토리 추가 (삭제도 일종의 편집으로 간주)
    await MessageEditHistoryService.addEditHistory(
      messageId,
      channelId,
      workspaceId,
      deletedBy,
      message.text,
      '[삭제된 메시지]'
    );

    await updateDoc(docRef, {
      text: '[삭제된 메시지]',
      attachments: [], // 첨부파일도 삭제
      editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: true, // 삭제 플래그 추가
    });
  }
}
