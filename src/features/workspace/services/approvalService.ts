/**
 * 보고/승인 관리 서비스
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
  ReportRequest,
  CreateReportRequestData,
  UpdateReportRequestData,
} from '../types/approval.types';

const REPORTS_COLLECTION = 'reportRequests';

export class ApprovalService {
  /**
   * 보고 요청 생성
   */
  static async createReportRequest(
    data: CreateReportRequestData,
    requestedBy: string,
    requestedByName: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const now = new Date().toISOString();
    const reportData: Omit<ReportRequest, 'id'> = {
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

    const docRef = await addDoc(collection(db, REPORTS_COLLECTION), reportData);
    return docRef.id;
  }

  /**
   * 보고 요청 조회
   */
  static async getReportRequest(reportId: string): Promise<ReportRequest | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, REPORTS_COLLECTION, reportId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as ReportRequest;
  }

  /**
   * 워크스페이스의 보고 요청 목록 조회
   */
  static async getWorkspaceReports(
    workspaceId: string,
    status?: ReportRequest['status']
  ): Promise<ReportRequest[]> {
    if (!db) throw new Error('Firestore is not initialized');

    let q = query(
      collection(db, REPORTS_COLLECTION),
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
    })) as ReportRequest[];
  }

  /**
   * 사용자의 보고 요청 목록 조회
   */
  static async getUserReports(
    userId: string,
    workspaceId?: string
  ): Promise<ReportRequest[]> {
    if (!db) throw new Error('Firestore is not initialized');

    let q = query(
      collection(db, REPORTS_COLLECTION),
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
    })) as ReportRequest[];
  }

  /**
   * 보고 요청 업데이트 (승인/거절)
   */
  static async updateReportRequest(
    reportId: string,
    data: UpdateReportRequestData,
    updatedBy: string,
    updatedByName: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(db, REPORTS_COLLECTION, reportId);
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
   * 보고 요청 실시간 구독
   */
  static subscribeToWorkspaceReports(
    workspaceId: string,
    callback: (reports: ReportRequest[]) => void
  ): () => void {
    if (!db) throw new Error('Firestore is not initialized');

    const q = query(
      collection(db, REPORTS_COLLECTION),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ReportRequest[];
      callback(reports);
    });
  }
}


