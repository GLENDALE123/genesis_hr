import { db } from '@/shared/services/firebase/config';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, writeBatch, orderBy, limit } from 'firebase/firestore';
import { WorkSchedule, WorkType } from '../types';
import { getMonthRange, getYearRange } from '../utils/scheduleUtils';
import { UnifiedNotificationService } from '@/shared/services/notificationService';
import { getLocalDateString } from '@/shared/utils/dateUtils';

export class WorkScheduleService {
  /**
   * 특정 월의 근무계획 조회
   */
  static async getSchedulesByMonth(year: number, month: number): Promise<Map<string, WorkSchedule>> {
    if (!db) {
      return new Map();
    }

    const { start, end } = getMonthRange(year, month);
    
    const q = query(
      collection(db, 'work-schedules'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    
    const snapshot = await getDocs(q);
    const schedules = new Map<string, WorkSchedule>();
    snapshot.forEach(doc => {
      schedules.set(doc.id, { id: doc.id, ...doc.data() } as WorkSchedule);
    });
    
    return schedules;
  }

  /**
   * 특정 년의 근무계획 조회
   */
  static async getSchedulesByYear(year: number): Promise<Map<string, WorkSchedule>> {
    if (!db) {
      return new Map();
    }

    const { start, end } = getYearRange(year);
    
    const q = query(
      collection(db, 'work-schedules'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    
    const snapshot = await getDocs(q);
    const schedules = new Map<string, WorkSchedule>();
    snapshot.forEach(doc => {
      schedules.set(doc.id, { id: doc.id, ...doc.data() } as WorkSchedule);
    });
    
    return schedules;
  }

  /**
   * 근무계획 적용 (여러 날짜 일괄)
   */
  static async applySchedule(
    type: WorkType,
    dates: Set<string>,
    description: string,
    author?: string,
    authorId?: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    const batch = writeBatch(db);
    
    dates.forEach(dateStr => {
      const docRef = doc(db!, 'work-schedules', dateStr);
      batch.set(docRef, {
        date: dateStr,
        type,
        description
      });
    });
    
    await batch.commit();

    // 근무계획 변경 알림 생성
    if (author && authorId) {
      try {
        const today = getLocalDateString(new Date());
        const futureDates = Array.from(dates).filter(date => date >= today);
        
        if (futureDates.length > 0) {
          await UnifiedNotificationService.notifyWorkScheduleChange(
            futureDates[0], // 첫 번째 날짜를 대표로 사용
            `WORK-SCHEDULE-${Date.now()}`,
            'created',
            `${type} 근무계획 (${futureDates.length}일)`
          );
        }
      } catch (notificationError) {
        console.warn('근무계획 알림 생성 실패:', notificationError);
      }
    }
  }

  /**
   * 근무계획 삭제 (여러 날짜 일괄)
   */
  static async deleteSchedule(dates: Set<string>): Promise<void> {
    if (!db) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    const batch = writeBatch(db);
    
    dates.forEach(dateStr => {
      const docRef = doc(db!, 'work-schedules', dateStr);
      batch.delete(docRef);
    });
    
    await batch.commit();
  }

  /**
   * 지난 날짜 근무계획 자동 삭제
   */
  static async deleteExpiredSchedules(): Promise<number> {
    if (!db) {
      return 0;
    }

    const today = getLocalDateString(new Date());
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const q = query(
        collection(db, 'work-schedules'),
        where('date', '<', today),
        orderBy('date'),
        limit(400)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = writeBatch(db);
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      totalDeleted += snapshot.size;

      if (snapshot.size < 400) {
        hasMore = false;
      }

      // 다음 배치 전 잠시 대기 (과부하 방지)
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return totalDeleted;
  }

  /**
   * 근무계획 변경 알림 생성
   */
  static async notifyWorkScheduleChange(
    dateStr: string,
    scheduleId: string,
    action: 'created' | 'updated' | 'deleted',
    description: string
  ): Promise<void> {
    await UnifiedNotificationService.notifyWorkScheduleChange(
      dateStr,
      scheduleId,
      action,
      description
    );
  }
}
