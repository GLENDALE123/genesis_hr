/**
 * 공통 댓글 관리 서비스
 * 
 * @description
 * 모든 피처(생산, 품질, 지그, 샘플 등)에서 재사용 가능한 댓글 CRUD 서비스
 * Firestore 컬렉션별로 독립적인 댓글 관리 제공
 */

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';

// ============================================================================
// 타입 정의
// ============================================================================

export interface Comment {
  id: string;
  timestamp: string;
  text: string;
  user: string;
  uid: string;
  readBy: string[];
  editedAt?: string;
}

export interface NewCommentData {
  text: string;
  user: string;
  uid: string;
  mentionedUserIds?: string[];
}

// ============================================================================
// 댓글 서비스
// ============================================================================

export class CommentsService {
  /**
   * 댓글 추가
   * 
   * @param collectionName - Firestore 컬렉션 이름
   * @param documentId - 문서 ID
   * @param commentData - 댓글 데이터
   * 
   * @example
   * await CommentsService.addComment('production-requests', requestId, {
   *   text: '댓글 내용',
   *   user: '홍길동',
   *   uid: 'user123'
   * });
   */
  static async addComment(
    collectionName: string,
    documentId: string,
    commentData: NewCommentData
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, collectionName, documentId);
    const now = Timestamp.now().toDate().toISOString();

    // 기존 문서 데이터 가져오기
    const snapshot = await getDocs(
      query(collection(db, collectionName), where('__name__', '==', documentId))
    );
    const currentData = snapshot.docs[0]?.data();

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      timestamp: now,
      text: commentData.text,
      user: commentData.user,
      uid: commentData.uid,
      readBy: [commentData.uid],
    };

    await updateDoc(docRef, {
      comments: [...(currentData?.comments || []), newComment],
    });

    // 멘션 알림 전송
    if (commentData.mentionedUserIds && commentData.mentionedUserIds.length > 0) {
      await this.sendMentionNotifications(
        collectionName,
        documentId,
        commentData,
        currentData
      );
    }
  }

  /**
   * 댓글 수정
   * 
   * @param collectionName - Firestore 컬렉션 이름
   * @param documentId - 문서 ID
   * @param commentId - 댓글 ID
   * @param newText - 새로운 텍스트
   * 
   * @example
   * await CommentsService.updateComment('production-requests', requestId, commentId, '수정된 내용');
   */
  static async updateComment(
    collectionName: string,
    documentId: string,
    commentId: string,
    newText: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, collectionName, documentId);

    // 기존 데이터 가져오기
    const snapshot = await getDocs(
      query(collection(db, collectionName), where('__name__', '==', documentId))
    );
    const currentData = snapshot.docs[0]?.data();

    if (!currentData?.comments) return;

    // 댓글 찾아서 수정
    const updatedComments = currentData.comments.map((comment: Comment) =>
      comment.id === commentId
        ? { ...comment, text: newText, editedAt: Timestamp.now().toDate().toISOString() }
        : comment
    );

    await updateDoc(docRef, {
      comments: updatedComments,
    });
  }

  /**
   * 댓글 삭제
   * 
   * @param collectionName - Firestore 컬렉션 이름
   * @param documentId - 문서 ID
   * @param commentId - 댓글 ID
   * 
   * @example
   * await CommentsService.deleteComment('production-requests', requestId, commentId);
   */
  static async deleteComment(
    collectionName: string,
    documentId: string,
    commentId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, collectionName, documentId);

    // 기존 데이터 가져오기
    const snapshot = await getDocs(
      query(collection(db, collectionName), where('__name__', '==', documentId))
    );
    const currentData = snapshot.docs[0]?.data();

    if (!currentData?.comments) return;

    // 댓글 필터링하여 삭제
    const updatedComments = currentData.comments.filter(
      (comment: Comment) => comment.id !== commentId
    );

    await updateDoc(docRef, {
      comments: updatedComments,
    });
  }

  /**
   * 댓글 읽음 표시
   * 
   * @param collectionName - Firestore 컬렉션 이름
   * @param documentId - 문서 ID
   * @param commentId - 댓글 ID
   * @param userId - 사용자 ID
   * 
   * @example
   * await CommentsService.markAsRead('production-requests', requestId, commentId, 'user123');
   */
  static async markAsRead(
    collectionName: string,
    documentId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, collectionName, documentId);

    // 기존 데이터 가져오기
    const snapshot = await getDocs(
      query(collection(db, collectionName), where('__name__', '==', documentId))
    );
    const currentData = snapshot.docs[0]?.data();

    if (!currentData?.comments) return;

    // 댓글 찾아서 readBy 업데이트
    const updatedComments = currentData.comments.map((comment: Comment) => {
      if (comment.id === commentId && !comment.readBy.includes(userId)) {
        return { ...comment, readBy: [...comment.readBy, userId] };
      }
      return comment;
    });

    await updateDoc(docRef, {
      comments: updatedComments,
    });
  }

  /**
   * 모든 댓글 읽음 표시
   * 
   * @param collectionName - Firestore 컬렉션 이름
   * @param documentId - 문서 ID
   * @param userId - 사용자 ID
   */
  static async markAllAsRead(
    collectionName: string,
    documentId: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, collectionName, documentId);

    // 기존 데이터 가져오기
    const snapshot = await getDocs(
      query(collection(db, collectionName), where('__name__', '==', documentId))
    );
    const currentData = snapshot.docs[0]?.data();

    if (!currentData?.comments) return;

    // 모든 댓글에 userId 추가
    const updatedComments = currentData.comments.map((comment: Comment) => {
      if (!comment.readBy.includes(userId)) {
        return { ...comment, readBy: [...comment.readBy, userId] };
      }
      return comment;
    });

    await updateDoc(docRef, {
      comments: updatedComments,
    });
  }

  /**
   * 멘션 알림 전송
   */
  private static async sendMentionNotifications(
    collectionName: string,
    documentId: string,
    commentData: NewCommentData,
    requestData: any
  ): Promise<void> {
    try {
      const requestAuthorId = requestData?.author?.uid;
      const mentionedUserIds = commentData.mentionedUserIds || [];
      
      // 알림 대상 결정
      const targets = new Map<string, 'comment' | 'mention'>();
      
      // 1. 멘션된 사용자들에게 멘션 알림
      mentionedUserIds.forEach(userId => {
        if (userId !== commentData.uid) {
          targets.set(userId, 'mention');
        }
      });
      
      // 2. 요청 작성자에게 댓글 알림 (멘션되지 않은 경우만)
      if (requestAuthorId && requestAuthorId !== commentData.uid && !targets.has(requestAuthorId)) {
        targets.set(requestAuthorId, 'comment');
      }
      
      // 3. 알림 전송
      for (const [userId, type] of targets) {
        await this.sendNotification({
          userId,
          type,
          collectionName,
          documentId,
          commentData,
          requestData
        });
      }
    } catch (error) {
      console.error('멘션 알림 전송 실패:', error);
    }
  }

  /**
   * 개별 알림 전송
   */
  private static async sendNotification(params: {
    userId: string;
    type: 'comment' | 'mention';
    collectionName: string;
    documentId: string;
    commentData: NewCommentData;
    requestData: any;
  }): Promise<void> {
    const { userId, type, collectionName, documentId, commentData, requestData } = params;
    
    // 제품명/부속명 추출
    const productName = requestData?.productName || '제품명';
    const partName = requestData?.partName || '부속명';
    
    // 알림 메시지 구성
    const title = "생산관리부 요청사항";
    const body = `${productName}/${partName} (@${commentData.user})${commentData.text}`;
    
    // 사용자 프로필 이미지 가져오기 (실제 구현에서는 사용자 데이터에서 가져옴)
    const senderAvatar = await this.getUserAvatar(commentData.uid);
    
    // Firebase Functions 호출
    const baseUrl = 'https://us-central1-hs-jig-b2093.cloudfunctions.net';
    
    const payload = {
      targetUsers: [userId],
      type: 'comment-mention',
      subType: type,
      message: body,
      requestId: documentId,
      priority: 'normal',
      title: title,
      senderName: commentData.user,
      senderUid: commentData.uid,
      senderAvatar: senderAvatar // 사용자 프로필 이미지 추가
    };

    try {
      const response = await fetch(`${baseUrl}/createNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('알림 전송 실패:', response.status);
      }
    } catch (error) {
      console.error('알림 전송 중 오류:', error);
    }
  }

  /**
   * 사용자 아바타 이미지 가져오기
   */
  private static async getUserAvatar(userId: string): Promise<string> {
    try {
      // 실제 구현에서는 Firestore에서 사용자 프로필 이미지 가져오기
      // const userDoc = await getDoc(doc(db, 'users', userId));
      // return userDoc.data()?.photoURL || '/default-avatar.png';
      
      // 임시: 기본 아바타 반환
      return '/default-avatar.png';
    } catch (error) {
      console.error('사용자 아바타 가져오기 실패:', error);
      return '/default-avatar.png';
    }
  }
}



