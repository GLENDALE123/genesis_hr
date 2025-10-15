/**
 * 생산일정 서비스
 * Firestore의 production-schedules 컬렉션 관리
 * 
 * 규칙 준수: shared/services/firebase/firestore.ts의 공통 함수만 사용
 * HS-Jig와 동일한 컬렉션 공유
 */

import {
  addDocument,
  deleteDocument,
  getDocumentsWithQuery,
  onCollectionSnapshot
} from '@/shared/services/firebase/firestore';
import { ProductionSchedule } from '@/features/production/types';
import { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { sendProductionScheduleNotification, sendBulkScheduleNotification } from './productionScheduleNotificationService';

const PRODUCTION_SCHEDULES_COLLECTION = 'production-schedules';

/**
 * 날짜 범위로 생산일정 조회 (실시간 구독)
 */
export const subscribeToSchedulesByDateRange = (
  startDate: string,
  endDate: string,
  onSuccess: (schedules: ProductionSchedule[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  try {
    // onCollectionSnapshot은 unsubscribe 함수를 반환
    const unsubscribe = onCollectionSnapshot(
      PRODUCTION_SCHEDULES_COLLECTION,
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          const schedules = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }) as ProductionSchedule)
            .filter(schedule => {
              // 클라이언트 사이드 날짜 필터링
              if (!startDate && !endDate) return true;
              if (startDate && schedule.planDate < startDate) return false;
              if (endDate && schedule.planDate > endDate) return false;
              return true;
            });
          
          onSuccess(schedules);
        } catch (err) {
          console.error('❌ [ProductionScheduleService] 데이터 파싱 실패:', err);
          onError(err as Error);
        }
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ [ProductionScheduleService] 구독 시작 실패:', error);
    onError(error as Error);
    return () => {}; // 빈 unsubscribe 함수 반환
  }
};

/**
 * 날짜 범위로 생산일정 조회 (일회성)
 */
export const getSchedulesByDateRange = async (
  startDate?: string,
  endDate?: string
): Promise<ProductionSchedule[]> => {
  try {
    const queries = [];
    
    if (startDate) {
      queries.push({ field: 'planDate', operator: '>=' as const, value: startDate });
    }
    if (endDate) {
      queries.push({ field: 'planDate', operator: '<=' as const, value: endDate });
    }
    
    const schedules = await getDocumentsWithQuery(
      PRODUCTION_SCHEDULES_COLLECTION,
      queries,
      'planDate',
      'asc'
    ) as ProductionSchedule[];
    
    return schedules;
  } catch (error) {
    console.error('❌ [ProductionScheduleService] 일정 조회 실패:', error);
    throw error;
  }
};

/**
 * 생산일정 일괄 등록
 */
export const createSchedules = async (
  schedules: Omit<ProductionSchedule, 'id' | 'createdAt' | 'updatedAt'>[],
  user?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  }
): Promise<string[]> => {
  try {
    const now = new Date().toISOString();
    const createdIds: string[] = [];
    
    // 각 일정에 타임스탬프 추가하여 등록
    for (const schedule of schedules) {
      const scheduleWithTimestamp = {
        ...schedule,
        createdAt: now,
        updatedAt: now
      };
      
      const docId = await addDocument(PRODUCTION_SCHEDULES_COLLECTION, scheduleWithTimestamp);
      createdIds.push(docId);
    }
    
    console.log(`✅ [ProductionScheduleService] ${createdIds.length}개 일정 등록 완료`);
    
    // 알림 전송 (사용자 정보가 제공된 경우에만)
    if (user) {
      try {
        await sendBulkScheduleNotification(schedules, user);
      } catch (error) {
        console.error('❌ 생산일정 알림 전송 실패:', error);
        // 알림 실패는 메인 로직에 영향 없음
      }
    }
    
    return createdIds;
  } catch (error) {
    console.error('❌ [ProductionScheduleService] 일정 등록 실패:', error);
    throw error;
  }
};

/**
 * 생산일정 개별 삭제
 */
export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  try {
    await deleteDocument(PRODUCTION_SCHEDULES_COLLECTION, scheduleId);
    console.log(`✅ [ProductionScheduleService] 일정 삭제 완료: ${scheduleId}`);
  } catch (error) {
    console.error('❌ [ProductionScheduleService] 일정 삭제 실패:', error);
    throw error;
  }
};

/**
 * 특정 날짜의 모든 생산일정 삭제
 */
export const deleteSchedulesByDate = async (
  date: string,
  user?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  }
): Promise<void> => {
  try {
    // 해당 날짜의 모든 일정 조회
    const schedules = await getDocumentsWithQuery(
      PRODUCTION_SCHEDULES_COLLECTION,
      [{ field: 'planDate', operator: '==', value: date }]
    ) as ProductionSchedule[];
    
    // 모든 일정 삭제
    const deletePromises = schedules.map(schedule => 
      deleteDocument(PRODUCTION_SCHEDULES_COLLECTION, schedule.id)
    );
    
    await Promise.all(deletePromises);
    console.log(`✅ [ProductionScheduleService] ${date} 날짜 전체 삭제 완료: ${schedules.length}개`);
    
    // 알림 전송 (사용자 정보가 제공된 경우에만)
    if (user && schedules.length > 0) {
      try {
        // 첫 번째 일정 정보를 사용하여 삭제 알림 전송
        const firstSchedule = schedules[0];
        await sendProductionScheduleNotification(
          'deleted',
          {
            planDate: firstSchedule.planDate,
            productionLine: firstSchedule.productionLine,
            productName: firstSchedule.productName,
            partName: firstSchedule.partName,
            planQuantity: firstSchedule.planQuantity
          },
          user
        );
      } catch (error) {
        console.error('❌ 생산일정 삭제 알림 전송 실패:', error);
        // 알림 실패는 메인 로직에 영향 없음
      }
    }
  } catch (error) {
    console.error('❌ [ProductionScheduleService] 날짜별 삭제 실패:', error);
    throw error;
  }
};

