import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { QualityInspection, GroupedInspectionData } from '../types';

const COLLECTION_NAME = 'quality-inspections';

/**
 * 품질검사 컬렉션 참조 가져오기
 */
const getCollectionRef = () => {
  if (!db) throw new Error('Firestore is not initialized');
  return collection(db, COLLECTION_NAME);
};

/**
 * 품질검사 문서 참조 가져오기
 */
const getDocRef = (docId: string) => {
  if (!db) throw new Error('Firestore is not initialized');
  return doc(db, COLLECTION_NAME, docId);
};

/**
 * 새 품질검사 생성
 */
export const createQualityInspection = async (
  inspectionData: Omit<QualityInspection, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const docRef = await addDoc(getCollectionRef(), {
      ...inspectionData,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

/**
 * 품질검사 업데이트
 */
export const updateQualityInspection = async (
  docId: string,
  updateData: Partial<QualityInspection>
): Promise<void> => {
  try {
    const docRef = getDocRef(docId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw error;
  }
};

/**
 * 품질검사 삭제
 */
export const deleteQualityInspection = async (docId: string): Promise<void> => {
  try {
    const docRef = getDocRef(docId);
    await deleteDoc(docRef);
  } catch (error) {
    throw error;
  }
};

/**
 * 품질검사 단일 조회
 */
export const getQualityInspection = async (docId: string): Promise<QualityInspection | null> => {
  try {
    const docRef = getDocRef(docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
      } as QualityInspection;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * 품질검사 목록 실시간 구독
 */
export const subscribeToQualityInspections = (
  callback: (inspections: QualityInspection[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const q = query(
      getCollectionRef(),
      orderBy('createdAt', 'desc'),
      limit(1000)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const inspections = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt || new Date().toISOString(),
          } as QualityInspection;
        });
        callback(inspections);
      },
      (error) => {
        console.error('Error subscribing to quality inspections:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    console.error('Error setting up subscription:', error);
    onError?.(error as Error);
    return () => {}; // 빈 unsubscribe 함수 반환
  }
};

/**
 * 발주번호별 품질검사 그룹화
 */
export const groupInspectionsByOrder = (
  inspections: QualityInspection[]
): GroupedInspectionData[] => {
  const groupedMap = new Map<string, GroupedInspectionData>();

  inspections.forEach(inspection => {
    const orderNumber = inspection.orderNumber;
    
    if (!groupedMap.has(orderNumber)) {
      groupedMap.set(orderNumber, {
        orderNumber,
        latestDate: inspection.createdAt,
        common: {
          sequentialId: inspection.sequentialId,
          orderNumber: inspection.orderNumber,
          supplier: inspection.supplier,
          productName: inspection.productName,
          partName: inspection.partName,
          orderQuantity: inspection.orderQuantity,
          specification: inspection.specification,
          postProcess: inspection.postProcess,
          injectionMaterial: inspection.injectionMaterial,
          injectionColor: inspection.injectionColor,
          workLine: inspection.workLine,
        },
        incoming: [],
        inProcess: [],
        outgoing: [],
      });
    }

    const group = groupedMap.get(orderNumber);
    if (!group) return;

    // 최신 날짜 업데이트
    if (new Date(inspection.createdAt) > new Date(group.latestDate)) {
      group.latestDate = inspection.createdAt;
    }

    // 검사 타입별 분류
    switch (inspection.inspectionType) {
      case 'incoming':
        group.incoming.push(inspection);
        break;
      case 'in-process':
        group.inProcess.push(inspection);
        break;
      case 'outgoing':
        group.outgoing.push(inspection);
        break;
    }
  });

  // Map을 배열로 변환하고 최신 날짜순으로 정렬
  return Array.from(groupedMap.values()).sort((a, b) => 
    new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
  );
};

/**
 * 날짜 범위로 품질검사 필터링
 */
export const filterInspectionsByDateRange = (
  inspections: QualityInspection[],
  startDate: string,
  endDate: string
): QualityInspection[] => {
  return inspections.filter(inspection => {
    const inspectionDate = inspection.inspectionDate || inspection.createdAt;
    const dateStr = inspectionDate.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });
};

/**
 * 검색어로 품질검사 필터링 (딥 서치)
 */
export const searchInspections = (
  inspections: QualityInspection[],
  searchTerm: string
): QualityInspection[] => {
  if (!searchTerm.trim()) return inspections;
  
  const lowerCaseTerm = searchTerm.toLowerCase();
  
  return inspections.filter(inspection => {
    // 기본 필드 검색
    const searchableFields = [
      inspection.orderNumber,
      inspection.supplier,
      inspection.productName,
      inspection.partName,
      inspection.result,
      inspection.specification,
      inspection.postProcess,
      inspection.injectionMaterial,
      inspection.injectionColor,
      inspection.workLine,
    ];
    
    // 검사자 정보 검색
    if (typeof inspection.inspector === 'string') {
      searchableFields.push(inspection.inspector);
    } else if (inspection.inspector) {
      searchableFields.push(inspection.inspector.displayName, inspection.inspector.email);
    }
    
    // 키워드 페어 검색
    if (inspection.keywordPairs) {
      inspection.keywordPairs.forEach(pair => {
        searchableFields.push(pair.process, pair.defect);
      });
    }
    
    return searchableFields.some(field => 
      field && field.toString().toLowerCase().includes(lowerCaseTerm)
    );
  });
};

/**
 * 그룹화된 데이터에서 딥 서치
 */
export const deepSearchGroupedData = (
  obj: any,
  term: string
): boolean => {
  if (obj === null || obj === undefined) return false;

  const lowerCaseTerm = term.toLowerCase();

  if (typeof obj === 'string') {
    return obj.toLowerCase().includes(lowerCaseTerm);
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj).toLowerCase().includes(lowerCaseTerm);
  }
  if (Array.isArray(obj)) {
    return obj.some(item => deepSearchGroupedData(item, lowerCaseTerm));
  }
  if (typeof obj === 'object') {
    return Object.values(obj).some(value => deepSearchGroupedData(value, lowerCaseTerm));
  }
  return false;
};

