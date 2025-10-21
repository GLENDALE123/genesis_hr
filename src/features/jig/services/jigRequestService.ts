/**
 * 지그 요청 서비스
 */

import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  getDocumentsWithQuery,
  onCollectionSnapshot
} from '@/shared/services/firebase/firestore';
import { uploadImageFilesParallel, deleteFile } from '@/shared/services/firebase/storage';
import { JigRequest, CreateJigRequestData, UpdateJigRequestData, HistoryEntry, JigComment, JigStatus } from '../types';
import { JIG_COLLECTIONS, JIG_STORAGE_PATHS } from '../constants';
import { generateJigRequestId } from '../utils';

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
  currentUser: { uid: string; displayName: string }
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

  await addDocument(JIG_COLLECTIONS.REQUESTS, newRequest);
  return newRequest;
};

// 지그 요청 수정
export const updateJigRequest = async (
  id: string,
  data: UpdateJigRequestData,
  currentUser: { uid: string; displayName: string }
): Promise<void> => {
  const now = new Date().toISOString();
  
  const historyEntry: HistoryEntry = {
    status: 'updated',
    date: now,
    user: currentUser.displayName,
    action: 'updated',
    reason: '요청이 수정되었습니다.'
  };

  await updateDocument(JIG_COLLECTIONS.REQUESTS, id, {
    ...data,
  });
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
    throw new Error('요청을 찾을 수 없습니다.');
  }

  const historyEntry: HistoryEntry = {
    status: newStatus,
    date: now,
    user: currentUser.displayName,
    action: 'status_changed',
    reason: `상태가 ${existingRequest.status}에서 ${newStatus}로 변경되었습니다.`,
  };

  const updatedHistory = [...(existingRequest.history || []), historyEntry];
  
  await updateDocument(JIG_COLLECTIONS.REQUESTS, requestId, {
    status: newStatus,
    history: updatedHistory,
  });
};