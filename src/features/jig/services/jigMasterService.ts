/**
 * 지그 마스터 서비스
 */

import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  getDocumentsWithQuery
} from '@/shared/services/firebase/firestore';
import { uploadImageFiles, deleteFile } from '@/shared/services/firebase/storage';
import { JigMasterItem, CreateJigMasterItemData, UpdateJigMasterItemData } from '../types';
import { JIG_COLLECTIONS, JIG_STORAGE_PATHS } from '../constants';

// 지그 마스터 목록 조회
export const getJigMasterItems = async (): Promise<JigMasterItem[]> => {
  const docs = await getDocuments(JIG_COLLECTIONS.MASTER);
  return docs.map(doc => doc as JigMasterItem);
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
  
  // 이미지 업로드
  let imageUrls: string[] = [];
  if (imageFiles.length > 0) {
    imageUrls = await uploadImageFiles(imageFiles, JIG_STORAGE_PATHS.IMAGES);
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

// 테스트용 지그 마스터 데이터 생성
export const createTestJigMasterData = async (currentUser: { uid: string; displayName: string }) => {
  const testData: CreateJigMasterItemData[] = [
    {
      requestType: '증착용',
      itemName: '테스트크림',
      partName: '외용기',
      itemNumber: 'TEST-001',
      remarks: '테스트용 지그 데이터입니다.',
    },
    {
      requestType: '코팅용',
      itemName: '테스트로션',
      partName: '펌프',
      itemNumber: 'TEST-002',
      remarks: '테스트용 지그 데이터입니다.',
    },
    {
      requestType: '내부코팅용',
      itemName: '테스트세럼',
      partName: '드로퍼',
      itemNumber: 'TEST-003',
      remarks: '테스트용 지그 데이터입니다.',
    },
  ];

  try {
    for (const data of testData) {
      await createJigMasterItem(data, [], currentUser);
    }
  } catch (error) {
    throw error;
  }
};