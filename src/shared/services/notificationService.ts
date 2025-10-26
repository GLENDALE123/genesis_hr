import { db } from '@/shared/services/firebase/config';
import { getUserDisplayName } from '@/shared/utils/userUtils';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/shared/services/firebase/config';
import { PackagingReport, ProductionStatus } from '@/features/production/types';
import { settingsService } from '@/shared/services/settings/settingsService';
import { NotificationChannelType } from '@/shared/types/settings';
import { formatDateRangeKorean } from '@/shared/utils/dateUtils';

// 공통 타입 정의
interface RequestUser {
  uid: string;
  displayName: string;
  photoURL?: string;
}

interface UserProfile {
  displayName?: string;
  email?: string;
}

// 알림 타입 열거형
export enum NotificationType {
  PRODUCTION_REQUEST = 'production-request',
  SHORTAGE_REQUEST = 'shortage-request',
  DAILY_REPORT = 'daily-report',
  PRODUCTION_SCHEDULE = 'production-schedule',
  ANNOUNCEMENT = 'announcement',
  WORK_SCHEDULE = 'work-schedule',
  QUALITY_ISSUE = 'quality-issue',
  QUALITY_ISSUE_STATUS = 'quality-issue-status',
  SAMPLE_REQUEST = 'sample-request',
  SAMPLE_STATUS = 'sample-status'
}

// 우선순위 열거형
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}

// 상태 메시지 타입
export interface StatusMessages {
  [key: string]: string;
}

interface NotificationPayload {
  targetUsers: string[];
  type: NotificationType;
  title: string;
  body: string;
  requestId: string;
  subtitle: string;
  senderName: string;
  senderUid: string;
  senderAvatar?: string;
  priority?: NotificationPriority;
  centerInfo?: string;
  metadata?: Record<string, unknown>;
}

// Firebase Functions URL 설정
const getFunctionsUrl = () => {
  return 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
};

// 상태 메시지 상수
const STATUS_MESSAGES: Record<string, StatusMessages> = {
  production: {
    'pending': '대기중',
    'approved': '승인됨',
    'rejected': '거부됨',
    'in-progress': '진행중',
    'completed': '완료됨',
    'cancelled': '취소됨'
  },
  quality: {
    'open': '열림',
    'in-progress': '진행중',
    'resolved': '해결됨',
    'closed': '종료됨'
  },
  sample: {
    'pending': '대기중',
    'approved': '승인됨',
    'rejected': '거부됨',
    'in-progress': '진행중',
    'completed': '완료됨',
    'cancelled': '취소됨'
  },
  workSchedule: {
    'created': '근무계획을 등록했습니다.',
    'updated': '근무계획을 변경했습니다.',
    'deleted': '근무계획을 삭제했습니다.'
  }
};

// 상태 메시지 헬퍼 함수
const getStatusMessage = (category: string, status: string): string => {
  return STATUS_MESSAGES[category]?.[status] || status;
};

/**
 * 통합 알림 서비스
 * 생산 피처의 모든 알림을 통합 관리
 */
export class UnifiedNotificationService {
  /**
   * Firebase Functions를 통한 알림 발송 공통 함수 (재시도 로직 포함)
   */
  private static async sendNotificationViaFunctions(
    payload: NotificationPayload, 
    retryCount = 3
  ): Promise<void> {
    const functionsUrl = getFunctionsUrl();
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
        
        const response = await fetch(`${functionsUrl}/createNotification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `알림 전송 실패: ${response.status}`);
        }
        
        return; // 성공시 즉시 반환
      } catch (error) {
        console.warn(`알림 전송 시도 ${attempt}/${retryCount} 실패:`, error);
        
        if (attempt === retryCount) {
          throw new Error(`알림 전송 실패 (${retryCount}회 시도 후): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // 지수 백오프: 1초, 2초, 4초 대기
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
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

  // 사용자 목록 캐싱
  private static userCache = new Map<string, { users: string[], timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5분

  /**
   * Admin/Manager 사용자 목록 조회 (캐싱 포함, 발신자 제외)
   */
  private static async getAdminManagerUsers(excludeUid?: string): Promise<string[]> {
    if (!db) {
      throw new Error('Firebase가 초기화되지 않았습니다.');
    }

    const cacheKey = excludeUid || 'all';
    const cached = this.userCache.get(cacheKey);
    const now = Date.now();

    // 캐시가 유효한 경우 캐시된 데이터 사용
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return excludeUid ? cached.users.filter(uid => uid !== excludeUid) : cached.users;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['Admin', 'Manager']));
      const usersSnapshot = await getDocs(q);

      const targetUsers = usersSnapshot.docs.map(doc => doc.id);

      // 캐시에 저장
      this.userCache.set(cacheKey, {
        users: targetUsers,
        timestamp: now
      });

      return excludeUid ? targetUsers.filter(uid => uid !== excludeUid) : targetUsers;
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
      // 캐시된 데이터가 있으면 사용
      if (cached) {
        console.warn('캐시된 사용자 목록을 사용합니다.');
        return excludeUid ? cached.users.filter(uid => uid !== excludeUid) : cached.users;
      }
      throw error;
    }
  }

  /**
   * 사용자 알림 설정 확인
   * @param userId - 사용자 ID
   * @param notificationType - 알림 타입
   * @returns 알림 허용 여부
   */
  private static async isUserNotificationAllowed(
    userId: string, 
    notificationType: NotificationChannelType
  ): Promise<boolean> {
    try {
      const settings = await settingsService.getSettings(userId);
      return settingsService.isNotificationAllowed(settings, notificationType);
    } catch (error) {
      console.error('❌ 사용자 알림 설정 확인 실패:', error);
      // 설정 확인 실패 시 기본적으로 허용
      return true;
    }
  }

  /**
   * 알림 전송 공통 메서드 (개선된 에러 처리)
   */
  private static async sendNotification(
    payload: Omit<NotificationPayload, 'targetUsers'>,
    excludeUid?: string,
    useCallable = false
  ): Promise<{ success: boolean; targetCount: number; error?: string }> {
    try {
      const targetUsers = await this.getAdminManagerUsers(excludeUid);

      if (targetUsers.length === 0) {
        console.log('알림 대상이 없습니다.');
        return { success: true, targetCount: 0 };
      }

      // 사용자별 알림 설정 확인 및 필터링
      const allowedUsers: string[] = [];
      for (const userId of targetUsers) {
        const isAllowed = await this.isUserNotificationAllowed(userId, payload.type as NotificationChannelType);
        if (isAllowed) {
          allowedUsers.push(userId);
        }
      }

      if (allowedUsers.length === 0) {
        console.log('알림 설정에 의해 모든 사용자가 차단되었습니다.');
        return { success: true, targetCount: 0 };
      }

      const fullPayload: NotificationPayload = {
        ...payload,
        type: NotificationType.PRODUCTION_REQUEST,
        priority: NotificationPriority.NORMAL,
        targetUsers: allowedUsers
      };

      if (useCallable) {
        await this.sendNotificationViaCallable(fullPayload);
      } else {
        await this.sendNotificationViaFunctions(fullPayload);
      }

      console.log(`✅ 알림이 발송되었습니다. (설정 확인 후 ${allowedUsers.length}명)`);
      return { success: true, targetCount: allowedUsers.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('알림 생성 중 오류 발생:', errorMessage);
      
      // 알림 실패해도 메인 로직은 계속 진행하되, 결과를 반환
      return { 
        success: false, 
        targetCount: 0, 
        error: errorMessage 
      };
    }
  }

  // ==================== 생산관리부 요청 알림 ====================

  /**
   * 물류이동 요청 알림 생성
   */
  static async sendLogisticsNotification(
    requestId: string,
    requestType: string,
    requester: string,
    content: string,
    requesterUid: string,
    requesterAvatar?: string
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.PRODUCTION_REQUEST,
      title: '생산관리부 요청사항',
      body: content,
      requestId,
      subtitle: content,
      centerInfo: '물류이동 요청',
      senderName: requester,
      senderUid: requesterUid,
      senderAvatar: requesterAvatar,
      priority: NotificationPriority.NORMAL
    }, requesterUid);
  }

  /**
   * 부족분 신청 알림 생성
   */
  static async sendShortageNotification(
    requestId: string,
    content: string,
    productName: string,
    requesterUid: string,
    requester: string,
    requesterAvatar?: string
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.SHORTAGE_REQUEST,
      title: '부족분 신청',
      body: content,
      requestId,
      subtitle: productName,
      centerInfo: '부족분 신청',
      senderName: requester,
      senderUid: requesterUid,
      senderAvatar: requesterAvatar,
      priority: NotificationPriority.NORMAL
    }, requesterUid);
  }

  /**
   * 일반 생산관리부 요청 알림 생성
   */
  static async sendProductionRequestNotification(
    requestId: string,
    requestType: string,
    requester: string,
    productName: string,
    partName: string,
    content: string,
    requesterUid: string,
    requesterAvatar?: string
  ): Promise<void> {
    await this.sendNotification({
      type: NotificationType.PRODUCTION_REQUEST,
      centerInfo: requestType,
      title: '생산관리부 요청사항',
      body: content,
      requestId,
      subtitle: `${productName} / ${partName}`,
      senderName: requester,
      senderUid: requesterUid,
      senderAvatar: requesterAvatar,
      priority: NotificationPriority.NORMAL
    }, requesterUid);
  }

  // ==================== 생산일보 알림 ====================

  /**
   * 생산일보 상태 변경 알림 전송
   */
  static async sendDailyReportStatusNotification(
    oldStatus: ProductionStatus | undefined,
    newStatus: ProductionStatus,
    report: PackagingReport,
    user: RequestUser,
    userProfile?: UserProfile | null
  ): Promise<void> {
    try {
      // 상태 변경이 없으면 알림 전송하지 않음
      if (oldStatus === newStatus) {
        return;
      }

      // 알림 내용 구성
      const productInfo = `${report.productName}${report.partName ? ' ' + report.partName : ''}`;
      const lineInfo = report.productionLine;
      const dateInfo = report.workDate;
      
      let title: string;
      let body: string;
      let subtitle: string;
      
      // 상태별 알림 내용
      switch (newStatus) {
        case ProductionStatus.Pending:
          title = '생산일보 상태 변경';
          body = `${getUserDisplayName(null, user)}님이 생산일보 상태를 "대기"로 변경했습니다.

제품: ${productInfo}
라인: ${lineInfo}
작업일: ${dateInfo}
이전 상태: ${oldStatus || '미설정'}
현재 상태: 대기`;
          subtitle = `${productInfo} / ${lineInfo}`;
          break;
          
        case ProductionStatus.InProgress:
          title = '생산일보 상태 변경';
          body = `${getUserDisplayName(null, user)}님이 생산일보 상태를 "작업중"으로 변경했습니다.

제품: ${productInfo}
라인: ${lineInfo}
작업일: ${dateInfo}
이전 상태: ${oldStatus || '미설정'}
현재 상태: 작업중`;
          subtitle = `${productInfo} / ${lineInfo}`;
          break;
          
        case ProductionStatus.Completed:
          title = '생산일보 상태 변경';
          body = `${getUserDisplayName(null, user)}님이 생산일보 상태를 "생산완료"로 변경했습니다.

제품: ${productInfo}
라인: ${lineInfo}
작업일: ${dateInfo}
이전 상태: ${oldStatus || '미설정'}
현재 상태: 생산완료`;
          subtitle = `${productInfo} / ${lineInfo}`;
          break;
          
        default:
          throw new Error(`Unknown status: ${newStatus}`);
      }

      await this.sendNotification({
        type: NotificationType.DAILY_REPORT,
        title,
        body,
        requestId: report.id,
        subtitle,
        senderName: getUserDisplayName(null, user),
        senderUid: user.uid,
        senderAvatar: user.photoURL,
        priority: NotificationPriority.NORMAL,
        centerInfo: '생산일보 상태 변경'
      }, user.uid, true); // httpsCallable 방식 사용

      console.log(`✅ [생산일보 상태 변경 알림] 전송 완료:`, {
        reportId: report.id,
        productInfo,
        lineInfo,
        dateInfo,
        oldStatus,
        newStatus
      });
    } catch (error) {
      console.error(`❌ [생산일보 상태 변경 알림] 전송 실패:`, error);
      throw error;
    }
  }

  /**
   * 생산일보 생성/수정/삭제 알림 전송
   */
  static async sendDailyReportActionNotification(
    action: 'created' | 'updated' | 'deleted',
    report: PackagingReport,
    user: RequestUser,
    userProfile?: UserProfile | null
  ): Promise<void> {
    try {
      // 알림 내용 구성
      let title: string;
      let body: string;
      let subtitle: string;
      
      const productInfo = `${report.productName}${report.partName ? ' ' + report.partName : ''}`;
      const lineInfo = report.productionLine;
      const dateInfo = report.workDate;
      
      switch (action) {
        case 'created':
          title = '생산일보 등록';
          body = `${getUserDisplayName(null, user)}님이 새로운 생산일보를 등록했습니다.

제품: ${productInfo}
라인: ${lineInfo}
작업일: ${dateInfo}
발주처: ${report.supplier || '미입력'}`;
          subtitle = `${productInfo} / ${lineInfo}`;
          break;
          
        case 'updated':
          title = '생산일보 수정';
          body = `${getUserDisplayName(null, user)}님이 생산일보를 수정했습니다.

제품: ${productInfo}
라인: ${lineInfo}
작업일: ${dateInfo}
발주처: ${report.supplier || '미입력'}`;
          subtitle = `${productInfo} / ${lineInfo}`;
          break;
          
        case 'deleted':
          title = '생산일보 삭제';
          body = `${getUserDisplayName(null, user)}님이 생산일보를 삭제했습니다.

제품: ${productInfo}
라인: ${lineInfo}
작업일: ${dateInfo}`;
          subtitle = `${productInfo} / ${lineInfo}`;
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      await this.sendNotification({
        type: NotificationType.DAILY_REPORT,
        title,
        body,
        requestId: `DAILY-REPORT-${action.toUpperCase()}-${Date.now()}`,
        subtitle,
        senderName: getUserDisplayName(null, user),
        senderUid: user.uid,
        senderAvatar: user.photoURL,
        priority: NotificationPriority.NORMAL,
        centerInfo: '생산일보 상태 변경'
      }, user.uid, true); // httpsCallable 방식 사용

      console.log(`✅ [생산일보 알림] ${action} 알림 전송 완료:`, {
        reportId: report.id,
        productInfo,
        lineInfo,
        dateInfo
      });
    } catch (error) {
      console.error(`❌ [생산일보 알림] ${action} 알림 전송 실패:`, error);
      throw error;
    }
  }

  // ==================== 생산일정 알림 ====================

  /**
   * 생산일정 변경 알림 전송
   */
  static async sendScheduleNotification(
    action: 'created' | 'updated' | 'deleted',
    scheduleData: {
      planDate: string;
      productionLine: string;
      productName: string;
      partName: string;
      planQuantity?: number;
    },
    user: RequestUser
  ): Promise<void> {
    try {
      // 액션에 따른 메시지 구성
      const actionMessages = {
        created: '생산일정을 등록했습니다.',
        updated: '생산일정을 변경했습니다.',
        deleted: '생산일정을 삭제했습니다.'
      };
      
      await this.sendNotification({
        type: NotificationType.PRODUCTION_SCHEDULE,
        title: '생산일정',
        body: `${getUserDisplayName(null, user)}님이 ${actionMessages[action]}`,
        requestId: `SCHEDULE-${action.toUpperCase()}-${Date.now()}`,
        subtitle: `${scheduleData.productName}/${scheduleData.partName} (${scheduleData.productionLine})`,
        senderName: getUserDisplayName(null, user),
        senderUid: user.uid,
        senderAvatar: user.photoURL,
        priority: NotificationPriority.NORMAL,
        metadata: {
          action,
          planDate: scheduleData.planDate,
          productionLine: scheduleData.productionLine,
          productName: scheduleData.productName,
          partName: scheduleData.partName,
          planQuantity: scheduleData.planQuantity
        }
      }, user.uid);

      console.log('✅ 생산일정 알림 전송 완료');
    } catch (error) {
      console.error('생산일정 알림 전송 중 오류:', error);
    }
  }

  /**
   * 생산일정 일괄 등록 알림 전송
   */
  static async sendBulkScheduleNotification(
    schedules: Array<{
      planDate: string;
      productionLine: string;
      productName: string;
      partName: string;
      planQuantity?: number;
    }>,
    user: RequestUser
  ): Promise<void> {
    try {
      // 일괄 등록 메시지
      const uniqueDates = [...new Set(schedules.map(s => s.planDate))];
      const dateRange = uniqueDates.length === 1 
        ? formatDateRangeKorean(uniqueDates[0], uniqueDates[0])
        : formatDateRangeKorean(uniqueDates[0], uniqueDates[uniqueDates.length - 1]);
      
      await this.sendNotification({
        type: NotificationType.PRODUCTION_SCHEDULE,
        title: '생산일정',
        body: `${getUserDisplayName(null, user)}님이 ${schedules.length}건의 생산일정을 일괄 등록했습니다.`,
        requestId: `SCHEDULE-BULK-${Date.now()}`,
        subtitle: `${dateRange} (${schedules.length}건)`,
        senderName: getUserDisplayName(null, user),
        senderUid: user.uid,
        senderAvatar: user.photoURL,
        priority: NotificationPriority.NORMAL,
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
      }, user.uid);

      console.log('✅ 생산일정 일괄 알림 전송 완료');
    } catch (error) {
      console.error('생산일정 일괄 알림 전송 중 오류:', error);
    }
  }

  // ==================== 공지사항 알림 ====================

  /**
   * 공지사항 등록 알림 생성
   */
  static async sendAnnouncementNotification(
    announcementTitle: string,
    author: string,
    authorId: string,
    announcementId?: string
  ): Promise<{ success: boolean; targetCount: number; error?: string }> {
    try {
      const result = await this.sendNotification({
        type: NotificationType.ANNOUNCEMENT,
        title: '새 공지사항이 등록되었습니다',
        body: `"${announcementTitle}" 공지사항이 등록되었습니다.`,
        requestId: announcementId || `ANNOUNCEMENT-${Date.now()}`,
        subtitle: announcementTitle,
        senderName: author,
        senderUid: authorId,
        priority: NotificationPriority.NORMAL,
        centerInfo: '공지사항 등록',
        metadata: {
          announcementTitle,
          announcementId
        }
      }, authorId);

      if (result.success) {
        console.log(`✅ 공지사항 등록 알림 전송 완료: ${announcementTitle}`);
      } else {
        console.warn(`⚠️ 공지사항 등록 알림 전송 실패: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('공지사항 등록 알림 전송 중 오류:', errorMessage);
      return { success: false, targetCount: 0, error: errorMessage };
    }
  }

  // ==================== 근무계획 알림 ====================

  /**
   * 근무계획 변경 알림 생성
   */
  static async notifyWorkScheduleChange(
    dateStr: string,
    scheduleId: string,
    action: 'created' | 'updated' | 'deleted',
    description: string
  ): Promise<{ success: boolean; targetCount: number; error?: string }> {
    try {
      const result = await this.sendNotification({
        type: NotificationType.WORK_SCHEDULE,
        title: '근무계획 변경',
        body: `${dateStr} ${description}`,
        requestId: scheduleId,
        subtitle: getStatusMessage('workSchedule', action),
        senderName: '시스템',
        senderUid: 'system',
        priority: NotificationPriority.NORMAL,
        centerInfo: '근무계획 변경',
        metadata: {
          action,
          dateStr,
          description
        }
      });

      if (result.success) {
        console.log(`✅ 근무계획 변경 알림 전송 완료: ${dateStr} - ${action}`);
      } else {
        console.warn(`⚠️ 근무계획 변경 알림 전송 실패: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('근무계획 변경 알림 전송 중 오류:', errorMessage);
      return { success: false, targetCount: 0, error: errorMessage };
    }
  }

  // ==================== 품질관리 알림 ====================

  /**
   * 품질이슈 등록 알림 생성
   */
  static async sendQualityIssueNotification(
    issueTitle: string,
    author: string,
    authorId: string,
    issueId?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        type: NotificationType.QUALITY_ISSUE,
        title: '새 품질이슈가 등록되었습니다',
        body: `"${issueTitle}" 품질이슈가 등록되었습니다.`,
        requestId: issueId || `QUALITY-ISSUE-${Date.now()}`,
        subtitle: issueTitle,
        senderName: author,
        senderUid: authorId,
        priority: NotificationPriority.HIGH,
        centerInfo: '품질이슈 등록',
        metadata: {
          issueTitle,
          issueId
        }
      }, authorId);

      console.log(`✅ 품질이슈 등록 알림 전송 완료: ${issueTitle}`);
    } catch (error) {
      console.error('품질이슈 등록 알림 전송 중 오류:', error);
    }
  }

  /**
   * 품질이슈 상태 변경 알림 생성
   */
  static async sendQualityIssueStatusChangeNotification(
    oldStatus: string | undefined,
    newStatus: string,
    issueTitle: string,
    author: string,
    authorId: string,
    issueId?: string
  ): Promise<{ success: boolean; targetCount: number; error?: string }> {
    try {
      const result = await this.sendNotification({
        type: NotificationType.QUALITY_ISSUE_STATUS,
        title: '품질이슈 상태 변경',
        body: `"${issueTitle}" 품질이슈 상태가 "${getStatusMessage('quality', oldStatus || '')}"에서 "${getStatusMessage('quality', newStatus)}"로 변경되었습니다.`,
        requestId: issueId || `QUALITY-STATUS-${Date.now()}`,
        subtitle: getStatusMessage('quality', newStatus),
        senderName: author,
        senderUid: authorId,
        priority: NotificationPriority.NORMAL,
        centerInfo: '품질이슈 상태 변경',
        metadata: {
          issueTitle,
          issueId,
          oldStatus,
          newStatus
        }
      }, authorId);

      if (result.success) {
        console.log(`✅ 품질이슈 상태 변경 알림 전송 완료: ${issueTitle} - ${newStatus}`);
      } else {
        console.warn(`⚠️ 품질이슈 상태 변경 알림 전송 실패: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('품질이슈 상태 변경 알림 전송 중 오류:', errorMessage);
      return { success: false, targetCount: 0, error: errorMessage };
    }
  }

  // ==================== 샘플 관리 알림 ====================

  /**
   * 샘플 요청 상태 변경 알림 생성
   */
  static async sendSampleStatusChangeNotification(
    oldStatus: string | undefined,
    newStatus: string,
    sampleTitle: string,
    author: string,
    authorId: string,
    sampleId?: string
  ): Promise<{ success: boolean; targetCount: number; error?: string }> {
    try {
      const result = await this.sendNotification({
        type: NotificationType.SAMPLE_STATUS,
        title: '샘플 요청 상태 변경',
        body: `"${sampleTitle}" 샘플 요청 상태가 "${getStatusMessage('sample', oldStatus || '')}"에서 "${getStatusMessage('sample', newStatus)}"로 변경되었습니다.`,
        requestId: sampleId || `SAMPLE-STATUS-${Date.now()}`,
        subtitle: getStatusMessage('sample', newStatus),
        senderName: author,
        senderUid: authorId,
        priority: NotificationPriority.NORMAL,
        centerInfo: '샘플 요청 상태 변경',
        metadata: {
          sampleTitle,
          sampleId,
          oldStatus,
          newStatus
        }
      }, authorId);

      if (result.success) {
        console.log(`✅ 샘플 상태 변경 알림 전송 완료: ${sampleTitle} - ${newStatus}`);
      } else {
        console.warn(`⚠️ 샘플 상태 변경 알림 전송 실패: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('샘플 상태 변경 알림 전송 중 오류:', errorMessage);
      return { success: false, targetCount: 0, error: errorMessage };
    }
  }

  /**
   * 샘플 요청 등록 알림 생성
   */
  static async sendSampleRequestNotification(
    sampleTitle: string,
    author: string,
    authorId: string,
    sampleId?: string
  ): Promise<void> {
    try {
      await this.sendNotification({
        type: NotificationType.SAMPLE_REQUEST,
        title: '새 샘플 요청이 등록되었습니다',
        body: `"${sampleTitle}" 샘플 요청이 등록되었습니다.`,
        requestId: sampleId || `SAMPLE-REQUEST-${Date.now()}`,
        subtitle: sampleTitle,
        senderName: author,
        senderUid: authorId,
        priority: NotificationPriority.NORMAL,
        centerInfo: '샘플 요청 등록',
        metadata: {
          sampleTitle,
          sampleId
        }
      }, authorId);

      console.log(`✅ 샘플 요청 등록 알림 전송 완료: ${sampleTitle}`);
    } catch (error) {
      console.error('샘플 요청 등록 알림 전송 중 오류:', error);
    }
  }

  // ==================== 테스트 알림 ====================

  /**
   * 물류이동 알림 테스트 (개발/테스트용)
   */
  static async sendTestLogisticsNotification(
    userName: string,
    userUid: string,
    userAvatar?: string
  ): Promise<void> {
    const testContent = `통합 물류 이동 요청 (3건):
---------------------
- 제품: 테스트제품A / 부속A
- 발주번호: PO-TEST-001
- 발주처: 테스트공급사
- 사양: 테스트사양
- 양품수량: 10,000 EA
- 포장단위: 100
- 박스수량: 100
- 잔량: 0
- 도착처: 군포공장
- 추가 요청: 긴급 배송 요청

---------------------
- 제품: 테스트제품B / 부속B
- 발주번호: PO-TEST-002
- 발주처: 테스트공급사2
- 사양: 테스트사양2
- 양품수량: 5,000 EA
- 포장단위: 50
- 박스수량: 100
- 잔량: 0
- 도착처: 화성공장
- 추가 요청: 오후 3시까지 도착 요망`;

    await this.sendNotification({
      type: NotificationType.PRODUCTION_REQUEST,
      title: '생산관리부 요청사항',
      body: testContent,
      requestId: 'P-TEST-001',
      subtitle: '테스트제품A 외 2건',
      centerInfo: '물류이동 요청',
      senderName: userName,
      senderUid: userUid,
      senderAvatar: userAvatar,
      priority: NotificationPriority.NORMAL
    }); // 테스트는 본인에게도 발송
  }

  /**
   * 부족분 신청 알림 테스트 (개발/테스트용)
   */
  static async sendTestShortageNotification(
    userName: string,
    userUid: string,
    userAvatar?: string
  ): Promise<void> {
    const testContent = `1,000EA, 사유: 테스트용 부족분 신청입니다.`;

    await this.sendNotification({
      type: NotificationType.SHORTAGE_REQUEST,
      title: '부족분 신청',
      body: testContent,
      requestId: 'TEST-SHORTAGE-001',
      subtitle: '테스트크림 / 외용기',
      centerInfo: '부족분 신청',
      senderName: userName,
      senderUid: userUid,
      senderAvatar: userAvatar,
      priority: NotificationPriority.NORMAL
    }); // 테스트는 본인에게도 발송
  }

  /**
   * 일반 생산관리부 요청 알림 테스트 (개발/테스트용)
   */
  static async sendTestProductionRequestNotification(
    userName: string,
    userUid: string,
    userAvatar: string | undefined,
    requestType: string
  ): Promise<void> {
    // 요청유형별 테스트 데이터
    const testData: Record<string, { productName: string; partName: string; content: string }> = {
      '긴급건': {
        productName: '테스트크림',
        partName: '외용기',
        content: `긴급 생산 요청사항입니다.\n\n제품: 테스트크림 / 외용기\n발주번호: PO-URGENT-001\n발주처: 긴급테스트공급사\n수량: 5,000 EA\n\n긴급 처리 요청드립니다.`
      },
      '영업부 긴급요청': {
        productName: '프리미엄로션',
        partName: '펌프',
        content: `영업부 긴급 요청사항입니다.\n\n제품: 프리미엄로션 / 펌프\n발주번호: PO-SALES-001\n발주처: 영업테스트공급사\n수량: 3,000 EA\n\n고객 납기 요청으로 긴급 처리 필요합니다.`
      }
    };

    const data = testData[requestType] || testData['긴급건'];

    await this.sendNotification({
      type: NotificationType.PRODUCTION_REQUEST,
      title: '생산관리부 요청사항',
      body: data.content,
      requestId: 'P-TEST-001',
      subtitle: `${data.productName} / ${data.partName}`,
      centerInfo: requestType,
      senderName: userName,
      senderUid: userUid,
      senderAvatar: userAvatar,
      priority: NotificationPriority.NORMAL
    }); // 테스트는 본인에게도 발송
  }

  /**
   * 테스트용 생산일보 상태 변경 알림
   */
  static async sendTestDailyReportStatusNotification(
    oldStatus: ProductionStatus | undefined,
    newStatus: ProductionStatus,
    user: RequestUser
  ): Promise<void> {
    // 테스트용 더미 데이터
    const testReport: PackagingReport = {
      id: `TEST-REPORT-${Date.now()}`,
      createdAt: new Date().toISOString(),
      workDate: new Date().toISOString().split('T')[0],
      author: {
        uid: user.uid,
        displayName: getUserDisplayName(null, user)
      },
      productionLine: '증착1',
      orderNumbers: ['PO-TEST-001'],
      supplier: '테스트공급사',
      productName: '테스트제품',
      partName: '테스트부속',
      specification: '테스트사양',
      lineRatio: '1:1',
      startTime: '09:00',
      endTime: '18:00',
      packagedBoxes: [],
      status: newStatus
    };

    await this.sendDailyReportStatusNotification(oldStatus, newStatus, testReport, user);
  }

  /**
   * 테스트용 샘플 상태 변경 알림
   */
  static async sendTestSampleStatusNotification(
    oldStatus: string,
    newStatus: string,
    user: RequestUser
  ): Promise<void> {
    // 테스트용 더미 데이터
    const testSample = {
      id: `TEST-SAMPLE-${Date.now()}`,
      productName: '테스트제품',
      clientName: '테스트고객사',
      requestDate: new Date().toISOString().split('T')[0]
    };

    await this.sendSampleStatusChangeNotification(
      oldStatus,
      newStatus,
      testSample.productName,
      getUserDisplayName(null, user),
      user.uid,
      testSample.id
    );
  }

  /**
   * 테스트용 품질이슈 알림
   */
  static async sendTestQualityIssueNotification(
    user: RequestUser
  ): Promise<void> {
    const testIssue = {
      id: `TEST-QUALITY-${Date.now()}`,
      title: '테스트 품질이슈',
      description: '테스트용 품질이슈입니다.'
    };

    await this.sendQualityIssueNotification(
      testIssue.title,
      getUserDisplayName(null, user),
      user.uid,
      testIssue.id
    );
  }

  /**
   * 테스트용 품질이슈 상태 변경 알림
   */
  static async sendTestQualityIssueStatusNotification(
    oldStatus: string,
    newStatus: string,
    user: RequestUser
  ): Promise<void> {
    const testIssue = {
      id: `TEST-QUALITY-STATUS-${Date.now()}`,
      title: '테스트 품질이슈 상태변경',
      description: '테스트용 품질이슈 상태변경입니다.'
    };

    await this.sendQualityIssueStatusChangeNotification(
      oldStatus,
      newStatus,
      testIssue.title,
      getUserDisplayName(null, user),
      user.uid,
      testIssue.id
    );
  }

  // ==================== 캐시 관리 유틸리티 ====================

  /**
   * 사용자 캐시 무효화
   */
  static clearUserCache(): void {
    this.userCache.clear();
    console.log('사용자 캐시가 무효화되었습니다.');
  }

  /**
   * 캐시 상태 확인
   */
  static getCacheStatus(): { size: number; entries: string[] } {
    return {
      size: this.userCache.size,
      entries: Array.from(this.userCache.keys())
    };
  }
}

// ==================== 기존 함수들과의 호환성을 위한 별칭 ====================

// 기존 notificationService.ts 함수들과의 호환성
export const createLogisticsNotification = UnifiedNotificationService.sendLogisticsNotification;
export const createShortageNotification = UnifiedNotificationService.sendShortageNotification;
export const createProductionRequestNotification = UnifiedNotificationService.sendProductionRequestNotification;
export const createTestLogisticsNotification = UnifiedNotificationService.sendTestLogisticsNotification;
export const createTestShortageNotification = UnifiedNotificationService.sendTestShortageNotification;
export const createTestProductionRequestNotification = UnifiedNotificationService.sendTestProductionRequestNotification;

// 기존 dailyReportNotificationService.ts와의 호환성
export const DailyReportNotificationService = {
  sendDailyReportStatusChangeNotification: UnifiedNotificationService.sendDailyReportStatusNotification,
  sendDailyReportActionNotification: UnifiedNotificationService.sendDailyReportActionNotification,
  sendTestDailyReportNotification: UnifiedNotificationService.sendDailyReportActionNotification,
  sendTestDailyReportStatusNotification: UnifiedNotificationService.sendTestDailyReportStatusNotification
};

// 기존 productionScheduleNotificationService.ts와의 호환성
export const sendProductionScheduleNotification = UnifiedNotificationService.sendScheduleNotification;
export const sendBulkScheduleNotification = UnifiedNotificationService.sendBulkScheduleNotification;

// 기존 qualityIssueNotificationService.ts와의 호환성
export const QualityIssueNotificationService = {
  sendQualityIssueNotification: UnifiedNotificationService.sendQualityIssueNotification,
  sendQualityIssueStatusChangeNotification: UnifiedNotificationService.sendQualityIssueStatusChangeNotification,
  sendTestQualityIssueNotification: UnifiedNotificationService.sendTestQualityIssueNotification,
  sendTestQualityIssueStatusNotification: UnifiedNotificationService.sendTestQualityIssueStatusNotification,
};

// 기존 sampleStatusNotificationService.ts와의 호환성
export const SampleStatusNotificationService = {
  sendSampleStatusChangeNotification: UnifiedNotificationService.sendSampleStatusChangeNotification,
  sendSampleRequestNotification: UnifiedNotificationService.sendSampleRequestNotification,
  sendTestSampleStatusNotification: UnifiedNotificationService.sendTestSampleStatusNotification,
};
