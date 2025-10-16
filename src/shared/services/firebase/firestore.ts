import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  WhereFilterOp
} from 'firebase/firestore';
import { db } from './config';

// 컬렉션 참조 가져오기
export const getCollectionRef = (collectionName: string) => {
  console.log('📁 [Firebase Firestore] 컬렉션 참조 요청:', collectionName);
  
  if (!db) {
    console.error('❌ [Firebase Firestore] Firestore가 초기화되지 않음');
    throw new Error('Firestore is not initialized');
  }
  
  const collectionRef = collection(db, collectionName);
  console.log('✅ [Firebase Firestore] 컬렉션 참조 생성 완료:', collectionName);
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

// 새 문서 추가
export const addDocument = async (collectionName: string, data: DocumentData) => {
  try {
    const docRef = await addDoc(getCollectionRef(collectionName), data);
    return docRef.id;
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
