'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'comment' | 'mention';
  onClick?: () => void;
}

interface CustomNotificationProps {
  notification: NotificationData;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const CustomNotification: React.FC<CustomNotificationProps> = ({
  notification,
  onClose,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // 애니메이션을 위한 지연
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsRemoving(true);
    setTimeout(() => onClose(notification.id), 300);
  };

  const handleClick = () => {
    if (notification.onClick) {
      notification.onClick();
    }
    handleClose();
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getTypeColor = () => {
    return notification.type === 'mention' 
      ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20' 
      : 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
  };

  const getTypeIcon = () => {
    return notification.type === 'mention' 
      ? <MessageSquare className="h-4 w-4 text-blue-600" />
      : <User className="h-4 w-4 text-green-600" />;
  };

  return (
    <div
      className={cn(
        'fixed z-50 w-80 max-w-sm transition-all duration-300 ease-in-out',
        getPositionClasses(),
        isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        isRemoving && 'translate-x-full opacity-0'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-border bg-background shadow-lg',
          'border-l-4',
          getTypeColor()
        )}
        onClick={handleClick}
      >
        {/* 닫기 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-background/80"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
        >
          <X className="h-3 w-3" />
        </Button>

        {/* 알림 내용 */}
        <div className="p-4 pr-8">
          <div className="flex items-start gap-3">
            {/* 발신자 아바타 */}
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage 
                src={notification.senderAvatar} 
                alt={notification.senderName}
              />
              <AvatarFallback className="bg-muted">
                {notification.senderName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* 알림 텍스트 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getTypeIcon()}
                <span className="text-sm font-semibold text-foreground truncate">
                  {notification.senderName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {notification.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <p className="text-sm font-medium text-foreground mb-1">
                {notification.title}
              </p>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {notification.body}
              </p>
            </div>
          </div>
        </div>

        {/* 진행 바 (자동 닫기) */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-5000 ease-linear"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

// 알림 관리자
export class NotificationManager {
  private static notifications: NotificationData[] = [];
  private static listeners: ((notifications: NotificationData[]) => void)[] = [];
  private static maxNotifications = 5;
  private static isAppInForeground = true;

  static subscribe(callback: (notifications: NotificationData[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // 앱 포그라운드/백그라운드 상태 감지
  static setAppState(isForeground: boolean) {
    this.isAppInForeground = isForeground;
  }

  static async notify(notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    const newNotification: NotificationData = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };

    console.log('📢 [NotificationManager] 알림 표시 요청:', {
      title: newNotification.title,
      body: newNotification.body,
      isAppInForeground: this.isAppInForeground
    });

    // Tauri 환경 체크
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;

      // Tauri 환경에서는 포그라운드일 때 Rust 함수 호출
      // undefined도 포그라운드로 처리 (HMR 대응)
      if (isTauri && this.isAppInForeground !== false) {
        console.log('🪟 [NotificationManager] Rust 알림 함수 호출');
        try {
          const { invoke } = await import('@tauri-apps/api/tauri');
          await invoke('show_notification', {
            title: newNotification.title,
            body: newNotification.body,
            senderName: newNotification.senderName,
            senderAvatar: newNotification.senderAvatar
          });
          return;
        } catch (error) {
          console.error('Rust 알림 함수 실패:', error);
          // 실패 시 기본 알림으로 폴백
        }
      }

    // 앱이 명시적으로 백그라운드일 때만 시스템 알림 사용
    if (this.isAppInForeground === false) {
      console.log('🔔 [NotificationManager] 백그라운드 알림 사용');
      await this.sendSystemNotification(newNotification);
      return;
    }

    // 웹 환경 또는 폴백: 포그라운드에서는 자체 알림 사용
    console.log('🔔 [NotificationManager] 포그라운드 자체 알림 사용');
    if (this.notifications.length >= this.maxNotifications) {
      this.notifications.shift();
    }

    this.notifications.push(newNotification);
    console.log('✅ [NotificationManager] 알림 추가됨. 현재 알림 수:', this.notifications.length);
    this.notifyListeners();

    // 5초 후 자동 제거
    setTimeout(() => {
      this.remove(newNotification.id);
    }, 5000);
  }

  // 시스템 알림 전송
  private static async sendSystemNotification(notification: NotificationData) {
    try {
      // Tauri 환경 - 자체 백그라운드 알림 사용
      if (typeof window !== 'undefined' && window.__TAURI__) {
        // 동적 import로 백그라운드 알림 함수 가져오기
        const { showBackgroundNotification } = await import('./BackgroundNotification');
        await showBackgroundNotification({
          title: notification.title,
          body: notification.body,
          senderName: notification.senderName,
          senderAvatar: notification.senderAvatar
        });
        return;
      }

      // 웹 브라우저 환경 - 시스템 알림 사용
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.body,
            icon: notification.senderAvatar || '/favicon.ico',
            tag: 'mention-notification',
            badge: '/favicon.ico',
            requireInteraction: false,
            silent: false
          });
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.body,
              icon: notification.senderAvatar || '/favicon.ico',
              tag: 'mention-notification',
              badge: '/favicon.ico'
            });
          }
        }
      }
    } catch (error) {
      console.error('시스템 알림 전송 실패:', error);
    }
  }

  static remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  static clear() {
    this.notifications = [];
    this.notifyListeners();
  }

  private static notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

// 알림 컨테이너 컴포넌트
export const NotificationContainer: React.FC<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}> = ({ position = 'top-right' }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    console.log('🎬 [NotificationContainer] 컨테이너 마운트됨. Position:', position);
    const unsubscribe = NotificationManager.subscribe((newNotifications) => {
      console.log('📥 [NotificationContainer] 알림 업데이트:', newNotifications.length, '개');
      setNotifications(newNotifications);
    });
    return () => {
      console.log('👋 [NotificationContainer] 컨테이너 언마운트됨');
      unsubscribe();
    };
  }, [position]);

  useEffect(() => {
    console.log('🔄 [NotificationContainer] 렌더링할 알림 수:', notifications.length);
  }, [notifications]);

  // bottom 포지션일 때는 음수 offset으로 위로 쌓이게 함
  const isBottomPosition = position.includes('bottom');

  return (
    <>
      {notifications.map((notification, index) => {
        console.log(`📍 [NotificationContainer] 알림 렌더링:`, {
          id: notification.id,
          index,
          position,
          isBottomPosition,
          offset: isBottomPosition ? -index * 100 : index * 100
        });
        return (
          <div
            key={notification.id}
            style={{
              transform: `translateY(${isBottomPosition ? -index * 100 : index * 100}px)`,
              zIndex: 50 - index
            }}
          >
            <CustomNotification
              notification={notification}
              onClose={NotificationManager.remove}
              position={position}
            />
          </div>
        );
      })}
    </>
  );
};

export default CustomNotification;
