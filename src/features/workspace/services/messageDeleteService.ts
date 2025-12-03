/**
 * 메시지 삭제 서비스
 * 소프트 삭제 및 복구 기능
 */

import {
  collection,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { deleteField } from 'firebase/firestore';

const CHANNEL_MESSAGES_COLLECTION = 'channelMessages';
const DELETED_MESSAGES_COLLECTION = 'deletedMessages';

export interface DeletedMessage {
  id: string;
  messageId: string;
  channelId: string;
  workspaceId: string;
  deletedBy: string; // UID
  deletedAt: string; // ISO string
  originalMessage: any; // 원본 메시지 데이터
  canRestore: boolean; // 복구 가능 여부
}

export class MessageDeleteService {
  /**
   * 메시지 소프트 삭제
   */
  static async deleteMessage(
    messageId: string,
    channelId: string,
    workspaceId: string,
    deletedBy: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const messageRef = doc(db, CHANNEL_MESSAGES_COLLECTION, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc.data();

    // 삭제된 메시지 기록 저장
    const deletedMessageData: Omit<DeletedMessage, 'id'> = {
      messageId,
      channelId,
      workspaceId,
      deletedBy,
      deletedAt: new Date().toISOString(),
      originalMessage: messageData,
      canRestore: true,
    };

    await addDoc(collection(db, DELETED_MESSAGES_COLLECTION), deletedMessageData);

    // 메시지에 삭제 표시 추가
    await updateDoc(messageRef, {
      deleted: true,
      deletedBy,
      deletedAt: new Date().toISOString(),
      text: '(메시지가 삭제되었습니다)',
      attachments: deleteField(), // 첨부파일 정보 제거
    });
  }

  /**
   * 메시지 복구
   */
  static async restoreMessage(messageId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    // 삭제된 메시지 기록 찾기
    const deletedQuery = query(
      collection(db, DELETED_MESSAGES_COLLECTION),
      where('messageId', '==', messageId)
    );
    const deletedSnapshot = await getDocs(deletedQuery);

    if (deletedSnapshot.empty) {
      throw new Error('Deleted message record not found');
    }

    const deletedDoc = deletedSnapshot.docs[0];
    const deletedData = deletedDoc.data() as DeletedMessage;

    if (!deletedData.canRestore) {
      throw new Error('Message cannot be restored');
    }

    // 원본 메시지 복구
    const messageRef = doc(db, CHANNEL_MESSAGES_COLLECTION, messageId);
    const originalMessage = deletedData.originalMessage;

    await updateDoc(messageRef, {
      text: originalMessage.text,
      attachments: originalMessage.attachments || deleteField(),
      deleted: deleteField(),
      deletedBy: deleteField(),
      deletedAt: deleteField(),
    });

    // 삭제 기록 제거
    await deleteDoc(deletedDoc.ref);
  }

  /**
   * 삭제된 메시지인지 확인
   */
  static isMessageDeleted(message: any): boolean {
    return message.deleted === true;
  }

  /**
   * 영구 삭제 (관리자만 가능)
   */
  static async permanentlyDeleteMessage(
    messageId: string,
    channelId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    // 삭제 기록도 함께 제거
    const deletedQuery = query(
      collection(db, DELETED_MESSAGES_COLLECTION),
      where('messageId', '==', messageId)
    );
    const deletedSnapshot = await getDocs(deletedQuery);
    
    for (const doc of deletedSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // 메시지 완전 삭제
    const messageRef = doc(db, CHANNEL_MESSAGES_COLLECTION, messageId);
    await deleteDoc(messageRef);
  }
}

