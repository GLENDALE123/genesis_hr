/**
 * 결제 관리 서비스
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
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import type {
  PaymentRequest,
  CreatePaymentRequestData,
  UpdatePaymentRequestData,
} from '../types/payment.types';

const PAYMENTS_COLLECTION = 'paymentRequests';

export class PaymentService {
  /**
   * 결제 요청 생성
   */
  static async createPaymentRequest(
    data: CreatePaymentRequestData,
    requestedBy: string,
    requestedByName: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const now = new Date().toISOString();
    const paymentData: Omit<PaymentRequest, 'id'> = {
      workspaceId: data.workspaceId,
      channelId: data.channelId,
      requestedBy,
      requestedByName,
      amount: data.amount,
      currency: data.currency || 'KRW',
      type: data.type,
      title: data.title,
      description: data.description,
      category: data.category,
      attachments: data.attachments || [],
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), paymentData);
    return docRef.id;
  }

  /**
   * 결제 요청 조회
   */
  static async getPaymentRequest(paymentId: string): Promise<PaymentRequest | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, PAYMENTS_COLLECTION, paymentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as PaymentRequest;
  }

  /**
   * 워크스페이스의 결제 요청 목록 조회
   */
  static async getWorkspacePayments(
    workspaceId: string,
    status?: PaymentRequest['status']
  ): Promise<PaymentRequest[]> {
    if (!db) throw new Error('Firestore is not initialized');

    let q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      q = query(q, where('status', '==', status));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PaymentRequest[];
  }

  /**
   * 사용자의 결제 요청 목록 조회
   */
  static async getUserPayments(
    userId: string,
    workspaceId?: string
  ): Promise<PaymentRequest[]> {
    if (!db) throw new Error('Firestore is not initialized');

    let q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('requestedBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (workspaceId) {
      q = query(q, where('workspaceId', '==', workspaceId));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PaymentRequest[];
  }

  /**
   * 결제 요청 업데이트 (승인/거절)
   */
  static async updatePaymentRequest(
    paymentId: string,
    data: UpdatePaymentRequestData,
    updatedBy: string,
    updatedByName: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, PAYMENTS_COLLECTION, paymentId);
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (data.status) {
      updateData.status = data.status;
      
      if (data.status === 'approved') {
        updateData.approvedBy = updatedBy;
        updateData.approvedByName = updatedByName;
        updateData.approvedAt = new Date().toISOString();
      } else if (data.status === 'rejected') {
        updateData.rejectedReason = data.rejectedReason || '';
      } else if (data.status === 'completed') {
        updateData.completedAt = new Date().toISOString();
      }
    }

    await updateDoc(docRef, updateData);
  }

  /**
   * 결제 요청 실시간 구독
   */
  static subscribeToWorkspacePayments(
    workspaceId: string,
    callback: (payments: PaymentRequest[]) => void
  ): () => void {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentRequest[];
      callback(payments);
    });
  }
}

