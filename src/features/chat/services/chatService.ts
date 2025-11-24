/**
 * 채팅 서비스
 * Firestore 기반 채팅방 및 메시지 관리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/shared/services/firebase/config';
import { CHAT_COLLECTIONS, MESSAGE_LIMITS } from '../constants';
import { MessageStatus } from '../types/chat.types';

// undefined 값을 재귀적으로 제거하는 유틸리티 함수
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = removeUndefinedValues(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
};

import type {
  ChatRoom,
  ChatMessage,
  ChatRoomParticipant,
  MessageAttachment,
  TemporaryChatRoom,
} from '../types/chat.types';
import { getUserDisplayName } from '@/shared/utils/userUtils';

export class ChatService {
  /**
   * 채팅방 생성
   */
  static async createChatRoom(
    type: 'direct' | 'group',
    participants: ChatRoomParticipant[],
    createdBy: string,
    name?: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    // 1:1 채팅의 경우 기존 채팅방이 있는지 확인
    if (type === 'direct' && participants.length === 2) {
      const existingRoom = await this.findDirectChatRoom(
        participants[0].uid,
        participants[1].uid
      );
      if (existingRoom) {
        return existingRoom.id;
      }
    }

    const now = new Date().toISOString();
    const roomData: Omit<ChatRoom, 'id'> = {
      type,
      participants: participants.map((p) => ({
        uid: p.uid,
        displayName: p.displayName || '',
        photoURL: p.photoURL || undefined,
        joinedAt: p.joinedAt || now,
      })),
      createdBy,
      createdAt: now,
      updatedAt: now,
      ...(name && { name }),
    };

    // undefined 필드 재귀적으로 제거
    const sanitizedData = removeUndefinedValues(roomData) as Omit<ChatRoom, 'id'>;

    const docRef = await addDoc(collection(db, CHAT_COLLECTIONS.ROOMS), sanitizedData);
    return docRef.id;
  }

  /**
   * 1:1 채팅방 찾기
   */
  static async findDirectChatRoom(
    uid1: string,
    uid2: string
  ): Promise<ChatRoom | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const roomsRef = collection(db, CHAT_COLLECTIONS.ROOMS);
    // participants는 객체 배열이므로 모든 direct 채팅방을 가져온 후 필터링
    const q = query(
      roomsRef,
      where('type', '==', 'direct')
    );

    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      const room = { id: docSnap.id, ...docSnap.data() } as ChatRoom;
      if (!room.participants || !Array.isArray(room.participants)) continue;
      
      const participantUids = room.participants.map((p) => p.uid).filter(Boolean);
      if (
        participantUids.length === 2 &&
        participantUids.includes(uid1) &&
        participantUids.includes(uid2)
      ) {
        return room;
      }
    }
    return null;
  }

  /**
   * 임시 채팅방을 Firestore에 저장
   */
  static async saveTemporaryRoom(
    temporaryRoom: TemporaryChatRoom,
    createdBy: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    // 1:1 채팅의 경우 기존 채팅방이 있는지 확인
    if (
      temporaryRoom.type === 'direct' &&
      temporaryRoom.participants.length === 2
    ) {
      const existingRoom = await this.findDirectChatRoom(
        temporaryRoom.participants[0].uid,
        temporaryRoom.participants[1].uid
      );
      if (existingRoom) {
        return existingRoom.id;
      }
    }

    const now = new Date().toISOString();
    const roomData: Omit<ChatRoom, 'id'> = {
      type: temporaryRoom.type,
      participants: temporaryRoom.participants.map((p) => ({
        uid: p.uid,
        displayName: p.displayName || '',
        photoURL: p.photoURL || undefined,
        joinedAt: p.joinedAt || now,
      })),
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    // undefined 필드 재귀적으로 제거
    const sanitizedData = removeUndefinedValues(roomData) as Omit<ChatRoom, 'id'>;

    const docRef = await addDoc(collection(db, CHAT_COLLECTIONS.ROOMS), sanitizedData);
    return docRef.id;
  }

  /**
   * 채팅방 조회
   */
  static async getChatRoom(roomId: string): Promise<ChatRoom | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHAT_COLLECTIONS.ROOMS, roomId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as ChatRoom;
  }

  /**
   * 사용자의 채팅방 목록 구독
   */
  static subscribeToChatRooms(
    userId: string,
    callback: (rooms: ChatRoom[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) throw new Error('Firestore is not initialized');

    const roomsRef = collection(db, CHAT_COLLECTIONS.ROOMS);
    // participants는 객체 배열이므로, 모든 채팅방을 가져온 후 클라이언트에서 필터링
    // 또는 participants 배열에 userId를 포함하는 문자열 필드를 추가하는 방법도 있음
    const q = query(
      roomsRef,
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const allRooms = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChatRoom[];
        
        // 클라이언트에서 참여자 필터링
        const userRooms = allRooms.filter((room) =>
          room.participants?.some((p) => p.uid === userId)
        );
        
        callback(userRooms);
      },
      (error) => {
        console.error('Error fetching chat rooms:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );
  }

  /**
   * 채팅방 업데이트
   */
  static async updateChatRoom(
    roomId: string,
    updates: Partial<Pick<ChatRoom, 'name' | 'participants' | 'lastMessage'>>,
    currentUserUid: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHAT_COLLECTIONS.ROOMS, roomId);

    // 문서 존재 여부 확인
    const docSnap = await getDoc(docRef);

    // undefined 필드 재귀적으로 제거
    const sanitizedUpdates = removeUndefinedValues({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    if (docSnap.exists()) {
      // 문서가 존재하면 업데이트
      await updateDoc(docRef, sanitizedUpdates);
    } else {
      // 문서가 없으면 생성 (merge 옵션으로 기존 데이터 보존)
      await setDoc(docRef, sanitizedUpdates, { merge: true });
    }
  }

  /**
   * 채팅방 나가기 (참여자 제거)
   */
  static async leaveChatRoom(roomId: string, userUid: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const chatRoom = await this.getChatRoom(roomId);
    if (!chatRoom) throw new Error('채팅방을 찾을 수 없습니다.');

    // participants가 없거나 배열이 아닌 경우 처리
    if (!chatRoom.participants || !Array.isArray(chatRoom.participants)) {
      throw new Error('채팅방의 참여자 정보가 유효하지 않습니다.');
    }

    // 참여자 목록에서 제거
    const updatedParticipants = chatRoom.participants.filter(
      (p) => p.uid !== userUid
    );

    // 참여자가 없으면 채팅방 삭제
    if (updatedParticipants.length === 0) {
      await deleteDoc(doc(db, CHAT_COLLECTIONS.ROOMS, roomId));
    } else {
      // 참여자 목록 업데이트
      await this.updateChatRoom(roomId, { participants: updatedParticipants }, userUid);
    }
  }

  /**
   * 참여자 추가
   */
  static async addParticipant(
    roomId: string,
    participant: ChatRoomParticipant,
    currentUserUid: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const chatRoom = await this.getChatRoom(roomId);
    if (!chatRoom) throw new Error('채팅방을 찾을 수 없습니다.');

    // 이미 참여자인지 확인
    const isAlreadyParticipant = chatRoom.participants.some(
      (p) => p.uid === participant.uid
    );
    if (isAlreadyParticipant) {
      return; // 이미 참여자이면 아무것도 하지 않음
    }

    // 참여자 추가
    const updatedParticipants = [...chatRoom.participants, participant];
    await this.updateChatRoom(roomId, { participants: updatedParticipants }, currentUserUid);
  }

  /**
   * 참여자 제거
   */
  static async removeParticipant(
    roomId: string,
    userUid: string,
    currentUserUid: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const chatRoom = await this.getChatRoom(roomId);
    if (!chatRoom) throw new Error('채팅방을 찾을 수 없습니다.');

    // 참여자 목록에서 제거
    const updatedParticipants = chatRoom.participants.filter(
      (p) => p.uid !== userUid
    );

    // 참여자가 없으면 채팅방 삭제
    if (updatedParticipants.length === 0) {
      await deleteDoc(doc(db, CHAT_COLLECTIONS.ROOMS, roomId));
    } else {
      // 참여자 목록 업데이트
      await this.updateChatRoom(roomId, { participants: updatedParticipants }, currentUserUid);
    }
  }

  /**
   * 메시지 전송
   * @returns {Promise<{ messageId: string; roomId: string }>} 메시지 ID와 채팅방 ID 반환
   */
  static async sendMessage(
    chatRoomId: string,
    text: string,
    sender: { uid: string; displayName: string; photoURL?: string },
    attachments?: MessageAttachment[],
    mentionedUserIds?: string[],
    replyTo?: string,
    temporaryRoom?: TemporaryChatRoom
  ): Promise<{ messageId: string; roomId: string }> {
    if (!db) throw new Error('Firestore is not initialized');

    // 임시 채팅방인 경우 먼저 Firestore에 저장
    if (temporaryRoom) {
      const savedRoomId = await this.saveTemporaryRoom(
        temporaryRoom,
        sender.uid
      );
      chatRoomId = savedRoomId;
    }

    const now = new Date().toISOString();
    const messageData: Omit<ChatMessage, 'id'> = {
      chatRoomId,
      text,
      sender: {
        uid: sender.uid,
        displayName: sender.displayName || '',
        photoURL: sender.photoURL || undefined,
      },
      timestamp: now,
      status: MessageStatus.SENT,
      readBy: [sender.uid], // 보낸 사람은 즉시 읽음 처리
      ...(attachments && attachments.length > 0 && { attachments }),
      ...(mentionedUserIds && mentionedUserIds.length > 0 && { mentionedUserIds }),
      ...(replyTo && { replyTo }),
    };

    // undefined 필드 재귀적으로 제거
    const sanitizedMessageData = removeUndefinedValues(messageData) as Omit<ChatMessage, 'id'>;

    const docRef = await addDoc(
      collection(db, CHAT_COLLECTIONS.MESSAGES),
      sanitizedMessageData
    );

    // 채팅방의 lastMessage 업데이트
    await this.updateChatRoom(
      chatRoomId,
      {
        lastMessage: {
          text,
          senderId: sender.uid,
          senderName: sender.displayName,
          timestamp: now,
        },
      },
      sender.uid
    );

    return { messageId: docRef.id, roomId: chatRoomId };
  }

  /**
   * 메시지 목록 구독
   */
  static subscribeToMessages(
    chatRoomId: string,
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: Error) => void,
    limitCount: number = 100
  ): () => void {
    if (!db) throw new Error('Firestore is not initialized');

    const messagesRef = collection(db, CHAT_COLLECTIONS.MESSAGES);
    // Firestore 인덱스가 필요한 쿼리이므로, 인덱스 없이도 작동하도록 수정
    // 먼저 chatRoomId로 필터링한 후 클라이언트에서 정렬
    const q = query(
      messagesRef,
      where('chatRoomId', '==', chatRoomId),
      limit(limitCount * 2) // 정렬을 위해 더 많이 가져옴
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as ChatMessage))
          .sort((a, b) => {
            // timestamp로 정렬 (오름차순: 가장 오래된 것부터)
            const aTime = a.timestamp || '';
            const bTime = b.timestamp || '';
            return aTime.localeCompare(bTime);
          })
          .slice(-limitCount) as ChatMessage[]; // 최신 limitCount개만 사용
        callback(messages);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );
  }

  /**
   * 메시지 읽음 처리
   */
  static async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHAT_COLLECTIONS.MESSAGES, messageId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return;
    }

    const message = docSnap.data() as ChatMessage;
    if (!message.readBy.includes(userId)) {
      await updateDoc(docRef, {
        readBy: arrayUnion(userId),
        status: MessageStatus.READ,
      });
    }
  }

  /**
   * 메시지 수정
   */
  static async editMessage(
    messageId: string,
    newText: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHAT_COLLECTIONS.MESSAGES, messageId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('메시지를 찾을 수 없습니다.');
    }

    const message = docSnap.data() as ChatMessage;
    if (message.sender.uid !== userId) {
      throw new Error('본인의 메시지만 수정할 수 있습니다.');
    }

    await updateDoc(docRef, {
      text: newText,
      editedAt: new Date().toISOString(),
    });
  }

  /**
   * 메시지 삭제
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, CHAT_COLLECTIONS.MESSAGES, messageId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('메시지를 찾을 수 없습니다.');
    }

    const message = docSnap.data() as ChatMessage;
    if (message.sender.uid !== userId) {
      throw new Error('본인의 메시지만 삭제할 수 있습니다.');
    }

    // 첨부파일이 있으면 Storage에서도 삭제
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        try {
          const fileRef = ref(storage!, attachment.url);
          await deleteObject(fileRef);
        } catch (error) {
          console.error('Failed to delete attachment:', error);
        }
      }
    }

    await deleteDoc(docRef);
  }

  /**
   * 파일 업로드
   */
  static async uploadFile(
    file: File,
    chatRoomId: string,
    userId: string
  ): Promise<MessageAttachment> {
    if (!storage) throw new Error('Storage is not initialized');

    const fileId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const filePath = `chat/${chatRoomId}/${fileId}_${file.name}`;
    const fileRef = ref(storage, filePath);

    await uploadBytes(fileRef, file);

    const url = await getDownloadURL(fileRef);

    const attachment: MessageAttachment = {
      id: fileId,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      url,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };

    // 이미지인 경우 썸네일 URL도 생성 (나중에 구현 가능)
    if (attachment.type === 'image') {
      attachment.thumbnailUrl = url; // 일단 원본 URL 사용
    }

    return attachment;
  }

  /**
   * 타이핑 상태 업데이트
   */
  static async updateTypingStatus(
    chatRoomId: string,
    userId: string,
    userName: string,
    isTyping: boolean
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const typingRef = doc(
      db,
      CHAT_COLLECTIONS.ROOMS,
      chatRoomId,
      CHAT_COLLECTIONS.TYPING,
      userId
    );

    if (isTyping) {
      await setDoc(
        typingRef,
        {
          userId,
          userName,
          timestamp: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      await deleteDoc(typingRef);
    }
  }

  /**
   * 타이핑 상태 구독
   */
  static subscribeToTypingStatus(
    chatRoomId: string,
    callback: (users: Array<{ userId: string; userName: string; timestamp: string }>) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!db) throw new Error('Firestore is not initialized');

    const typingRef = collection(
      db,
      CHAT_COLLECTIONS.ROOMS,
      chatRoomId,
      CHAT_COLLECTIONS.TYPING
    );

    return onSnapshot(
      typingRef,
      (snapshot) => {
        const users = snapshot.docs.map((doc) => ({
          userId: doc.id,
          ...doc.data(),
        })) as Array<{ userId: string; userName: string; timestamp: string }>;
        callback(users);
      },
      (error) => {
        console.error('Error fetching typing status:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );
  }
}

