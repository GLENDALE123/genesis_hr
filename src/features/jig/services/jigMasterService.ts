/**
 * 지그 마스터 서비스
 */

import {
  getDocuments,
  getDocument,
  setDocument,
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
  return snapshot.docs.map(doc => {
    const data = doc.data();
    // 문서 내부의 id 필드 제거 (실제 Firestore ID만 사용)
    const { id: _, ...cleanData } = data as any;
    return {
      id: doc.id, // 실제 Firestore 문서 ID만 사용
      ...cleanData
    } as JigMasterItem;
  });
};

// 지그 마스터 단일 조회
export const getJigMasterItem = async (id: string): Promise<JigMasterItem | null> => {
  const doc = await getDocument(JIG_COLLECTIONS.MASTER, id);
  if (!doc) return null;
  
  // 문서 내부의 id 필드 제거 (실제 Firestore ID만 사용)
  const { id: _, ...cleanData } = doc as any;
  return {
    id: doc.id, // 실제 Firestore 문서 ID만 사용
    ...cleanData
  } as JigMasterItem;
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

  const jigMasterItem: Omit<JigMasterItem, 'id'> = {
    createdAt: now,
    ...data,
    imageUrls,
    createdBy: {
      uid: currentUser.uid,
      displayName: currentUser.displayName,
    },
  };

  await setDocument(JIG_COLLECTIONS.MASTER, id, jigMasterItem);
  return { id, ...jigMasterItem };
};

// 지그 마스터 수정
export const updateJigMasterItem = async (
  id: string,
  updates: UpdateJigMasterItemData
): Promise<void> => {
  try {
    // 문서 존재 여부 확인
    const existingDoc = await getDocument(JIG_COLLECTIONS.MASTER, id);
    if (!existingDoc) {
      throw new Error('지그 정보를 찾을 수 없습니다.');
    }
    
    // id 필드가 포함되어 있다면 제거 (문서 내부에 id 필드 저장하지 않음)
    const { id: _, ...updateData } = updates as any;
    await updateDocument(JIG_COLLECTIONS.MASTER, id, updateData);
    
  } catch (error: any) {
    if (error.code === 'not-found' || error.message?.includes('No document to update')) {
      throw new Error('지그 정보를 찾을 수 없습니다.');
    }
    throw error;
  }
};

// 지그 마스터 삭제
export const deleteJigMasterItem = async (id: string): Promise<void> => {
  try {
    // 문서 존재 여부 확인
    const item = await getJigMasterItem(id);
    if (!item) {
      throw new Error('삭제할 지그 정보가 존재하지 않습니다.');
    }
    
    // 이미지 파일들도 함께 삭제
    if (item.imageUrls && item.imageUrls.length > 0) {
      for (const imageUrl of item.imageUrls) {
        try {
          await deleteFile(imageUrl);
        } catch (error) {
          console.warn('이미지 삭제 실패:', imageUrl, error);
        }
      }
    }
    
    // 문서 삭제
    await deleteDocument(JIG_COLLECTIONS.MASTER, id);
    
  } catch (error) {
    throw error;
  }
};

// 지그 마스터 실시간 구독 (성능 최적화)
export const subscribeToJigMasters = (
  onUpdate: (masters: JigMasterItem[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const q = query(
    getCollectionRef(JIG_COLLECTIONS.MASTER),
    orderBy('createdAt', 'desc') // 입력일자 최신순 정렬
  );
  
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastIds: string = ''; // 마지막 ID 문자열 저장 (메모리 효율적)
  const DEBOUNCE_DELAY = 500; // 500ms로 증가 (불필요한 업데이트 방지)
  
  return onSnapshot(q, (snapshot) => {
    // 디바운싱 적용
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      const masters = snapshot.docs.map(doc => {
        const data = doc.data();
        // 문서 내부의 id 필드 제거 (실제 Firestore ID만 사용)
        const { id: _, ...cleanData } = data as any;
        return {
          id: doc.id, // 실제 Firestore 문서 ID만 사용
          ...cleanData
        } as JigMasterItem;
      });
      
      // ID 문자열로 비교 (간단하고 빠름)
      const currentIds = masters.map(m => m.id).join(',');
      
      // 변경사항이 없으면 콜백 호출하지 않음
      if (lastIds === currentIds) {
        return;
      }
      
      lastIds = currentIds;
      onUpdate(masters);
    }, DEBOUNCE_DELAY);
  }, onError);
};


// 자동완성 데이터 조회 (캐시 최적화)
let autocompleteCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

export const getAutocompleteData = async () => {
  // 캐시된 데이터가 유효한지 확인
  if (autocompleteCache && 
      Date.now() - autocompleteCache.timestamp < CACHE_DURATION) {
    return autocompleteCache.data;
  }
  
  const items = await getJigMasterItems();
  
  // 기존 필드와 새 필드 모두에서 데이터 수집 (성능 최적화)
  const productNames = [...new Set([
    ...items.map(item => item.productName).filter(Boolean),
    ...items.map(item => item.itemName).filter(Boolean)
  ])].sort();
  
  const partNames = [...new Set(items.map(item => item.partName).filter(Boolean))].sort();
  
  const jigNumbers = [...new Set([
    ...items.map(item => item.jigNumber).filter(Boolean),
    ...items.map(item => item.itemNumber).filter(Boolean)
  ])].sort();
  
  const suppliers = [...new Set(items.map(item => item.supplier).filter(Boolean))].sort();
  
  const orderNumbers = [...new Set(items.map(item => item.orderNumber).filter(Boolean))].sort();
  
  const result = {
    // 기존 호환성 유지
    itemNames: productNames,
    partNames,
    itemNumbers: jigNumbers,
    
    // 새 필드들
    productNames,
    jigNumbers,
    suppliers,
    orderNumbers,
  };
  
  // 캐시 저장
  autocompleteCache = {
    data: result,
    timestamp: Date.now()
  };
  
  return result;
};