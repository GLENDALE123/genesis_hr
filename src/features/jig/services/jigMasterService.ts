/**
 * 지그 마스터 서비스
 */

import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  getDocumentsWithQuery,
  onCollectionSnapshot,
  getCollectionRef
} from '@/shared/services/firebase/firestore';
import { query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { uploadImageFilesParallel, deleteFile } from '@/shared/services/firebase/storage';
import { JigMasterItem, CreateJigMasterItemData, UpdateJigMasterItemData } from '../types';
import { JIG_COLLECTIONS, JIG_STORAGE_PATHS } from '../constants';

// 지그 마스터 목록 조회
export const getJigMasterItems = async (): Promise<JigMasterItem[]> => {
  const q = query(
    getCollectionRef(JIG_COLLECTIONS.MASTER),
    orderBy('createdAt', 'desc') // 입력일자 최신순 정렬
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as JigMasterItem));
};

// 지그 마스터 단일 조회
export const getJigMasterItem = async (id: string): Promise<JigMasterItem | null> => {
  const doc = await getDocument(JIG_COLLECTIONS.MASTER, id);
  return doc ? (doc as JigMasterItem) : null;
};

// 지그 마스터 생성
export const createJigMasterItem = async (
  data: CreateJigMasterItemData,
  imageFiles: File[],
  currentUser: { uid: string; displayName: string }
): Promise<JigMasterItem> => {
  const id = `master_${Date.now()}`;
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

  const jigMasterItem: JigMasterItem = {
    id,
    createdAt: now,
    ...data,
    imageUrls,
    createdBy: {
      uid: currentUser.uid,
      displayName: currentUser.displayName,
    },
  };

  await addDocument(JIG_COLLECTIONS.MASTER, jigMasterItem);
  return jigMasterItem;
};

// 지그 마스터 수정
export const updateJigMasterItem = async (
  id: string,
  updates: UpdateJigMasterItemData
): Promise<void> => {
  await updateDocument(JIG_COLLECTIONS.MASTER, id, updates);
};

// 지그 마스터 삭제
export const deleteJigMasterItem = async (id: string): Promise<void> => {
  // 이미지 파일들도 함께 삭제
  const item = await getJigMasterItem(id);
  if (item?.imageUrls) {
    for (const imageUrl of item.imageUrls) {
      try {
        await deleteFile(imageUrl);
      } catch (error) {
        console.warn('이미지 삭제 실패:', imageUrl, error);
      }
    }
  }
  
  await deleteDocument(JIG_COLLECTIONS.MASTER, id);
};

// 지그 마스터 실시간 구독
export const subscribeToJigMasters = (
  onUpdate: (masters: JigMasterItem[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const q = query(
    getCollectionRef(JIG_COLLECTIONS.MASTER),
    orderBy('createdAt', 'desc') // 입력일자 최신순 정렬
  );
  
  return onSnapshot(q, (snapshot) => {
    const masters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as JigMasterItem));
    onUpdate(masters);
  }, onError);
};

// 자동완성 데이터 조회
export const getAutocompleteData = async () => {
  const items = await getJigMasterItems();
  
  const itemNames = [...new Set(items.map(item => item.itemName))].sort();
  const partNames = [...new Set(items.map(item => item.partName))].sort();
  const itemNumbers = [...new Set(items.map(item => item.itemNumber))].sort();
  
  return {
    itemNames,
    partNames,
    itemNumbers,
  };
};