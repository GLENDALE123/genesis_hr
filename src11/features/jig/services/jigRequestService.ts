/**
 * 지그 요청 서비스
 */

import {
  getDocuments,
  getDocument,
  addDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  getDocumentsWithQuery,
  onCollectionSnapshot
} from '@/shared/services/firebase/firestore';
import { uploadImageFilesParallel, deleteFile } from '@/shared/services/firebase/storage';
import { auth } from '@/shared/services/firebase/config';
import { JigRequest, CreateJigRequestData, UpdateJigRequestData, HistoryEntry, JigComment, JigStatus } from '../types';
import { JIG_COLLECTIONS, JIG_STORAGE_PATHS } from '../constants';
import { generateJigRequestId } from '../utils';
import { UnifiedNotificationService } from '@/shared/services/notificationService';

// undefined 값을 null로 변환하는 유틸리티 함수
const cleanUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefinedValues);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        cleaned[key] = null;
      } else {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};

// 지그 요청 실시간 구독
export const subscribeToJigRequests = (
  onUpdate: (requests: JigRequest[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  return onCollectionSnapshot(
    JIG_COLLECTIONS.REQUESTS,
    (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as JigRequest));
      onUpdate(requests);
    }
  );
};

// 지그 요청 목록 조회
export const getJigRequests = async (): Promise<JigRequest[]> => {
  const docs = await getDocuments(JIG_COLLECTIONS.REQUESTS);
  return docs.map(doc => doc as JigRequest);
};

// 지그 요청 단일 조회
export const getJigRequest = async (id: string): Promise<JigRequest | null> => {
  const doc = await getDocument(JIG_COLLECTIONS.REQUESTS, id);
  return doc ? (doc as JigRequest) : null;
};

// 지그 요청 생성
export const createJigRequest = async (
  data: CreateJigRequestData,
  imageFiles: File[],
  currentUser: { uid: string; displayName: string; photoURL?: string }
): Promise<JigRequest> => {
  const id = await generateJigRequestId();
  const now = new Date().toISOString();
  
  // 이미지 업로드 (병렬 압축 + 업로드)
  let imageUrls: string[] = [];
  if (imageFiles.length > 0) {
    try {
      // 병렬처리 함수 사용 (압축 + 업로드 동시 처리)
      imageUrls = await uploadImageFilesParallel(imageFiles, JIG_STORAGE_PATHS.IMAGES);
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw new Error(`이미지 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  const historyEntry: HistoryEntry = {
    status: JigStatus.Request,
    date: now,
    user: currentUser.displayName,
    action: 'created',
    reason: '요청이 생성되었습니다.'
  };

  const newRequest: JigRequest = {
    id,
    ...data,
    imageUrls,
    status: JigStatus.Request,
    history: [historyEntry],
    comments: [],
  };

  // undefined 값을 null로 변환하여 Firestore 호환성 보장
  const cleanedRequest = cleanUndefinedValues(newRequest);
  await setDocument(JIG_COLLECTIONS.REQUESTS, id, cleanedRequest);
  // 알림 전송: 지그 요청 등록
  try {
    // FirebaseAuth를 먼저 사용하여 사용자 정보 가져오기
    let senderName = '사용자';
    let senderAvatar: string | undefined = undefined;
    
    if (auth?.currentUser) {
      senderName = auth.currentUser.displayName || 
                   auth.currentUser.email?.split('@')[0] || 
                   currentUser.displayName || 
                   '사용자';
      senderAvatar = auth.currentUser.photoURL || currentUser.photoURL || undefined;
    } else if (currentUser.displayName) {
      senderName = currentUser.displayName;
      senderAvatar = currentUser.photoURL || undefined;
    }

    await UnifiedNotificationService.sendJigRequestCreatedNotification({
      requestId: id,
      productName: (data as any).productName || data.itemName,
      partName: data.partName,
      jigNumber: (data as any).itemNumber || '',
      requestType: data.requestType,
      status: '요청',
      senderName,
      senderUid: currentUser.uid,
      senderAvatar
    });
  } catch (e) {
    console.warn('지그 요청 등록 알림 실패:', e);
  }
  return newRequest;
};

// 지그 요청 수정
export const updateJigRequest = async (
  id: string,
  data: UpdateJigRequestData,
  currentUser: { uid: string; displayName: string }
): Promise<void> => {
  const now = new Date().toISOString();
  
  // 기존 요청 정보 가져오기
  const existingRequest = await getJigRequest(id);
  if (!existingRequest) {
    throw new Error('요청을 찾을 수 없습니다.');
  }
  
  const historyEntry: HistoryEntry = {
    status: existingRequest.status, // 기존 상태 유지
    date: now,
    user: currentUser.displayName,
    action: 'updated',
    reason: '요청이 수정되었습니다.'
  };

  // 기존 히스토리에 새 항목 추가
  const updatedHistory = [...(existingRequest.history || []), historyEntry];

  // undefined 값을 null로 변환하여 Firestore 호환성 보장
  const cleanedData = cleanUndefinedValues({
    ...data,
    history: updatedHistory,
  });

  await updateDocument(JIG_COLLECTIONS.REQUESTS, id, cleanedData);
};

// 지그 요청 삭제
export const deleteJigRequest = async (id: string): Promise<void> => {
  // 이미지 파일들도 함께 삭제
  const request = await getJigRequest(id);
  if (request?.imageUrls) {
    for (const imageUrl of request.imageUrls) {
      try {
        await deleteFile(imageUrl);
      } catch (error) {
        console.warn('이미지 삭제 실패:', imageUrl, error);
      }
    }
  }
  
  await deleteDocument(JIG_COLLECTIONS.REQUESTS, id);
};

// 지그 요청에 댓글 추가
export const addJigRequestComment = async (
  requestId: string,
  commentText: string,
  currentUser: { uid: string; displayName: string }
): Promise<void> => {
  const now = new Date().toISOString();
  
  const newComment: JigComment = {
    id: `comment_${Date.now()}`,
    text: commentText,
    uid: currentUser.uid,
    user: currentUser.displayName,
    userName: currentUser.displayName,
    createdAt: now,
  };

  const request = await getJigRequest(requestId);
  if (!request) {
    throw new Error('요청을 찾을 수 없습니다.');
  }

  const updatedComments = [...(request.comments || []), newComment];
  
  await updateDocument(JIG_COLLECTIONS.REQUESTS, requestId, {
    comments: updatedComments,
  });
};

// 지그 요청 입고 처리
export const updateJigRequestQuantity = async (
  requestId: string,
  quantityChange: number,
  currentUser: { uid: string; displayName: string; photoURL?: string }
): Promise<void> => {
  const now = new Date().toISOString();
  
  const existingRequest = await getJigRequest(requestId);
  if (!existingRequest) {
    throw new Error('요청을 찾을 수 없습니다.');
  }

  const newReceivedQuantity = Math.max(0, existingRequest.receivedQuantity + quantityChange);
  
  // 초과 입고 허용 (제한 제거)
  const finalReceivedQuantity = newReceivedQuantity;
  
  const actionType = quantityChange > 0 ? '입고' : '반출';
  const actionText = quantityChange > 0 ? 
    `${Math.abs(quantityChange)}개 입고 처리` : 
    `${Math.abs(quantityChange)}개 반출 처리`;

  const historyEntry: HistoryEntry = {
    status: existingRequest.status,
    date: now,
    user: currentUser.displayName,
    action: 'quantity_changed',
    reason: `${actionText} (입고 수량: ${finalReceivedQuantity}/${existingRequest.quantity})`,
  };

  const updatedHistory = [...(existingRequest.history || []), historyEntry];
  
  // 입고 수량에 따른 상태 변경 로직
  let newStatus = existingRequest.status;
  
  if (finalReceivedQuantity === 0) {
    // 입고 수량이 0이면 진행중 상태
    if (existingRequest.status !== JigStatus.InProgress) {
      newStatus = JigStatus.InProgress;
      
      const progressHistoryEntry: HistoryEntry = {
        status: JigStatus.InProgress,
        date: now,
        user: currentUser.displayName,
        action: 'status_changed',
        reason: '입고 수량이 0개로 진행중 상태로 변경되었습니다.',
      };
      
      updatedHistory.push(progressHistoryEntry);
    }
  } else if (finalReceivedQuantity > 0 && finalReceivedQuantity < existingRequest.quantity) {
    // 입고 수량이 0보다 크고 총 수량보다 작으면 입고중 상태
    if (existingRequest.status !== JigStatus.Receiving) {
      newStatus = JigStatus.Receiving;
      
      const receivingHistoryEntry: HistoryEntry = {
        status: JigStatus.Receiving,
        date: now,
        user: currentUser.displayName,
        action: 'status_changed',
        reason: `입고 수량이 ${finalReceivedQuantity}개로 입고중 상태로 변경되었습니다.`,
      };
      
      updatedHistory.push(receivingHistoryEntry);
    }
  } else if (finalReceivedQuantity >= existingRequest.quantity) {
    // 입고 수량이 총 수량 이상이면 완료 상태 (초과 입고도 완료로 처리)
    if (existingRequest.status !== JigStatus.Completed) {
      newStatus = JigStatus.Completed;
      
      const completionHistoryEntry: HistoryEntry = {
        status: JigStatus.Completed,
        date: now,
        user: currentUser.displayName,
        action: 'status_changed',
        reason: finalReceivedQuantity === existingRequest.quantity 
          ? '모든 수량이 입고되어 완료 상태로 변경되었습니다.'
          : `입고 수량이 총 수량을 초과하여 완료 상태로 변경되었습니다. (${finalReceivedQuantity}/${existingRequest.quantity})`,
      };
      
      updatedHistory.push(completionHistoryEntry);
    }
  }
  
  const updateData = {
    receivedQuantity: finalReceivedQuantity,
    status: newStatus,
    history: updatedHistory,
  };

  // undefined 값을 null로 변환하여 Firestore 호환성 보장
  const cleanedUpdateData = cleanUndefinedValues(updateData);

  await updateDocument(JIG_COLLECTIONS.REQUESTS, requestId, cleanedUpdateData);

  // 알림 전송: 지그 입고 처리 (입고/반출 모두 공지하되 수량 기준으로 텍스트 통일)
  try {
    // FirebaseAuth를 먼저 사용하여 사용자 정보 가져오기
    let senderName = '사용자';
    let senderAvatar: string | undefined = undefined;
    
    if (auth?.currentUser) {
      senderName = auth.currentUser.displayName || 
                   auth.currentUser.email?.split('@')[0] || 
                   currentUser.displayName || 
                   '사용자';
      senderAvatar = auth.currentUser.photoURL || currentUser.photoURL || undefined;
    } else if (currentUser.displayName) {
      senderName = currentUser.displayName;
      senderAvatar = currentUser.photoURL || undefined;
    }

    await UnifiedNotificationService.sendJigReceiveNotification({
      requestId,
      productName: (existingRequest as any).productName || existingRequest.itemName,
      partName: existingRequest.partName,
      receivedQuantity: Math.abs(quantityChange),
      currentReceivedQuantity: finalReceivedQuantity,
      totalQuantity: existingRequest.quantity,
      status: newStatus,
      senderName,
      senderUid: currentUser.uid,
      senderAvatar
    });
  } catch (e) {
    console.warn('지그 입고 처리 알림 실패:', e);
  }
};

// 지그 요청 상태 업데이트
export const updateJigRequestStatus = async (
  requestId: string,
  newStatus: JigStatus,
  currentUser: { uid: string; displayName: string },
  reason?: string
): Promise<void> => {
  const now = new Date().toISOString();
  const existingRequest = await getJigRequest(requestId);
  if (!existingRequest) {
    console.error('❌ 요청을 찾을 수 없음:', requestId);
    throw new Error('요청을 찾을 수 없습니다.');
  }
  const historyEntry: HistoryEntry = {
    status: newStatus,
    date: now,
    user: currentUser.displayName,
    action: 'status_changed',
    reason: reason || `상태가 ${existingRequest.status}에서 ${newStatus}로 변경되었습니다.`,
  };

  const updatedHistory = [...(existingRequest.history || []), historyEntry];
  
  const updateData = {
    status: newStatus,
    history: updatedHistory,
  };

  // undefined 값을 null로 변환하여 Firestore 호환성 보장
  const cleanedUpdateData = cleanUndefinedValues(updateData);

  await updateDocument(JIG_COLLECTIONS.REQUESTS, requestId, cleanedUpdateData);
};