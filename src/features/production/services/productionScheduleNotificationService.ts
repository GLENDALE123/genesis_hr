/**
 * 생산일정 알림 서비스
 * 생산일정 등록/변경 시 알림 발송
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';

/**
 * 생산일정 변경 알림 전송
 */
export const sendProductionScheduleNotification = async (
  action: 'created' | 'updated' | 'deleted',
  scheduleData: {
    planDate: string;
    productionLine: string;
    productName: string;
    partName: string;
    planQuantity?: number;
  },
  user: {
    uid: string;
    displayName: string;
    photoURL?: string;
  }
): Promise<void> => {
  try {
    // Admin/Manager 사용자 조회
    const usersRef = collection(db!, 'users');
    const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
    const usersSnapshot = await getDocs(q);
    
    const targetUsers = usersSnapshot.docs
      .filter(doc => doc.id !== user.uid)
      .map(doc => doc.id);
    
    if (targetUsers.length === 0) {
      console.log('알림 대상이 없습니다.');
      return;
    }
    
    // Functions URL
    const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
    
    // 액션에 따른 메시지 구성
    const actionMessages = {
      created: '생산일정을 등록했습니다.',
      updated: '생산일정을 변경했습니다.',
      deleted: '생산일정을 삭제했습니다.'
    };
    
    const payload = {
      targetUsers,
      type: 'production-schedule',
      title: '생산일정',
      body: `${user.displayName}님이 ${actionMessages[action]}`,
      requestId: `SCHEDULE-${action.toUpperCase()}-${Date.now()}`,
      subtitle: `${scheduleData.productName}/${scheduleData.partName} (${scheduleData.productionLine})`,
      senderName: user.displayName,
      senderUid: user.uid,
      senderAvatar: user.photoURL,
      priority: 'normal',
      metadata: {
        action,
        planDate: scheduleData.planDate,
        productionLine: scheduleData.productionLine,
        productName: scheduleData.productName,
        partName: scheduleData.partName,
        planQuantity: scheduleData.planQuantity
      }
    };
    
    const response = await fetch(`${functionsUrl}/createNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error('생산일정 알림 전송 실패:', response.status);
    } else {
      console.log('✅ 생산일정 알림 전송 완료:', targetUsers.length, '명');
    }
  } catch (error) {
    console.error('생산일정 알림 전송 중 오류:', error);
    // 알림 실패는 메인 로직에 영향 없음
  }
};

/**
 * 생산일정 일괄 등록 알림 전송
 */
export const sendBulkScheduleNotification = async (
  schedules: Array<{
    planDate: string;
    productionLine: string;
    productName: string;
    partName: string;
    planQuantity?: number;
  }>,
  user: {
    uid: string;
    displayName: string;
    photoURL?: string;
  }
): Promise<void> => {
  try {
    // Admin/Manager 사용자 조회
    const usersRef = collection(db!, 'users');
    const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
    const usersSnapshot = await getDocs(q);
    
    const targetUsers = usersSnapshot.docs
      .filter(doc => doc.id !== user.uid)
      .map(doc => doc.id);
    
    if (targetUsers.length === 0) {
      console.log('알림 대상이 없습니다.');
      return;
    }
    
    // Functions URL
    const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
    
    // 일괄 등록 메시지
    const uniqueDates = [...new Set(schedules.map(s => s.planDate))];
    const dateRange = uniqueDates.length === 1 
      ? uniqueDates[0] 
      : `${uniqueDates[0]} ~ ${uniqueDates[uniqueDates.length - 1]}`;
    
    const payload = {
      targetUsers,
      type: 'production-schedule',
      title: '생산일정',
      body: `${user.displayName}님이 ${schedules.length}건의 생산일정을 일괄 등록했습니다.`,
      requestId: `SCHEDULE-BULK-${Date.now()}`,
      subtitle: `${dateRange} (${schedules.length}건)`,
      senderName: user.displayName,
      senderUid: user.uid,
      senderAvatar: user.photoURL,
      priority: 'normal',
      metadata: {
        action: 'bulk_created',
        scheduleCount: schedules.length,
        dateRange,
        schedules: schedules.map(s => ({
          planDate: s.planDate,
          productionLine: s.productionLine,
          productName: s.productName,
          partName: s.partName
        }))
      }
    };
    
    const response = await fetch(`${functionsUrl}/createNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error('생산일정 일괄 알림 전송 실패:', response.status);
    } else {
      console.log('✅ 생산일정 일괄 알림 전송 완료:', targetUsers.length, '명');
    }
  } catch (error) {
    console.error('생산일정 일괄 알림 전송 중 오류:', error);
    // 알림 실패는 메인 로직에 영향 없음
  }
};
