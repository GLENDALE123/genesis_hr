/**
 * 부족분 신청 서비스
 * Firestore의 shortage-requests 컬렉션 관리
 */

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  getDocs,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase';
import { ShortageRequest, PackagingReport } from '@/features/production/types';

const SHORTAGE_REQUESTS_COLLECTION = 'shortage-requests';

/**
 * 부족분 신청 생성
 */
export const createShortageRequest = async (
  report: PackagingReport,
  shortageData: {
    shortageReason: string;
    requestedShortageQuantity: number;
  },
  author: { uid: string; displayName: string }
): Promise<string> => {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    const now = new Date().toISOString();
    
    const shortageRequest: Omit<ShortageRequest, 'id'> = {
      createdAt: now,
      author,
      sourceReportId: report.id,
      // 생산일보 정보
      productionLine: report.productionLine,
      orderNumbers: report.orderNumbers,
      supplier: report.supplier,
      productName: report.productName,
      partName: report.partName,
      specification: report.specification,
      orderQuantity: report.orderQuantity,
      inputQuantity: report.inputQuantity,
      goodQuantity: report.goodQuantity,
      defectQuantity: report.defectQuantity,
      // 부족분 신청 정보
      shortageReason: shortageData.shortageReason,
      requestedShortageQuantity: shortageData.requestedShortageQuantity,
      status: 'requested',
      history: [{
        status: '생성',
        date: now,
        user: author.displayName,
        reason: '부족분 신청 생성됨'
      }],
      comments: []
    };
    
    const docRef = await addDoc(
      collection(db, SHORTAGE_REQUESTS_COLLECTION),
      shortageRequest
    );
    
    return docRef.id;
  } catch (error) {
    console.error('❌ [ShortageService] 부족분 신청 생성 실패:', error);
    throw error;
  }
};

/**
 * 부족분 신청 업데이트 (사유 및 수량 수정)
 */
export const updateShortageRequest = async (
  requestId: string,
  shortageData: {
    shortageReason: string;
    requestedShortageQuantity: number;
  },
  author: { uid: string; displayName: string }
): Promise<void> => {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    const now = new Date().toISOString();
    const docRef = doc(db, SHORTAGE_REQUESTS_COLLECTION, requestId);
    
    await updateDoc(docRef, {
      shortageReason: shortageData.shortageReason,
      requestedShortageQuantity: shortageData.requestedShortageQuantity,
      history: arrayUnion({
        status: '수정',
        date: now,
        user: author.displayName,
        reason: '부족분 신청 수정됨'
      })
    });
  } catch (error) {
    console.error('❌ [ShortageService] 부족분 신청 업데이트 실패:', error);
    throw error;
  }
};

/**
 * 부족분 신청 상태 변경 (requested ↔ completed)
 */
export const updateShortageStatus = async (
  requestId: string,
  newStatus: 'requested' | 'completed',
  author: { uid: string; displayName: string }
): Promise<void> => {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    const now = new Date().toISOString();
    const docRef = doc(db, SHORTAGE_REQUESTS_COLLECTION, requestId);
    
    await updateDoc(docRef, {
      status: newStatus,
      history: arrayUnion({
        status: newStatus === 'completed' ? '완료 처리' : '요청 상태로 복원',
        date: now,
        user: author.displayName,
        reason: newStatus === 'completed' ? '관리자 완료 처리' : '상태 복원'
      })
    });
  } catch (error) {
    console.error('❌ [ShortageService] 부족분 신청 상태 변경 실패:', error);
    throw error;
  }
};

/**
 * 부족분 신청 삭제
 */
export const deleteShortageRequest = async (requestId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    const docRef = doc(db, SHORTAGE_REQUESTS_COLLECTION, requestId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('❌ [ShortageService] 부족분 신청 삭제 실패:', error);
    throw error;
  }
};

/**
 * 특정 생산일보에 대한 부족분 신청 조회
 */
export const getShortageRequestByReportId = async (
  reportId: string
): Promise<ShortageRequest | null> => {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    const q = query(
      collection(db, SHORTAGE_REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ShortageRequest[];
    
    // sourceReportId가 일치하는 첫 번째 요청 반환
    const request = requests.find(req => req.sourceReportId === reportId);
    return request || null;
  } catch (error) {
    console.error('❌ [ShortageService] 부족분 신청 조회 실패:', error);
    throw error;
  }
};

/**
 * 모든 부족분 신청 조회
 */
export const getAllShortageRequests = async (): Promise<ShortageRequest[]> => {
  if (!db) {
    throw new Error('Firestore가 초기화되지 않았습니다.');
  }

  try {
    const q = query(
      collection(db, SHORTAGE_REQUESTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ShortageRequest[];
    
    return requests;
  } catch (error) {
    console.error('❌ [ShortageService] 부족분 신청 목록 조회 실패:', error);
    throw error;
  }
};

