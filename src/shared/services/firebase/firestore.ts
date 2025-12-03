import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  WhereFilterOp,
  Query
} from 'firebase/firestore';
import { db } from './config';

// 컬렉션 참조 가져오기
export const getCollectionRef = (collectionName: string) => {
  if (!db) {
    console.error('❌ [Firebase Firestore] Firestore가 초기화되지 않음');
    throw new Error('Firestore is not initialized');
  }
  
  const collectionRef = collection(db, collectionName);
  return collectionRef;
};

// 문서 참조 가져오기
export const getDocRef = (collectionName: string, docId: string) => {
  if (!db) throw new Error('Firestore is not initialized');
  return doc(db, collectionName, docId);
};

// 단일 문서 가져오기
export const getDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = getDocRef(collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

// 컬렉션의 모든 문서 가져오기
export const getDocuments = async (collectionName: string) => {
  try {
    const querySnapshot = await getDocs(getCollectionRef(collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// 쿼리로 문서 가져오기
export const getDocumentsWithQuery = async (
  collectionName: string,
  queries: Array<{ field: string; operator: WhereFilterOp; value: unknown }> = [],
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'asc',
  limitCount?: number
) => {
  try {
    let q = query(getCollectionRef(collectionName));
    
    // where 조건 추가
    queries.forEach(({ field, operator, value }) => {
      q = query(q, where(field, operator, value));
    });
    
    // 정렬 조건 추가
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }
    
    // 제한 조건 추가
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * 캐시 우선 읽기: 캐시에서 먼저 읽고, 없으면 서버에서 가져오기
 * 성능 최적화를 위한 헬퍼 함수
 */
export const getDocumentsWithQueryCacheFirst = async (
  collectionName: string,
  queries: Array<{ field: string; operator: WhereFilterOp; value: unknown }> = [],
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'asc',
  limitCount?: number
) => {
  try {
    let q = query(getCollectionRef(collectionName));
    
    // where 조건 추가
    queries.forEach(({ field, operator, value }) => {
      q = query(q, where(field, operator, value));
    });
    
    // 정렬 조건 추가
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }
    
    // 제한 조건 추가
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    // 캐시에서 먼저 시도
    try {
      const cacheSnapshot = await getDocsFromCache(q);
      if (cacheSnapshot.size > 0) {
        // 캐시에 데이터가 있으면 즉시 반환
        return cacheSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    } catch (cacheError) {
      // 캐시에 없거나 오류 발생 시 서버에서 가져오기
      console.log('📦 [Firestore] 캐시에 데이터 없음, 서버에서 가져오기');
    }
    
    // 서버에서 가져오기
    const serverSnapshot = await getDocsFromServer(q);
    return serverSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// 새 문서 추가
export const addDocument = async (collectionName: string, data: DocumentData) => {
  try {
    const docRef = await addDoc(getCollectionRef(collectionName), data);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// 문서 설정 (수동 ID 지정)
export const setDocument = async (collectionName: string, docId: string, data: DocumentData) => {
  try {
    const docRef = getDocRef(collectionName, docId);
    await setDoc(docRef, data);
    return docId;
  } catch (error) {
    throw error;
  }
};

// 문서 업데이트
export const updateDocument = async (collectionName: string, docId: string, data: DocumentData) => {
  try {
    const docRef = getDocRef(collectionName, docId);
    await updateDoc(docRef, data);
  } catch (error) {
    throw error;
  }
};

// 문서 삭제
export const deleteDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = getDocRef(collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    throw error;
  }
};

// 실시간 리스너 설정
export const onCollectionSnapshot = (
  collectionName: string,
  callback: (snapshot: QuerySnapshot<DocumentData>) => void
) => {
  return onSnapshot(getCollectionRef(collectionName), callback);
};

/**
 * 캐시 우선 실시간 리스너
 * onSnapshot은 기본적으로 캐시를 먼저 확인하지만, 
 * 이 함수는 명시적으로 캐시 우선 전략을 사용합니다.
 */
export const onCollectionSnapshotCacheFirst = (
  collectionName: string,
  callback: (snapshot: QuerySnapshot<DocumentData>) => void,
  options?: {
    includeMetadataChanges?: boolean;
  }
) => {
  const q = getCollectionRef(collectionName);
  // onSnapshot은 기본적으로 캐시를 먼저 확인하고 서버와 동기화합니다
  return onSnapshot(q, {
    includeMetadataChanges: options?.includeMetadataChanges || false
  }, callback);
};
