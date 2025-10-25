import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { QualityInspection, GroupedInspectionData } from '../types';

const COLLECTION_NAME = 'quality-inspections';

/**
 * 품질검사 컬렉션 참조 가져오기
 */
export const getCollectionRef = () => {
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
    // undefined 값 제거 함수
    const removeUndefinedValues = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      if (Array.isArray(obj)) {
        return obj.map(removeUndefinedValues).filter(item => item !== null);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            const cleanedValue = removeUndefinedValues(value);
            if (cleanedValue !== null) {
              cleaned[key] = cleanedValue;
            }
          }
        }
        return cleaned;
      }
      return obj;
    };

    // reliabilityTestResult 기본값 설정
    const processedData = {
      ...inspectionData,
      reliabilityTestResult: inspectionData.reliabilityTestResult || { result: '양호', action: '', decisionMaker: '' },
      colorCheckResult: inspectionData.colorCheckResult || { result: '견본과 색상동일', action: '', decisionMaker: '' },
      createdAt: new Date().toISOString(),
    };

    // undefined 값 제거
    const cleanedData = removeUndefinedValues(processedData);

    console.log('💾 [QualityInspectionService] 저장할 데이터:', cleanedData);
    
    const docRef = await addDoc(getCollectionRef(), cleanedData);
    return docRef.id;
  } catch (error) {
    console.error('❌ [QualityInspectionService] 품질검사 생성 실패:', error);
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
    console.log('🔄 [QualityInspectionService] 업데이트 시작:', { docId, updateData });
    
    // undefined 값 제거 함수
    const removeUndefinedValues = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      if (Array.isArray(obj)) {
        return obj.map(removeUndefinedValues).filter(item => item !== null);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            const cleanedValue = removeUndefinedValues(value);
            if (cleanedValue !== null) {
              cleaned[key] = cleanedValue;
            }
          }
        }
        return cleaned;
      }
      return obj;
    };

    const docRef = getDocRef(docId);
    const finalUpdateData = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    // undefined 값 제거
    const cleanedData = removeUndefinedValues(finalUpdateData);
    
    console.log('💾 [QualityInspectionService] Firestore 업데이트 데이터:', cleanedData);
    
    await updateDoc(docRef, cleanedData);
    
    // Zustand 스토어에서도 즉시 업데이트 (실시간 반영)
    const { useQualityInspectionStore } = await import('../store/qualityInspectionStore');
    const store = useQualityInspectionStore.getState();
    
    // 현재 스토어의 inspections에서 해당 항목 찾아서 업데이트
    const currentInspections = store.inspections;
    const updatedInspections = currentInspections.map(inspection => {
      if (inspection.id === docId) {
        return {
          ...inspection,
          ...cleanedData,
          updatedAt: cleanedData.updatedAt || new Date().toISOString()
        };
      }
      return inspection;
    });
    
    // 스토어 업데이트
    store.setInspections(updatedInspections, '', '');
    
    console.log('✅ [QualityInspectionService] 업데이트 완료:', docId);
  } catch (error) {
    console.error('❌ [QualityInspectionService] 업데이트 실패:', error);
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
    
    // Zustand 스토어에서도 삭제 (실시간 반영)
    const { useQualityInspectionStore } = await import('../store/qualityInspectionStore');
    useQualityInspectionStore.getState().deleteInspection(docId);
    
    console.log('✅ 품질검사 삭제 완료:', docId);
  } catch (error) {
    console.error('❌ 품질검사 삭제 실패:', error);
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
 * 생산일보와 동일한 limit 패턴 사용 (기본 500개)
 */
export const subscribeToQualityInspections = (
  callback: (inspections: QualityInspection[]) => void,
  limitCount: number = 500,
  onError?: (error: Error) => void
) => {
  try {
    const q = query(
      getCollectionRef(),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        
        const inspections = snapshot.docs.map(doc => {
          const data = doc.data();
          
          
          return {
            id: doc.id,
            ...data,
            // inspectionDate가 없으면 createdAt에서 날짜 부분만 추출
            inspectionDate: data.inspectionDate || (data.createdAt ? data.createdAt.split('T')[0] : undefined),
            createdAt: data.createdAt || new Date().toISOString(),
          } as QualityInspection;
        });
        
        // 타입별 통계 로그
        const typeStats = inspections.reduce((acc, inspection) => {
          const type = inspection.inspectionType || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        
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

    // 검사 타입별 분류 (HS-Jig와 호환성 유지)
    switch (inspection.inspectionType) {
      case 'incoming':
        group.incoming.push(inspection);
        break;
      case 'inProcess': // HS-Jig 실제 타입 (카멜케이스)
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
 * 날짜 범위별 실시간 구독 (생산일보와 동일한 방식)
 * 
 * @param startDate - 시작 날짜 (YYYY-MM-DD)
 * @param endDate - 종료 날짜 (YYYY-MM-DD)
 * @param callback - 데이터 수신 콜백
 * @param onError - 에러 콜백
 * @param limitCount - 조회할 최대 문서 수 (기본값: 2000)
 */
/**
 * 날짜 범위별 품질검사 구독 (2단계 쿼리 방식)
 * 1단계: 날짜 범위 내 검사들의 orderNumber 추출
 * 2단계: 해당 orderNumber들을 가진 모든 검사들을 가져옴
 * 
 * @param startDate - 시작 날짜 (YYYY-MM-DD)
 * @param endDate - 종료 날짜 (YYYY-MM-DD)
 * @param callback - 데이터 수신 콜백
 * @param onError - 에러 콜백
 * @param limitCount - 조회할 최대 문서 수 (기본값: 2000)
 */
export const subscribeToQualityInspectionsByDateRange = (
  startDate: string,
  endDate: string,
  callback: (inspections: QualityInspection[]) => void,
  onError?: (error: Error) => void,
  limitCount: number = 2000
): (() => void) => {
  if (!db) {
    const error = new Error('Firebase not initialized');
    console.error('Firebase not initialized');
    if (onError) {
      onError(error);
    }
    callback([]);
    return () => {};
  }

  try {
    // 1단계: 날짜 범위 내의 검사들을 먼저 가져와서 orderNumber 추출
    const dateQuery = query(
      getCollectionRef(),
      where('inspectionDate', '>=', startDate),
      where('inspectionDate', '<=', endDate),
      orderBy('inspectionDate', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(
      dateQuery,
      (snapshot) => {
        try {
          const dateFilteredInspections = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              inspectionDate: data.inspectionDate || (data.createdAt ? data.createdAt.split('T')[0] : undefined),
              createdAt: data.createdAt || new Date().toISOString(),
            } as QualityInspection;
          });

          // 날짜 필터링된 검사들의 orderNumber 추출
          const orderNumbers = [...new Set(dateFilteredInspections.map(i => i.orderNumber))];

          if (orderNumbers.length === 0) {
            callback([]);
            return;
          }

          // 2단계: 해당 orderNumber들을 가진 모든 검사들을 가져옴 (비동기 처리)
          Promise.all(
            orderNumbers.map(orderNumber => 
              getDocs(query(
                getCollectionRef(),
                where('orderNumber', '==', orderNumber),
                orderBy('createdAt', 'desc')
              ))
            )
          ).then(groupSnapshots => {
            // 결과를 합치고 정렬
            const allInspections: QualityInspection[] = [];
            groupSnapshots.forEach(snapshot => {
              snapshot.docs.forEach(doc => {
                const data = doc.data();
                allInspections.push({
                  id: doc.id,
                  ...data,
                  inspectionDate: data.inspectionDate || (data.createdAt ? data.createdAt.split('T')[0] : undefined),
                  createdAt: data.createdAt || new Date().toISOString(),
                } as QualityInspection);
              });
            });

            // 중복 제거 및 정렬
            const uniqueInspections = allInspections.filter((inspection, index, self) => 
              index === self.findIndex(i => i.id === inspection.id)
            ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            callback(uniqueInspections);
          }).catch(error => {
            console.error('Error fetching group data:', error);
            onError?.(error as Error);
          });
        } catch (error) {
          console.error('Error processing date range query:', error);
          onError?.(error as Error);
        }
      },
      (error) => {
        console.error('Error subscribing to quality inspections by date range:', error);
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
 * 날짜 범위로 품질검사 필터링 (클라이언트 사이드 - 레거시)
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
    
    // 공정검사 전용 필드 검색 (HS-Jig 호환성)
    if (inspection.inspectionType === 'inProcess') {
      searchableFields.push(
        inspection.workLine || '',
        inspection.preInspectionHistory || '',
        inspection.inProcessInspectionHistory || ''
      );
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
  obj: unknown,
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

