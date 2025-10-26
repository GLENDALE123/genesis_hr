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
  TestTube
} from 'lucide-react';
import { InboxNotification } from '@/shared/hooks/useNotifications';
import { cn } from '@/shared/lib/utils';

interface NotificationPanelProps {
  notifications: InboxNotification[];
  unreadCount: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAllRead: () => Promise<void>;
  onNotificationClick: (notificationId: string) => Promise<void>;
  userId?: string;
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
  userId
}) => {
  const [isMarkingAllRead, setIsMarkingAllRead] = React.useState(false);

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
    <div className="w-80 p-0">
      <div className="flex items-center justify-between px-3 py-2 border-b">
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
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            알림이 없습니다
          </div>
        ) : (
          notifications.map((notif) => {
            // 알림 타입 감지 (실제 표시되는 필드)
            const requestType = notif.metadata?.centerInfo;
            const title = notif.title as string;
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
                  "block px-3 py-3 border-b cursor-pointer transition-colors",
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
                      {requestType && (
                        <span className={cn(
                          "text-xs font-semibold",
                          isUrgent ? "text-red-600 dark:text-red-400" : "text-primary"
                        )}>
                          {requestType as string}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        {senderName.toLowerCase() === '시스템' || isScheduleNotification ? (
                          <div className="h-full w-full rounded-full bg-primary flex items-center justify-center">
                            <span className="text-white font-bold text-xs">TMS</span>
                          </div>
                        ) : (
                          <>
                            <AvatarImage src={senderAvatar as string} alt={senderName as string} />
                            <AvatarFallback className="bg-muted text-xs">
                              {senderName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {senderName.toLowerCase() !== '시스템' && !isScheduleNotification && (
                            <>
                              <span className="text-sm font-semibold text-foreground whitespace-nowrap">{senderName as string}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                            </>
                          )}
                          <span className="text-sm font-medium text-foreground truncate">
                            {supplier && !isScheduleNotification && `${supplier} `}
                            {subtitle || ''}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
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
                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      {senderName.toLowerCase() === '시스템' ? (
                        <div className="h-full w-full rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white font-bold text-xs">TMS</span>
                        </div>
                      ) : (
                        <>
                          <AvatarImage src={senderAvatar as string} alt={senderName as string} />
                          <AvatarFallback className="bg-muted text-xs">
                            {senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {senderName.toLowerCase() !== '시스템' && (
                        <div className="flex items-center gap-2 mb-1">
                          {notif.type === 'mention' ? (
                            <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <User className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-foreground whitespace-nowrap truncate">
                            {senderName as string}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
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

