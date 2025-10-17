import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';

const AUTOCOMPLETE_COLLECTION = 'autocomplete-data';
const AUTOCOMPLETE_DOC_ID = 'quality-inspections';

export interface AutocompleteData {
  suppliers: string[];
  productNames: string[];
  partNames: string[];
  injectionColors: string[];
  specifications: string[];
  injectionCompanies: string[];
  lastUpdated: string;
}

/**
 * autocomplete-data 문서 참조 가져오기
 */
const getAutocompleteDocRef = () => {
  if (!db) throw new Error('Firestore is not initialized');
  return doc(db, AUTOCOMPLETE_COLLECTION, AUTOCOMPLETE_DOC_ID);
};

/**
 * autocomplete 데이터 구독
 */
export const subscribeToAutocompleteData = (
  callback: (data: AutocompleteData | null) => void
) => {
  const docRef = getAutocompleteDocRef();
  
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as AutocompleteData);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Autocomplete 데이터 구독 실패:', error);
    callback(null);
  });
};

/**
 * autocomplete 데이터 초기화 (마이그레이션용)
 */
export const initializeAutocompleteData = async (data: AutocompleteData) => {
  try {
    const docRef = getAutocompleteDocRef();
    await setDoc(docRef, {
      ...data,
      lastUpdated: new Date().toISOString()
    });
    console.log('Autocomplete 데이터 초기화 완료');
  } catch (error) {
    console.error('Autocomplete 데이터 초기화 실패:', error);
    throw error;
  }
};

/**
 * 새 검사 저장 시 autocomplete 데이터 업데이트
 */
export const updateAutocompleteData = async (inspectionData: {
  supplier?: string;
  productName?: string;
  partName?: string;
  injectionColor?: string;
  specification?: string;
  injectionCompany?: string;
}) => {
  try {
    const docRef = getAutocompleteDocRef();
    const updates: any = {
      lastUpdated: serverTimestamp()
    };

    // 각 필드가 존재하고 빈 문자열이 아닌 경우에만 추가
    if (inspectionData.supplier?.trim()) {
      updates.suppliers = arrayUnion(inspectionData.supplier.trim());
    }
    if (inspectionData.productName?.trim()) {
      updates.productNames = arrayUnion(inspectionData.productName.trim());
    }
    if (inspectionData.partName?.trim()) {
      updates.partNames = arrayUnion(inspectionData.partName.trim());
    }
    if (inspectionData.injectionColor?.trim()) {
      updates.injectionColors = arrayUnion(inspectionData.injectionColor.trim());
    }
    if (inspectionData.specification?.trim()) {
      updates.specifications = arrayUnion(inspectionData.specification.trim());
    }
    if (inspectionData.injectionCompany?.trim()) {
      updates.injectionCompanies = arrayUnion(inspectionData.injectionCompany.trim());
    }

    // 업데이트할 필드가 있는 경우에만 업데이트 실행
    if (Object.keys(updates).length > 1) { // lastUpdated 제외하고 다른 필드가 있는 경우
      await updateDoc(docRef, updates);
      console.log('Autocomplete 데이터 업데이트 완료');
    }
  } catch (error) {
    console.error('Autocomplete 데이터 업데이트 실패:', error);
    // 실패해도 검사 저장은 계속 진행되도록 에러를 던지지 않음
  }
};

/**
 * 기존 검사 데이터에서 autocomplete 데이터 수집 (마이그레이션용)
 */
export const collectAutocompleteDataFromInspections = async () => {
  try {
    const { getDocs, collection, query, limit } = await import('firebase/firestore');
    
    if (!db) throw new Error('Firestore is not initialized');
    
    // 최근 1000개 검사 데이터 수집
    const inspectionsRef = collection(db, 'quality-inspections');
    const q = query(inspectionsRef, limit(1000));
    const snapshot = await getDocs(q);
    
    const autocompleteData = {
      suppliers: new Set<string>(),
      productNames: new Set<string>(),
      partNames: new Set<string>(),
      injectionColors: new Set<string>(),
      specifications: new Set<string>(),
      injectionCompanies: new Set<string>(),
      lastUpdated: new Date().toISOString()
    };
    
    // 데이터 추출
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.supplier?.trim()) autocompleteData.suppliers.add(data.supplier.trim());
      if (data.productName?.trim()) autocompleteData.productNames.add(data.productName.trim());
      if (data.partName?.trim()) autocompleteData.partNames.add(data.partName.trim());
      if (data.injectionColor?.trim()) autocompleteData.injectionColors.add(data.injectionColor.trim());
      if (data.specification?.trim()) autocompleteData.specifications.add(data.specification.trim());
      if (data.injectionCompany?.trim()) autocompleteData.injectionCompanies.add(data.injectionCompany.trim());
    });
    
    // Set을 배열로 변환하고 정렬
    const finalData: AutocompleteData = {
      suppliers: [...autocompleteData.suppliers].sort((a, b) => a.localeCompare(b, 'ko')),
      productNames: [...autocompleteData.productNames].sort((a, b) => a.localeCompare(b, 'ko')),
      partNames: [...autocompleteData.partNames].sort((a, b) => a.localeCompare(b, 'ko')),
      injectionColors: [...autocompleteData.injectionColors].sort((a, b) => a.localeCompare(b, 'ko')),
      specifications: [...autocompleteData.specifications].sort((a, b) => a.localeCompare(b, 'ko')),
      injectionCompanies: [...autocompleteData.injectionCompanies].sort((a, b) => a.localeCompare(b, 'ko')),
      lastUpdated: new Date().toISOString()
    };
    
    console.log('수집된 autocomplete 데이터:', finalData);
    return finalData;
  } catch (error) {
    console.error('Autocomplete 데이터 수집 실패:', error);
    throw error;
  }
};

/**
 * 마이그레이션 실행 (개발자 도구에서 실행용)
 */
export const runMigration = async () => {
  try {
    console.log('Autocomplete 데이터 마이그레이션 시작...');
    
    // 1. 기존 검사 데이터에서 autocomplete 데이터 수집
    const autocompleteData = await collectAutocompleteDataFromInspections();
    
    // 2. autocomplete-data 컬렉션에 저장
    await initializeAutocompleteData(autocompleteData);
    
    console.log('마이그레이션 완료!');
    return autocompleteData;
  } catch (error) {
    console.error('마이그레이션 실패:', error);
    throw error;
  }
};
