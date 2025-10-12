/**
 * 부족분 신청 서비스
 * Firestore의 shortage-requests 컬렉션 관리
 * 
 * 규칙 준수: shared/services/firebase/firestore.ts의 공통 함수만 사용
 */

import { 
  addDocument,
  updateDocument,
  deleteDocument,
  getDocumentsWithQuery,
  getDocument
} from '@/shared/services/firebase/firestore';
import { ShortageRequest, PackagingReport } from '@/features/production/types';
import { createShortageNotification } from './notificationService';

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
    
    const docId = await addDocument(SHORTAGE_REQUESTS_COLLECTION, shortageRequest);
    
    // 부족분 신청 알림 발송
    try {
      await createShortageNotification(
        docId,
        author.displayName,
        report.productName,
        report.partName,
        report.supplier,
        shortageData.requestedShortageQuantity,
        shortageData.shortageReason,
        author.uid
      );
    } catch (notificationError) {
      console.error('부족분 신청 알림 발송 실패:', notificationError);
      // 알림 실패해도 부족분 신청은 성공으로 처리
    }
    
    return docId;
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
  try {
    const now = new Date().toISOString();
    
    // 기존 데이터 가져오기
    const existingDoc = await getDocument(SHORTAGE_REQUESTS_COLLECTION, requestId) as ShortageRequest | null;
    if (!existingDoc) {
      throw new Error('부족분 신청을 찾을 수 없습니다.');
    }
    
    // history 배열에 새 항목 추가
    const updatedHistory = [
      ...(existingDoc.history || []),
      {
        status: '수정',
        date: now,
        user: author.displayName,
        reason: '부족분 신청 수정됨'
      }
    ];
    
    await updateDocument(SHORTAGE_REQUESTS_COLLECTION, requestId, {
      shortageReason: shortageData.shortageReason,
      requestedShortageQuantity: shortageData.requestedShortageQuantity,
      history: updatedHistory
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
  try {
    const now = new Date().toISOString();
    
    // 기존 데이터 가져오기
    const existingDoc = await getDocument(SHORTAGE_REQUESTS_COLLECTION, requestId) as ShortageRequest | null;
    if (!existingDoc) {
      throw new Error('부족분 신청을 찾을 수 없습니다.');
    }
    
    // history 배열에 새 항목 추가
    const updatedHistory = [
      ...(existingDoc.history || []),
      {
        status: newStatus === 'completed' ? '완료 처리' : '요청 상태로 복원',
        date: now,
        user: author.displayName,
        reason: newStatus === 'completed' ? '관리자 완료 처리' : '상태 복원'
      }
    ];
    
    await updateDocument(SHORTAGE_REQUESTS_COLLECTION, requestId, {
      status: newStatus,
      history: updatedHistory
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
  try {
    await deleteDocument(SHORTAGE_REQUESTS_COLLECTION, requestId);
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
  try {
    const requests = await getDocumentsWithQuery(
      SHORTAGE_REQUESTS_COLLECTION,
      [],
      'createdAt',
      'desc'
    ) as ShortageRequest[];
    
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
  try {
    const requests = await getDocumentsWithQuery(
      SHORTAGE_REQUESTS_COLLECTION,
      [],
      'createdAt',
      'desc'
    ) as ShortageRequest[];
    
    return requests;
  } catch (error) {
    console.error('❌ [ShortageService] 부족분 신청 목록 조회 실패:', error);
    throw error;
  }
};

