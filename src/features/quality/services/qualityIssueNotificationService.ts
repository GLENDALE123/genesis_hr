import { db } from '@/shared/services/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/shared/services/firebase/config';
import { QualityIssue } from '../types';

// 공통 타입 정의
interface RequestUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
}

interface NotificationPayload {
  targetUsers: string[];
  type: string;
  title: string;
  body: string;
  requestId: string;
  subtitle: string;
  senderName: string;
  senderUid: string;
  senderAvatar?: string;
  priority?: 'low' | 'normal' | 'high';
  centerInfo?: string;
  metadata?: Record<string, unknown>;
}

// Firebase Functions URL 설정
const getFunctionsUrl = () => {
  return 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
};

/**
 * 품질이슈 알림 서비스
 * 품질이슈 관련 알림을 전담 관리
 */
export class QualityIssueNotificationService {
  /**
   * Firebase Functions를 통한 알림 발송 공통 함수
   */
  private static async sendNotificationViaFunctions(payload: NotificationPayload): Promise<void> {
    const functionsUrl = getFunctionsUrl();
    const response = await fetch(`${functionsUrl}/createNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `알림 전송 실패: ${response.status}`);
    }
  }

  /**
   * Firebase Functions를 통한 알림 발송 (httpsCallable 방식)
   */
  private static async sendNotificationViaCallable(payload: NotificationPayload): Promise<void> {
    if (!functions) {
      throw new Error('Firebase Functions not initialized');
    }

    const createNotification = httpsCallable(functions, 'createNotification');
    await createNotification(payload);
  }

  /**
   * Admin/Manager 사용자 목록 조회 (발신자 제외)
   */
  private static async getAdminManagerUsers(excludeUid?: string): Promise<string[]> {
    if (!db) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
    const usersSnapshot = await getDocs(q);

    const targetUsers = usersSnapshot.docs
      .filter(doc => !excludeUid || doc.id !== excludeUid)
      .map(doc => doc.id);

    return targetUsers;
  }

  /**
   * 이슈 작성자 목록 조회 (발신자 제외)
   */
  private static async getIssueAuthorUsers(excludeUid?: string): Promise<string[]> {
    if (!db) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    // 품질이슈에서 작성자 UID 수집
    const qualityIssuesRef = collection(db, 'qualityIssues');
    const issuesSnapshot = await getDocs(qualityIssuesRef);

    const authorUids = new Set<string>();
    issuesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.author && typeof data.author === 'object' && data.author.uid) {
        authorUids.add(data.author.uid);
      }
    });

    // 발신자 제외
    if (excludeUid) {
      authorUids.delete(excludeUid);
    }

    return Array.from(authorUids);
  }

  /**
   * Admin/Manager + 이슈 작성자 목록 조회 (발신자 제외)
   */
  private static async getTargetUsersForIssueItemAdded(excludeUid?: string): Promise<string[]> {
    try {
      const [adminManagerUsers, authorUsers] = await Promise.all([
        this.getAdminManagerUsers(excludeUid),
        this.getIssueAuthorUsers(excludeUid)
      ]);

      // 중복 제거하여 합치기
      const allTargetUsers = [...new Set([...adminManagerUsers, ...authorUsers])];
      return allTargetUsers;
    } catch (error) {
      console.error('대상 사용자 조회 중 오류:', error);
      // 오류 시 Admin/Manager만 대상으로 설정
      return this.getAdminManagerUsers(excludeUid);
    }
  }

  /**
   * 알림 전송 공통 메서드
   */
  private static async sendNotification(
    payload: Omit<NotificationPayload, 'targetUsers'>,
    excludeUid?: string,
    useCallable = false,
    targetUserType: 'admin-manager' | 'admin-manager-author' = 'admin-manager'
  ): Promise<void> {
    try {
      let targetUsers: string[];

      if (targetUserType === 'admin-manager-author') {
        targetUsers = await this.getTargetUsersForIssueItemAdded(excludeUid);
      } else {
        targetUsers = await this.getAdminManagerUsers(excludeUid);
      }

      if (targetUsers.length === 0) {
        console.log('알림 대상이 없습니다.');
        return;
      }

      const fullPayload: NotificationPayload = {
        ...payload,
        targetUsers
      };

      if (useCallable) {
        await this.sendNotificationViaCallable(fullPayload);
      } else {
        await this.sendNotificationViaFunctions(fullPayload);
      }

      console.log(`✅ 품질이슈 알림이 발송되었습니다. (${targetUsers.length}명)`);
    } catch (error) {
      console.error('품질이슈 알림 생성 중 오류 발생:', error);
      // 알림 실패해도 메인 로직은 계속 진행
    }
  }

  // ==================== 품질이슈 등록 알림 ====================

  /**
   * 품질이슈 등록 알림 생성
   */
  static async sendQualityIssueCreatedNotification(
    issue: QualityIssue,
    senderInfo: RequestUser
  ): Promise<void> {
    try {
      const productInfo = `${issue.productName}${issue.partName ? ' / ' + issue.partName : ''}`;
      const issueInfo = `${issue.orderNumber} - ${issue.supplier}`;
      
      const body = `${senderInfo.displayName}님이 새로운 품질이슈를 등록했습니다.

주문번호: ${issue.orderNumber}
제품: ${productInfo}
발주처: ${issue.supplier}
등록키워드: ${issue.registrationKeyword || '미입력'}
부서: ${issue.department || '미입력'}`;

      await this.sendNotification({
        type: 'quality-issue-created',
        title: '품질이슈 등록',
        body,
        requestId: issue.id,
        subtitle: issueInfo,
        centerInfo: '미해결',
        senderName: senderInfo.displayName,
        senderUid: senderInfo.uid,
        senderAvatar: senderInfo.photoURL,
        priority: 'normal',
        metadata: {
          issueId: issue.id,
          orderNumber: issue.orderNumber,
          productName: issue.productName,
          partName: issue.partName,
          supplier: issue.supplier,
          registrationKeyword: issue.registrationKeyword,
          department: issue.department
        }
      }, senderInfo.uid, false, 'admin-manager');

      console.log(`✅ [품질이슈 등록 알림] 전송 완료:`, {
        issueId: issue.id,
        orderNumber: issue.orderNumber,
        productInfo,
        senderName: senderInfo.displayName
      });
    } catch (error) {
      console.error(`❌ [품질이슈 등록 알림] 전송 실패:`, error);
      throw error;
    }
  }

  // ==================== 품질이슈사항 추가 알림 ====================

  /**
   * 품질이슈사항 추가 알림 생성 (상태 변경 포함)
   */
  static async sendQualityIssueItemAddedNotification(
    issueId: string,
    issueName: string,
    newStatus: string,
    senderInfo: RequestUser
  ): Promise<void> {
    try {
      const body = `${senderInfo.displayName}님이 품질이슈사항을 추가했습니다.

이슈: ${issueName}
새로운 상태: ${newStatus}
추가 시간: ${new Date().toLocaleString('ko-KR')}`;

      await this.sendNotification({
        type: 'quality-issue-item-added',
        title: '품질이슈사항 추가',
        body,
        requestId: issueId,
        subtitle: issueName,
        centerInfo: newStatus,
        senderName: senderInfo.displayName,
        senderUid: senderInfo.uid,
        senderAvatar: senderInfo.photoURL,
        priority: 'normal',
        metadata: {
          issueId,
          issueName,
          newStatus,
          addedAt: new Date().toISOString()
        }
      }, senderInfo.uid, false, 'admin-manager-author');

      console.log(`✅ [품질이슈사항 추가 알림] 전송 완료:`, {
        issueId,
        issueName,
        newStatus,
        senderName: senderInfo.displayName
      });
    } catch (error) {
      console.error(`❌ [품질이슈사항 추가 알림] 전송 실패:`, error);
      throw error;
    }
  }

  // ==================== 테스트 알림 ====================

  /**
   * 테스트용 품질이슈 등록 알림
   */
  static async sendTestQualityIssueCreatedNotification(
    senderInfo: RequestUser
  ): Promise<void> {
    const testIssue: QualityIssue = {
      id: `TEST-QUALITY-${Date.now()}`,
      orderNumber: 'TEST-ORDER-001',
      productName: '테스트제품',
      partName: '테스트부속',
      supplier: '테스트공급사',
      author: {
        uid: senderInfo.uid,
        displayName: senderInfo.displayName,
        email: senderInfo.email || ''
      },
      issues: ['테스트용 품질이슈입니다.'],
      createdAt: new Date().toISOString(),
      registrationKeyword: '견본요청',
      department: '품질관리팀',
      keywordPairs: [{
        process: '성형',
        defect: '불량'
      }],
      status: 'open',
      priority: 'normal',
      category: '품질이슈',
    };

    await this.sendQualityIssueCreatedNotification(testIssue, senderInfo);
  }

  /**
   * 테스트용 품질이슈사항 추가 알림
   */
  static async sendTestQualityIssueItemAddedNotification(
    senderInfo: RequestUser
  ): Promise<void> {
    const issueId = `TEST-QUALITY-ITEM-${Date.now()}`;
    const issueName = '테스트제품 / 테스트부속';
    const newStatus = '진행중';

    await this.sendQualityIssueItemAddedNotification(
      issueId,
      issueName,
      newStatus,
      senderInfo
    );
  }
}
