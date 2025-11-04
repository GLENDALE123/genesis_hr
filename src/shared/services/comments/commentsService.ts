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
import { db, auth } from '@/shared/services/firebase/config';

// ============================================================================
// 타입 정의
// ============================================================================

export interface Comment {
  id: string;
  timestamp?: string; // HS-Next용 날짜 필드
  date?: string; // HS-jig 호환성을 위한 날짜 필드
  text: string;
  user: string;
  uid?: string;
  readBy?: string[];
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
    const currentData = (snapshot.docs[0] && snapshot.docs[0].data());

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      timestamp: now,
      text: commentData.text,
      user: commentData.user,
      uid: commentData.uid,
      readBy: [commentData.uid],
    };

    // HS-jig 호환성을 위해 댓글에 date 필드도 추가
    const commentWithDate = {
      ...newComment,
      date: now, // HS-jig 호환성을 위한 date 필드
    };

    await updateDoc(docRef, {
      comments: [...((currentData && currentData.comments) || []), commentWithDate],
    });

    // 댓글/멘션 알림 전송 (항상)
    await this.sendMentionNotifications(
      collectionName,
      documentId,
      commentData,
      currentData
    );
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
    const currentData = (snapshot.docs[0] && snapshot.docs[0].data());

    if (!currentData || !currentData.comments) return;

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
    const currentData = (snapshot.docs[0] && snapshot.docs[0].data());

    if (!currentData || !currentData.comments) return;

    // 댓글 찾아서 readBy 업데이트 (readBy가 없는 경우 빈 배열로 초기화)
    const updatedComments = currentData.comments.map((comment: Comment) => {
      if (comment.id === commentId) {
        const readBy = comment.readBy || [];
        if (!readBy.includes(userId)) {
          return { ...comment, readBy: [...readBy, userId] };
        }
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
    const currentData = (snapshot.docs[0] && snapshot.docs[0].data());

    if (!currentData || !currentData.comments) return;

    // 모든 댓글에 userId 추가 (readBy가 없는 경우 빈 배열로 초기화)
    const updatedComments = currentData.comments.map((comment: Comment) => {
      const readBy = comment.readBy || [];
      if (!readBy.includes(userId)) {
        return { ...comment, readBy: [...readBy, userId] };
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
    requestData: Record<string, unknown>
  ): Promise<void> {
    try {
      const requestAuthorId = (requestData?.author as { uid?: string })?.uid;
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
    requestData: Record<string, unknown>;
  }): Promise<void> {
    const { userId, type, collectionName, documentId, commentData, requestData } = params;
    
    // 제품명/부속명 추출 (데이터 호환: productName|itemName, partName|parName, 샘플은 items[0].partName)
    let rawProductName = (requestData && ((requestData as any).productName || (requestData as any).itemName)) || '제품명';
    let rawPartName = (requestData && ((requestData as any).partName || (requestData as any).parName)) || '';

    // 샘플 요청의 경우 partName이 items[0].partName에 있을 수 있음
    if (!rawPartName && collectionName === 'sample-requests') {
      const items = (requestData && (requestData as any).items) || [];
      if (Array.isArray(items) && items.length > 0) {
        const firstItem = items[0] || {};
        if (firstItem && (firstItem as any).partName) {
          rawPartName = (firstItem as any).partName;
        }
      }
    }

    if (!rawPartName) rawPartName = '부속명';
    const productName = String(rawProductName);
    const partName = String(rawPartName);
    const productInfo = `${productName} ${partName}`;
    
    // 알림 타입별 제목 생성
    let baseTitle = "생산관리부 요청사항";
    if (collectionName === 'sample-requests') {
      baseTitle = "샘플 요청";
    } else if (collectionName === 'jig-requests') {
      baseTitle = "지그 요청/관리";
    } else if (collectionName === 'quality-issues') {
      baseTitle = "품질이슈";
    }
    
    // 알림 메시지 구성
    const title = type === 'mention' 
      ? `멘션 : ${baseTitle}`
      : `댓글 : ${baseTitle}`;
    const body = commentData.text;  // ✅ 댓글 원문 그대로 (멘션 포함)
    
    // 사용자 프로필 이미지 가져오기
    // FirebaseAuth를 먼저 사용하여 사용자 정보 가져오기
    // 프로필 사진 우선순위: Firebase Auth.currentUser.photoURL → Firestore(users.photoURL) → undefined
    let senderAvatar: string | undefined = undefined;
    
    if (auth?.currentUser && auth.currentUser.uid === commentData.uid) {
      senderAvatar = auth.currentUser.photoURL || undefined;
    }
    
    if (!senderAvatar) {
      senderAvatar = await this.getUserAvatar(commentData.uid);
    }
    
    // Firebase Functions URL 설정
    const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
    
    const subType = collectionName === 'jig-requests' ? 'jig'
      : (collectionName === 'sample-requests' ? 'sample' : 'production');

    // FirebaseAuth를 먼저 사용하여 사용자 정보 가져오기
    let senderName = '사용자';
    if (auth?.currentUser && auth.currentUser.uid === commentData.uid) {
      senderName = auth.currentUser.displayName || 
                   auth.currentUser.email?.split('@')[0] || 
                   commentData.user || 
                   '사용자';
    } else if (commentData.user) {
      senderName = commentData.user;
    }

    const payload = {
      targetUsers: [userId],
      type: 'comment-mention',
      subType: subType,
      title: title,
      body: body,
      requestId: documentId,
      subtitle: productInfo,
      senderName,
      senderUid: commentData.uid,
      senderAvatar: senderAvatar,
      priority: 'normal'
    };

    try {
      
      const response = await fetch(`${functionsUrl}/createNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [댓글 알림] 전송 실패:', response.status, errorData);
        throw new Error(errorData.error || `알림 전송 실패: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ [댓글 알림] 전송 중 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 아바타 이미지 가져오기
   */
  private static async getUserAvatar(userId: string): Promise<string | undefined> {
    try {
      if (!db) return undefined;
      
      // Firestore에서 사용자 프로필 이미지 가져오기
      const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
      const userDoc = await getDoc(firestoreDoc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData?.photoURL || undefined;
      }
      
      return undefined;
    } catch (error) {
      console.error('사용자 아바타 가져오기 실패:', error);
      return undefined;
    }
  }

  /**
   * 테스트 댓글 알림 전송 (개발용)
   */
  static async sendTestCommentNotification(
    userName: string,
    userUid: string,
    userAvatar: string | undefined,
    type: '생산관리부' | '샘플요청'
  ): Promise<void> {
    try {
      // Firebase Functions URL 설정
      const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
      
      const title = type === '생산관리부' 
        ? '생산관리부 요청사항' 
        : '샘플 요청';
      
      const body = type === '생산관리부'
        ? '생산관리부 요청사항에 대한 댓글입니다. 확인 부탁드립니다.'
        : '샘플 요청 건에 대한 피드백이 도착했습니다.';
      
      const productInfo = type === '생산관리부'
        ? '테스트크림 / 외용기'
        : '테스트샘플 / 내용기';

      // Admin과 Manager에게 알림 발송 (테스트는 본인에게도 발송)
      const usersRef = collection(db!, 'users');
      const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
      const usersSnapshot = await getDocs(q);
      
      const targetUsers = usersSnapshot.docs.map(doc => doc.id);

      if (targetUsers.length === 0) {
        return;
      }

      const payload = {
        targetUsers,
        type: 'comment-mention',
        title,
        body: body,
        requestId: 'TEST-COMMENT-001',
        subtitle: productInfo,
        senderName: userName,
        senderUid: userUid,
        senderAvatar: userAvatar,
        priority: 'normal'
      };

      const response = await fetch(`${functionsUrl}/createNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`알림 전송 실패: ${response.status}`);
      }

    } catch (error) {
      console.error('테스트 댓글 알림 전송 실패:', error);
      throw error;
    }
  }
}



