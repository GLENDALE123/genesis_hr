'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { toast } from 'sonner';
import {
  Bell,
  User,
  MessageSquare,
  CalendarClock,
  AlertTriangle,
  ShieldAlert,
  Megaphone,
  CalendarDays,
  FileText,
  TestTube,
  Wrench
} from 'lucide-react';
import { InboxNotification } from '@/shared/hooks/useNotifications';
import { cn } from '@/shared/lib/utils';
import { PRODUCTION_STATUS_COLORS } from '@/features/production/constants';
const JIG_STATUS_COLORS: Record<string, string> = {
  '요청': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  '보류': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  '진행중': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  '입고중': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
  '반려': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  '완료': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
};
import { STATUS_COLORS as QUALITY_STATUS_COLORS } from '@/features/quality/constants';
import { SAMPLE_STATUS_COLORS } from '@/features/sample/constants/sampleConstants';
import { SampleStatus } from '@/features/sample/types';

interface NotificationPanelProps {
  notifications: InboxNotification[];
  unreadCount: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAllRead: () => Promise<void>;
  onNotificationClick: (notificationId: string) => Promise<void>;
  userId?: string;
  /**
   * 레이아웃 모드: 기본(popover) 또는 전체 화면 시트(sheet)
   */
  layout?: 'popover' | 'sheet';
  /**
   * 상단 헤더 영역 노출 여부
   */
  showHeader?: boolean;
}

/**
 * 알림 패널 컴포넌트
 * 
 * @description
 * - 읽지 않은 알림 목록을 표시합니다
 * - 각 알림 클릭 시 읽음 처리합니다
 * - 모든 알림을 한번에 읽음 처리할 수 있습니다
 */
export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  unreadCount,
  isOpen,
  onOpenChange,
  onMarkAllRead,
  onNotificationClick,
  userId,
  layout = 'popover',
  showHeader = true
}) => {
  const [isMarkingAllRead, setIsMarkingAllRead] = React.useState(false);
  const isSheetLayout = layout === 'sheet';

  // 샘플 상태 텍스트를 샘플 배지 클래스에 매핑
  const getSampleStatusBadgeClass = (statusText: string) => {
    switch (statusText) {
      case '대기중':
      case '접수':
        return SAMPLE_STATUS_COLORS[SampleStatus.Received];
      case '진행중':
        return SAMPLE_STATUS_COLORS[SampleStatus.InProgress];
      case '보류':
        return SAMPLE_STATUS_COLORS[SampleStatus.OnHold];
      case '완료':
        return SAMPLE_STATUS_COLORS[SampleStatus.Completed];
      case '반려':
        return SAMPLE_STATUS_COLORS[SampleStatus.Rejected];
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // 알림 타입별 아이콘 결정
  const getNotificationIcon = (title: string) => {
    if (title?.includes('댓글 : 생산관리부')) return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
    if (title?.includes('공지사항')) return <Megaphone className="h-3.5 w-3.5 text-blue-500" />;
    if (title?.includes('근무계획')) return <CalendarClock className="h-3.5 w-3.5 text-purple-500" />;
    if (title?.includes('생산일정')) return <CalendarDays className="h-3.5 w-3.5 text-green-500" />;
    if (title?.includes('생산일보')) return <FileText className="h-3.5 w-3.5 text-green-500" />;
    if (title?.includes('생산관리부') && !title?.includes('댓글 :')) return <CalendarClock className="h-3.5 w-3.5 text-blue-500" />;
    if (title?.includes('부족분')) return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
    if (title?.includes('품질이슈')) return <ShieldAlert className="h-3.5 w-3.5 text-red-500" />;
    if (title?.includes('샘플')) return <TestTube className="h-3.5 w-3.5 text-purple-500" />;
    if (title?.includes('지그')) return <Wrench className="h-3.5 w-3.5 text-indigo-500" />;
    return <Bell className="h-3.5 w-3.5 text-gray-500" />;
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || isMarkingAllRead) return;
    
    // 즉시 UI 업데이트 (낙관적 업데이트)
    toast.success('모든 알림을 읽음 처리했습니다.');
    
    // 백그라운드에서 읽음 처리 (서버는 3일 후 자동 삭제)
    setIsMarkingAllRead(true);
    try {
      await onMarkAllRead();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ 백그라운드 읽음 처리 실패:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    if (userId) {
      // 백그라운드에서 읽음 처리 (서버는 3일 후 자동 삭제)
      await onNotificationClick(notificationId);
      onOpenChange(false);
    }
  };

  return (
    <div className={cn("w-full p-0", isSheetLayout && "flex h-full flex-col")}>
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="text-sm font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              disabled={isMarkingAllRead}
              onClick={handleMarkAllRead}
            >
              {isMarkingAllRead ? '처리 중...' : '모두 읽음'}
            </Button>
          )}
        </div>
      )}
      <div className={cn(isSheetLayout ? "flex-1 overflow-y-auto" : "max-h-96 overflow-y-auto")}>
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            알림이 없습니다
          </div>
        ) : (
          notifications.map((notif) => {
            // 알림 타입 감지 (실제 표시되는 필드)
            const requestType = notif.metadata?.centerInfo;
            const title = notif.title as string;
            const isDailyReport = title === '생산일보';
            const isSampleRequest = title === '샘플 요청';
            const isAnnouncement = title?.includes('공지사항');
            const isWorkSchedule = title?.includes('근무계획');
            const notifType = String((notif as any).type || '');
            const isCommentNotification = (
              (title && (title.indexOf('댓글 :') !== -1 || title.indexOf('멘션 :') !== -1)) ||
              notifType.indexOf('comment') !== -1 ||
              notifType.indexOf('mention') !== -1
            );
            const isLogisticsType = requestType || 
              title?.includes('생산관리부') || 
              title?.includes('부족분') || 
              title?.includes('품질이슈') || 
              title?.includes('공지사항') || 
              title?.includes('근무계획') || 
              title?.includes('샘플') || 
              title?.includes('생산일정') || 
              title?.includes('생산일보');
            
            // 긴급건 여부 확인 (centerInfo가 부족분 신청이거나 품질이슈 관련, 생산관리부 요청사항)
            const isUrgent = requestType === '부족분 신청' || 
                           requestType === '품질이슈 등록' || 
                           requestType === '품질이슈 상태 변경' ||
                           requestType?.includes('생산관리부') ||
                           title?.includes('부족분') ||
                           title?.includes('품질이슈') ||
                           title?.includes('생산관리부');
            
            // 생산일정 여부 확인
            const isScheduleNotification = title?.includes('생산일정') || requestType?.includes('생산일정');
            
            const timestamp = (notif.createdAt as { toDate?: () => Date })?.toDate 
              ? (notif.createdAt as { toDate: () => Date }).toDate() 
              : new Date((notif.createdAt as string | number) || Date.now());
            
            const senderName = notif.metadata?.senderName || '시스템';
            const senderAvatar = notif.metadata?.senderAvatar;
            const supplier = notif.metadata?.supplier;
            const subtitle = (notif as InboxNotification).subtitle;
            
            // 읽음 상태에 따라 배경색 결정
            const notificationBgClass = notif.read 
              ? "bg-background hover:bg-muted" 
              : "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50";
            
            return (
              <Link
                key={notif.id}
                href={notif.link || '#'}
                className={cn(
                  "block px-5 py-4 border-b cursor-pointer transition-colors",
                  notificationBgClass
                )}
                onClick={async (e) => {
                  if (!notif.link) {
                    e.preventDefault();
                  }
                  await handleNotificationClick(notif.id);
                }}
              >
                {isLogisticsType ? (
                  /* 물류이동/생산요청 알림 */
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        {getNotificationIcon(title)}
                        {title}
                      </span>
                      {isCommentNotification ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold border bg-gray-100 text-gray-800 border-gray-300",
                          )}
                        >
                          <MessageSquare className="mr-1 h-3 w-3 text-gray-500" />
                          댓글
                        </Badge>
                      ) : (
                        requestType && (
                          isDailyReport ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-semibold border",
                                PRODUCTION_STATUS_COLORS[requestType as string] || "bg-gray-100 text-gray-800 border-gray-300"
                              )}
                            >
                              {requestType as string}
                            </Badge>
                          ) : (
                            isSampleRequest ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-semibold border",
                                  getSampleStatusBadgeClass(String(requestType))
                                )}
                              >
                                {requestType as string}
                              </Badge>
                            ) : title === '품질이슈' || title === '품질이슈 등록' || title === '품질이슈 상태 변경' ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-semibold border",
                                  QUALITY_STATUS_COLORS[String(requestType) as keyof typeof QUALITY_STATUS_COLORS] || "bg-gray-100 text-gray-800 border-gray-300"
                                )}
                              >
                                {requestType as string}
                              </Badge>
                            ) : (
                              // 지그 알림: title이 지그 관련이면 지그 상태 색상 사용
                              (title === '지그 요청 등록' || title === '지그 입고 처리') ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs font-semibold border",
                                    JIG_STATUS_COLORS[String(requestType)] || "bg-gray-100 text-gray-800 border-gray-300"
                                  )}
                                >
                                  {requestType as string}
                                </Badge>
                              ) : (
                            <span className={cn(
                              "text-xs font-semibold",
                              isUrgent ? "text-red-600 dark:text-red-400" : "text-primary"
                            )}>
                              {requestType as string}
                            </span>
                            ))
                          )
                        )
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        {senderName.toLowerCase() === '시스템' || isScheduleNotification || isDailyReport || isSampleRequest || isAnnouncement || isWorkSchedule ? (
                          <AvatarImage src="/tms-logo.png" alt="TMS" />
                        ) : (
                          <>
                            <AvatarImage src={(senderAvatar as string) || ''} alt={senderName as string} />
                            <AvatarFallback className="bg-muted text-xs">
                              {senderName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-1 w-full">
                          {senderName.toLowerCase() !== '시스템' && !isScheduleNotification && !isDailyReport && !isSampleRequest && !isAnnouncement && !isWorkSchedule && (
                            <>
                              <span className="text-sm font-semibold text-foreground whitespace-nowrap">{senderName as string}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                            </>
                          )}
                          <span className="text-sm font-medium text-foreground flex-1 min-w-0 pr-2">
                            {supplier && !isScheduleNotification && !isDailyReport && !isSampleRequest && !isAnnouncement && !isWorkSchedule && `${supplier} `}
                            {subtitle || ''}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {subtitle && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {subtitle as string}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                          {notif.body as string}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  /* 댓글/멘션 알림 */
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        {getNotificationIcon(title)}
                        {title}
                      </span>
                      {isCommentNotification && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold border bg-gray-100 text-gray-800 border-gray-300",
                          )}
                        >
                          <MessageSquare className="mr-1 h-3 w-3 text-gray-500" />
                          댓글
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                      {senderName.toLowerCase() === '시스템' ? (
                        <div className="h-full w-full rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white font-bold text-xs">TMS</span>
                        </div>
                      ) : (
                        <>
                          <AvatarImage src={(senderAvatar as string) || ''} alt={senderName as string} />
                          <AvatarFallback className="bg-muted text-xs">
                            {senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </>
                      )}
                      </Avatar>
                      <div className="flex-1 min-w-0 w-full">
                      {senderName.toLowerCase() !== '시스템' && (
                        <div className="flex items-center gap-2 mb-1 w-full">
                          {notif.type === 'mention' ? (
                            <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <User className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-foreground flex-1 min-w-0 pr-2">
                            {senderName as string}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <p className="text-sm font-medium text-foreground mb-1">
                        {notif.title as string}
                      </p>
                      {subtitle && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {subtitle as string}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notif.body as string}
                      </p>
                      {senderName.toLowerCase() === '시스템' && (
                        <span className="text-xs text-muted-foreground">
                          {timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      </div>
                    {/* 댓글/멘션 컨테이너 닫기 */}
                  </div>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

