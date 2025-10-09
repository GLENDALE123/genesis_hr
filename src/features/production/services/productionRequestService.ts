// 생산 요청 관리 서비스
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';

export enum ProductionRequestType {
  Urgent = '긴급건',
  SalesUrgent = '영업부 긴급요청',
  LogisticsTransfer = '물류이동',
}

export enum ProductionRequestStatus {
  Requested = '요청',
  InProgress = '진행중',
  Hold = '보류',
  Completed = '완료',
  Rejected = '반려',
}

export interface ProductionRequest {
  id: string;
  createdAt: string;
  author: {
    uid: string;
    displayName: string;
  };
  requester: string;
  requestType: ProductionRequestType;
  status: ProductionRequestStatus;
  orderNumber: string;
  productName: string;
  partName: string;
  supplier: string;
  quantity: number;
  content: string;
  history: Array<{
    status: ProductionRequestStatus;
    date: string;
    user: string;
    reason?: string;
  }>;
  comments?: Array<{
    id: string;
    timestamp: string;
    user: string;
    text: string;
    uid: string;
    readBy?: string[];
  }>;
  imageUrls?: string[];
  sourceReportIds?: string[];
}

const COLLECTION_NAME = 'production-requests';

export const ProductionRequestService = {
  /**
   * 실시간으로 생산 요청 목록 구독
   */
  subscribeToRequests(
    callback: (requests: ProductionRequest[]) => void,
    onError?: (error: Error) => void
  ) {
    if (!db) throw new Error('Firestore is not initialized');
    
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      limit(300)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ProductionRequest[];
        callback(data);
      },
      (error) => {
        console.error('Error fetching production requests:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );
  },

  /**
   * 모든 생산 요청 조회 (일회성)
   */
  async getAllRequests(): Promise<ProductionRequest[]> {
    if (!db) throw new Error('Firestore is not initialized');
    
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      limit(300)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductionRequest[];
  },

  /**
   * 특정 상태의 생산 요청 조회
   */
  async getRequestsByStatus(
    status: ProductionRequestStatus
  ): Promise<ProductionRequest[]> {
    if (!db) throw new Error('Firestore is not initialized');
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductionRequest[];
  },

  /**
   * 생산 요청 생성
   */
  async createRequest(
    requestData: Omit<ProductionRequest, 'id' | 'createdAt' | 'history'>
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');
    
    const now = Timestamp.now().toDate().toISOString();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...requestData,
      createdAt: now,
      history: [
        {
          status: requestData.status,
          date: now,
          user: requestData.author.displayName,
          reason: '생성됨',
        },
      ],
    });
    return docRef.id;
  },

  /**
   * 생산 요청 상태 업데이트
   */
  async updateRequestStatus(
    requestId: string,
    status: ProductionRequestStatus,
    userName: string,
    reason?: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');
    
    const docRef = doc(db, COLLECTION_NAME, requestId);
    const now = Timestamp.now().toDate().toISOString();

    // 기존 데이터 가져오기
    const snapshot = await getDocs(
      query(collection(db, COLLECTION_NAME), where('__name__', '==', requestId))
    );
    const currentData = snapshot.docs[0]?.data() as ProductionRequest;

    const newHistoryEntry = {
      status,
      date: now,
      user: userName,
      reason: reason || '',
    };

    await updateDoc(docRef, {
      status,
      history: [...(currentData?.history || []), newHistoryEntry],
      updatedAt: now,
    });
  },

  /**
   * 생산 요청 수정
   */
  async updateRequest(
    requestId: string,
    updates: Partial<Omit<ProductionRequest, 'id' | 'createdAt'>>
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');
    
    const docRef = doc(db, COLLECTION_NAME, requestId);
    const now = Timestamp.now().toDate().toISOString();
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now,
    });
  },

  /**
   * 생산 요청 삭제
   */
  async deleteRequest(requestId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');
    
    const docRef = doc(db, COLLECTION_NAME, requestId);
    await deleteDoc(docRef);
  },

  // ✅ 댓글 관련 메서드는 제거됨
  // CommentsService를 직접 사용하세요:
  // await CommentsService.addComment('production-requests', requestId, comment);
  // await CommentsService.updateComment('production-requests', requestId, commentId, newText);
  // await CommentsService.deleteComment('production-requests', requestId, commentId);
};

