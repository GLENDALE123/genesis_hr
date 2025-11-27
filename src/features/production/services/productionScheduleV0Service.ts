/**
 * ProductionScheduleV0 서비스
 * Firestore의 production-schedules-v0 컬렉션 관리
 */

import {
  addDocument,
  getDocumentsWithQuery,
  updateDocument,
  deleteDocument,
  getCollectionRef,
} from '@/shared/services/firebase/firestore';
import { ProductionScheduleV0 } from '@/features/production/types';
import { query, orderBy, limit, onSnapshot, QuerySnapshot } from 'firebase/firestore';

const PRODUCTION_SCHEDULES_V0_COLLECTION = 'production-schedules-v0';

/**
 * 최신 동기화 데이터 가져오기
 * syncedAt 기준으로 최신 데이터 1개만 반환
 */
export const getLatestSync = async (): Promise<ProductionScheduleV0 | null> => {
  try {
    const results = await getDocumentsWithQuery(
      PRODUCTION_SCHEDULES_V0_COLLECTION,
      [], // queries
      'syncedAt', // orderByField
      'desc', // orderDirection
      1 // limitCount
    );

    if (results.length === 0) {
      return null;
    }

    return results[0] as ProductionScheduleV0;
  } catch (error) {
    console.error('❌ [ProductionScheduleV0Service] 최신 동기화 데이터 조회 실패:', error);
    throw error;
  }
};

/**
 * 동기화 데이터 생성
 */
export const createSync = async (
  data: Omit<ProductionScheduleV0, 'id'>
): Promise<string> => {
  try {
    // 기존 데이터가 있으면 먼저 삭제 (단일 문서만 유지)
    const existing = await getLatestSync();
    if (existing) {
      await deleteDocument(PRODUCTION_SCHEDULES_V0_COLLECTION, existing.id);
    }

    const docId = await addDocument(PRODUCTION_SCHEDULES_V0_COLLECTION, data);
    return docId;
  } catch (error) {
    console.error('❌ [ProductionScheduleV0Service] 동기화 데이터 생성 실패:', error);
    throw error;
  }
};

/**
 * 동기화 데이터 업데이트
 */
export const updateSync = async (
  data: ProductionScheduleV0
): Promise<void> => {
  try {
    const { id, ...updateData } = data;
    await updateDocument(PRODUCTION_SCHEDULES_V0_COLLECTION, id, updateData);
  } catch (error) {
    console.error('❌ [ProductionScheduleV0Service] 동기화 데이터 업데이트 실패:', error);
    throw error;
  }
};

/**
 * 실시간 구독 (최신 동기화 데이터)
 */
export const subscribeToLatestSync = (
  onSuccess: (data: ProductionScheduleV0 | null) => void,
  onError: (error: Error) => void
): (() => void) => {
  try {
    const q = query(
      getCollectionRef(PRODUCTION_SCHEDULES_V0_COLLECTION),
      orderBy('syncedAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        try {
          if (snapshot.empty) {
            onSuccess(null);
            return;
          }

          const doc = snapshot.docs[0];
          const data = {
            id: doc.id,
            ...(doc.data() as Omit<ProductionScheduleV0, 'id'>),
          } as ProductionScheduleV0;

          onSuccess(data);
        } catch (err) {
          console.error('❌ [ProductionScheduleV0Service] 데이터 파싱 실패:', err);
          onError(err as Error);
        }
      },
      (error) => {
        console.error('❌ [ProductionScheduleV0Service] 구독 실패:', error);
        onError(error as Error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ [ProductionScheduleV0Service] 구독 시작 실패:', error);
    onError(error as Error);
    return () => {}; // 빈 unsubscribe 함수 반환
  }
};

/**
 * 특정 날짜 범위의 행 필터링
 * 헤더에서 "계획일자" 컬럼의 인덱스를 찾아서 필터링
 */
export const filterRowsByDateRange = (
  data: ProductionScheduleV0,
  startDate: string,
  endDate: string
): ProductionScheduleV0['rows'] => {
  // 시작일과 종료일이 모두 비어있으면 모든 행 반환 (전체 필터)
  if (!startDate && !endDate) {
    return data.rows;
  }

  // 헤더에서 "계획일자" 컬럼 인덱스 찾기
  const planDateIndex = data.headers.findIndex(
    header => header === '계획일자' || header === 'planDate'
  );

  if (planDateIndex === -1) {
    // 계획일자 컬럼이 없으면 모든 행 반환
    return data.rows;
  }

  return data.rows.filter(row => {
    const planDate = String(row.data[planDateIndex] || '').trim();
    
    if (!planDate) {
      return false;
    }

    // 날짜 형식 변환 (YYYY-MM-DD 형식으로 변환 시도)
    let normalizedDate = planDate;
    if (planDate.includes('/')) {
      // MM/DD 형식인 경우 현재 연도 추가
      const [month, day] = planDate.split('/');
      const currentYear = new Date().getFullYear();
      normalizedDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else if (planDate.length === 8) {
      // YYYYMMDD 형식
      normalizedDate = `${planDate.slice(0, 4)}-${planDate.slice(4, 6)}-${planDate.slice(6, 8)}`;
    }

    // 시작일만 있는 경우: 시작일 이후
    if (startDate && !endDate) {
      return normalizedDate >= startDate;
    }
    
    // 종료일만 있는 경우: 종료일 이전
    if (!startDate && endDate) {
      return normalizedDate <= endDate;
    }

    // 시작일과 종료일이 모두 있는 경우: 범위 내
    return normalizedDate >= startDate && normalizedDate <= endDate;
  });
};

