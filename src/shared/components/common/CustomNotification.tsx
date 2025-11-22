
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { CommentNotification, LogisticsNotification } from './notifications';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'comment' | 'mention' | 'info' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  // 물류이동 알림용 메타데이터
  metadata?: {
    requestType?: string;
    productName?: string;
    supplier?: string;
  };
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
    // 물류이동 알림
    if (notification.metadata?.requestType) {
      return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
    }
    // 댓글/멘션 알림
    return notification.type === 'mention' 
      ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20' 
      : 'border-l-green-500 bg-green-50 dark:bg-green-950/20';
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

        {/* 알림 내용 - 타입별 컴포넌트 분기 */}
        <div className="p-4 pr-8">
          {notification.metadata?.requestType ? (
            /* 물류이동/생산요청 알림 */
            <LogisticsNotification
              title={notification.title}
              requestType={notification.metadata.requestType}
              requester={notification.senderName}
              requesterAvatar={notification.senderAvatar}
              productName={notification.metadata.productName || ''}
              supplier={notification.metadata.supplier}
              content={notification.body}
              timestamp={notification.timestamp}
            />
          ) : (
            /* 댓글/멘션 알림 */
            <CommentNotification
              senderName={notification.senderName}
              senderAvatar={notification.senderAvatar}
              title={notification.title}
              body={notification.body}
              timestamp={notification.timestamp}
              type={notification.type as 'comment' | 'mention' | 'info'}
            />
          )}
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

  // 설정에서 알림 소리 설정 가져오기
  static getSoundSettings(): boolean {
    try {
      // global-store에서 설정 가져오기
      const globalStore = localStorage.getItem('global-store');
      if (globalStore) {
        const parsed = JSON.parse(globalStore);
        // state.preferences.soundEnabled 경로로 확인
        return parsed?.state?.preferences?.soundEnabled !== false;
      }
      // 기본값: 소리 켜짐
      return true;
    } catch (error) {
      console.error('❌ [NotificationManager] 설정 읽기 실패:', error);
      // 에러 시 기본값: 소리 켜짐
      return true;
    }
  }

  static async notify(notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    const newNotification: NotificationData = {
      ...notification,
      id: `notification-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date()
    };

    // Electron 환경 체크
    const isElectron = typeof window !== 'undefined' && window.__ELECTRON__;

    // Electron 환경에서는 네이티브 알림 사용
    if (isElectron && window.electron) {
      try {
        // 알림 타이틀에 아이콘 추가
        let iconPrefix = '';
        if (newNotification.title.includes('생산관리부 요청사항')) {
          iconPrefix = '📅 ';
        } else if (newNotification.title.includes('부족분 신청')) {
          iconPrefix = '⚠️ ';
        }
        
        // 설정에서 알림 소리 설정 가져오기
        const soundEnabled = this.getSoundSettings();
        
        await window.electron.showNotification({
          title: iconPrefix + newNotification.title,
          body: newNotification.body,
          icon: newNotification.senderAvatar,
          soundEnabled: soundEnabled  // ✅ 소리 설정 전달
        });
        return;
      } catch (error) {
        console.error('❌ [NotificationManager] Electron 알림 실패:', error);
        // 실패 시 기본 알림으로 폴백
      }
    }

    // 포그라운드: 자체 알림(toast) 사용
    if (this.notifications.length >= this.maxNotifications) {
      this.notifications.shift();
    }

    this.notifications.push(newNotification);
    this.notifyListeners();

    // 5초 후 자동 제거
    setTimeout(() => {
      this.remove(newNotification.id);
    }, 5000);

    // 백그라운드: 시스템 알림 추가로 표시
    if (this.isAppInForeground === false) {
      await this.sendSystemNotification(newNotification);
    }
  }

  // 시스템 알림 전송
  private static async sendSystemNotification(notification: NotificationData) {
    try {
      // 알림 타이틀에 아이콘 추가
      let iconPrefix = '';
      if (notification.title.includes('생산관리부 요청사항')) {
        iconPrefix = '📅 ';
      } else if (notification.title.includes('부족분 신청')) {
        iconPrefix = '⚠️ ';
      }
      
      const titleWithIcon = iconPrefix + notification.title;
      
      // Electron 환경 - 네이티브 알림 사용
      if (typeof window !== 'undefined' && window.__ELECTRON__ && window.electron) {
        // 설정에서 알림 소리 설정 가져오기
        const soundEnabled = this.getSoundSettings();
        
        await window.electron.showNotification({
          title: titleWithIcon,
          body: notification.body,
          icon: notification.senderAvatar,
          soundEnabled: soundEnabled  // ✅ 소리 설정 전달
        });
        return;
      }

      // 웹 브라우저 환경 - 시스템 알림 사용 (보안 컨텍스트에서만)
      if ('Notification' in window) {
        const isSecure = (window as any).isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isSecure) {
          // 비보안 컨텍스트에서는 브라우저 알림을 시도하지 않음 (toast만 표시되게)
          return;
        }
        if (Notification.permission === 'granted') {
          new Notification(titleWithIcon, {
            body: notification.body,
            icon: notification.senderAvatar || '/tms-logo.png',
            tag: 'mention-notification',
            badge: '/tms-logo.png',
            requireInteraction: false,
            silent: false
          });
        } else {
          // 자동 권한 요청 금지: 사용자 트리거에서만 요청하도록 함
          return;
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

  // 알림 읽음 처리 (Firebase Functions 호출)
  static async markAsRead(userId: string, notificationId: string) {
    try {
      // Firebase Functions URL 설정
      const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
      
      // Functions 호출 - 읽음 처리만 (서버가 3일 후 자동 삭제)
      const response = await fetch(`${functionsUrl}/markNotificationRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, inboxId: notificationId })
      });
      
      if (!response.ok) {
        throw new Error(`읽음 처리 실패: ${response.status}`);
      }
      
      // 모바일 앱에 배지 카운트 업데이트 알림 (React Native WebView)
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        try {
          (window as any).ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'notification-badge-update',
              action: 'mark-read',
              notificationId: notificationId
            })
          );
        } catch (e) {
          // ReactNativeWebView가 없으면 무시 (일반 웹 환경)
        }
      }
    } catch (error) {
      console.error('❌ [NotificationManager] 읽음 처리 실패:', error);
      throw error;
    }
  }

  // 모든 알림 읽음 처리 (서버가 3일 후 자동 삭제)
  static async markAllAsRead(userId: string) {
    const startTime = Date.now();
    
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/shared/services/firebase/config');
      
      if (!db) {
        throw new Error('Firestore가 초기화되지 않았습니다.');
      }
      
      // Firebase Functions URL 설정
      const functionsUrl = 'https://asia-northeast3-hs-jig-b2093.cloudfunctions.net';
      
      // 미읽은 알림 ID 조회
      const snapshot = await getDocs(query(
        collection(db, `users/${userId}/inbox`),
        where('read', '==', false)
      ));
      
      const inboxIds = snapshot.docs.map(doc => doc.id);
      
      if (inboxIds.length === 0) {
        return { marked: 0, duration: Date.now() - startTime };
      }
      // Functions 호출 - 읽음 처리만 (서버가 3일 후 자동 삭제)
      const response = await fetch(`${functionsUrl}/markNotificationsReadBulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, inboxIds })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`읽음 처리 실패 (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      // 모바일 앱에 배지 카운트 업데이트 알림 (React Native WebView)
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        try {
          (window as any).ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'notification-badge-update',
              action: 'mark-all-read'
            })
          );
        } catch (e) {
          // ReactNativeWebView가 없으면 무시 (일반 웹 환경)
        }
      }
      
      return {
        marked: result.marked,
        duration,
        totalRequested: inboxIds.length
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [NotificationManager] 모든 알림 읽음 처리 실패 (${duration}ms):`, error);
      throw error;
    }
  }
}

// 알림 컨테이너 컴포넌트
export const NotificationContainer: React.FC<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}> = ({ position = 'top-right' }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    const unsubscribe = NotificationManager.subscribe((newNotifications) => {
      setNotifications(newNotifications);
    });
    return () => {
      unsubscribe();
    };
  }, [position]);

  useEffect(() => {
  }, [notifications]);

  // bottom 포지션일 때는 음수 offset으로 위로 쌓이게 함
  const isBottomPosition = position.includes('bottom');

  return (
    <>
      {notifications.map((notification, index) => {
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


