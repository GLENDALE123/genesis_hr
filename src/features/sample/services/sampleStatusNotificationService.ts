/**
 * 샘플 요청 상태변경 알림 서비스
 * DailyReportNotificationService 패턴 참고
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/shared/services/firebase/config';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { SampleRequest, SampleStatus } from '@/features/sample/types';

interface RequestUser {
  uid: string;
  displayName: string;
  photoURL?: string;
}

interface UserProfile {
  displayName?: string;
  email?: string;
}

export class SampleStatusNotificationService {
  /**
   * 샘플 요청 상태변경 알림 전송
   */
  static async sendSampleStatusChangeNotification(
    oldStatus: SampleStatus | undefined,
    newStatus: SampleStatus,
    sampleRequest: SampleRequest,
    user: RequestUser,
    userProfile?: UserProfile | null
  ): Promise<void> {
    try {
      if (!functions) {
        console.error('Firebase Functions가 초기화되지 않았습니다.');
        return;
      }

      // 상태변경에 따른 알림 내용 생성
      const title = '샘플 요청 상태 변경';
      let body = '';

      if (oldStatus && oldStatus !== newStatus) {
        // 상태 변경
        body = `${getUserDisplayName(null, user)}님이 샘플 요청 상태를 "${oldStatus}"에서 "${newStatus}"로 변경했습니다.
제품: ${sampleRequest.productName}
고객사: ${sampleRequest.clientName}
요청일: ${sampleRequest.requestDate}
이전 상태: ${oldStatus}
현재 상태: ${newStatus}`;
      } else if (!oldStatus) {
        // 신규 등록
        body = `${getUserDisplayName(null, user)}님이 새로운 샘플 요청을 등록했습니다.
제품: ${sampleRequest.productName}
고객사: ${sampleRequest.clientName}
요청일: ${sampleRequest.requestDate}
상태: ${newStatus}`;
      } else {
        // 상태 변경 없음 (다른 필드 변경)
        body = `${getUserDisplayName(null, user)}님이 샘플 요청을 수정했습니다.
제품: ${sampleRequest.productName}
고객사: ${sampleRequest.clientName}
요청일: ${sampleRequest.requestDate}
상태: ${newStatus}`;
      }

      // Admin/Manager 사용자 조회
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/shared/services/firebase/config');
      
      if (!db) {
        console.error('Firebase가 초기화되지 않았습니다.');
        return;
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
      const usersSnapshot = await getDocs(q);
      
      const targetUsers = usersSnapshot.docs
        .filter(doc => doc.id !== user.uid)
        .map(doc => doc.id);
      
      if (targetUsers.length === 0) {
        console.log('알림 대상이 없습니다.');
        return;
      }

      const createNotification = httpsCallable(functions, 'createNotification');
      
      const payload = {
        targetUsers,
        type: 'sample-status',
        title,
        body,
        requestId: sampleRequest.id,
        subtitle: `${sampleRequest.productName}/${sampleRequest.clientName}`,
        senderName: getUserDisplayName(null, user),
        senderUid: user.uid,
        priority: 'normal',
        centerInfo: '샘플 요청 상태 변경'
      };

      await createNotification(payload);
      console.log('✅ 샘플 상태변경 알림 전송 완료:', targetUsers.length, '명');
    } catch (error) {
      console.error('❌ 샘플 상태변경 알림 전송 실패:', error);
      throw error;
    }
  }

  /**
   * 샘플 요청 일반 액션 알림 전송 (생성/수정/삭제)
   */
  static async sendSampleActionNotification(
    action: 'created' | 'updated' | 'deleted',
    sampleRequest: SampleRequest,
    user: RequestUser,
    userProfile?: UserProfile | null
  ): Promise<void> {
    try {
      if (!functions) {
        console.error('Firebase Functions가 초기화되지 않았습니다.');
        return;
      }

      let title = '';
      let body = '';

      switch (action) {
        case 'created':
          title = '새로운 샘플 요청';
          body = `${getUserDisplayName(null, user)}님이 새로운 샘플 요청을 등록했습니다.
제품: ${sampleRequest.productName}
고객사: ${sampleRequest.clientName}
요청일: ${sampleRequest.requestDate}
상태: ${sampleRequest.status}`;
          break;
        case 'updated':
          title = '샘플 요청 수정';
          body = `${getUserDisplayName(null, user)}님이 샘플 요청을 수정했습니다.
제품: ${sampleRequest.productName}
고객사: ${sampleRequest.clientName}
요청일: ${sampleRequest.requestDate}
상태: ${sampleRequest.status}`;
          break;
        case 'deleted':
          title = '샘플 요청 삭제';
          body = `${getUserDisplayName(null, user)}님이 샘플 요청을 삭제했습니다.
제품: ${sampleRequest.productName}
고객사: ${sampleRequest.clientName}`;
          break;
      }

      // Admin/Manager 사용자 조회
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/shared/services/firebase/config');
      
      if (!db) {
        console.error('Firebase가 초기화되지 않았습니다.');
        return;
      }

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
      const usersSnapshot = await getDocs(q);
      
      const targetUsers = usersSnapshot.docs
        .filter(doc => doc.id !== user.uid)
        .map(doc => doc.id);
      
      if (targetUsers.length === 0) {
        console.log('알림 대상이 없습니다.');
        return;
      }

      const createNotification = httpsCallable(functions, 'createNotification');
      
      const payload = {
        targetUsers,
        type: 'sample-status',
        title,
        body,
        requestId: sampleRequest.id,
        subtitle: `${sampleRequest.productName}/${sampleRequest.clientName}`,
        senderName: getUserDisplayName(null, user),
        senderUid: user.uid,
        priority: 'normal',
        centerInfo: '샘플 요청 상태 변경'
      };

      await createNotification(payload);
      console.log('✅ 샘플 액션 알림 전송 완료:', action, targetUsers.length, '명');
    } catch (error) {
      console.error('❌ 샘플 액션 알림 전송 실패:', error);
      throw error;
    }
  }

  /**
   * 테스트용 샘플 상태변경 알림 전송
   */
  static async sendTestSampleStatusNotification(
    oldStatus: SampleStatus | undefined,
    newStatus: SampleStatus,
    user: RequestUser
  ): Promise<void> {
    try {
      // 테스트용 더미 데이터
      const testSampleRequest: SampleRequest = {
        id: `TEST-SAMPLE-STATUS-${Date.now()}`,
        requestDate: new Date().toISOString().split('T')[0],
        requesterName: '테스트 요청자',
        contact: '010-1234-5678',
        clientName: '테스트 고객사',
        productName: '테스트제품',
        items: [
          {
            partName: '테스트부속',
            colorSpec: '테스트색상',
            quantity: 1,
            postProcessing: ['인쇄'],
            coatingMethod: '테스트코팅'
          }
        ],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: '테스트용 샘플 요청',
        status: newStatus,
        imageUrls: [],
        workImageUrls: [],
        workData: {
          undercoat: { conditions: '', remarks: '' },
          midcoat: { conditions: '', remarks: '' },
          topcoat: { conditions: '', remarks: '' },
        },
        requesterInfo: {
          uid: user.uid,
          displayName: getUserDisplayName(null, user)
        },
        history: [
          {
            status: newStatus,
            date: new Date().toISOString(),
            by: getUserDisplayName(null, user)
          }
        ],
        comments: [],
        createdAt: new Date().toISOString()
      };

      await this.sendSampleStatusChangeNotification(
        oldStatus,
        newStatus,
        testSampleRequest,
        user
      );
    } catch (error) {
      console.error('❌ 테스트 샘플 상태변경 알림 전송 실패:', error);
      throw error;
    }
  }
}
