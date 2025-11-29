/**
 * 사용자 활동 추적 훅
 * 마우스 움직임, 클릭, 키보드 입력 등을 감지하여 사용자 활동 상태를 추적
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { UserStatusService } from '@/features/chat/services/userStatusService';

const AWAY_TIMEOUT = 20 * 60 * 1000; // 20분 (밀리초)
const ACTIVITY_UPDATE_INTERVAL = 30 * 1000; // 30초마다 활동 상태 업데이트

export const useUserActivity = () => {
  const { user } = useAuthStore();
  const lastActivityRef = useRef<number>(Date.now());
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAwayRef = useRef<boolean>(false);

  // 활동 감지 핸들러
  const handleActivity = useCallback(() => {
    if (!user?.uid) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // 마지막 활동 시간 업데이트
    lastActivityRef.current = now;

    // 자리비움 상태였다면 온라인으로 전환
    if (isAwayRef.current) {
      isAwayRef.current = false;
      UserStatusService.setOnline(user.uid, new Date().toISOString()).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to set online status:', error);
        }
      });
    }

    // 자리비움 타이머 리셋
    if (awayTimeoutRef.current) {
      clearTimeout(awayTimeoutRef.current);
    }

    // 20분 후 자리비움 상태로 전환
    awayTimeoutRef.current = setTimeout(() => {
      if (!user?.uid) return;
      isAwayRef.current = true;
      UserStatusService.setAway(user.uid).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to set away status:', error);
        }
      });
    }, AWAY_TIMEOUT);
  }, [user?.uid]);

  // 주기적으로 활동 상태 업데이트 (30초마다)
  const updateActivityStatus = useCallback(() => {
    if (!user?.uid) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // 20분 이상 활동이 없으면 자리비움 상태로 전환
    if (timeSinceLastActivity >= AWAY_TIMEOUT && !isAwayRef.current) {
      isAwayRef.current = true;
      UserStatusService.setAway(user.uid).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to set away status:', error);
        }
      });
    } else if (timeSinceLastActivity < AWAY_TIMEOUT && isAwayRef.current) {
      // 활동이 있으면 온라인으로 전환
      isAwayRef.current = false;
      UserStatusService.setOnline(user.uid, new Date(lastActivityRef.current).toISOString()).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to set online status:', error);
        }
      });
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    // 초기 온라인 상태 설정
    UserStatusService.setOnline(user.uid).catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to set initial online status:', error);
      }
    });

    // 활동 이벤트 리스너 등록
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus',
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // 주기적으로 활동 상태 업데이트
    updateIntervalRef.current = setInterval(updateActivityStatus, ACTIVITY_UPDATE_INTERVAL);

    // 초기 자리비움 타이머 설정
    awayTimeoutRef.current = setTimeout(() => {
      if (!user?.uid) return;
      isAwayRef.current = true;
      UserStatusService.setAway(user.uid).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to set away status:', error);
        }
      });
    }, AWAY_TIMEOUT);

    // 페이지 언로드 시 오프라인 상태로 설정
    const handleBeforeUnload = () => {
      if (user?.uid) {
        // 동기적으로 오프라인 상태 설정 (페이지가 닫히기 전에 실행)
        UserStatusService.setOffline(user.uid).catch(() => {
          // 에러는 무시 (페이지가 닫히는 중이므로)
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 클린업
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current);
      }

      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      window.removeEventListener('beforeunload', handleBeforeUnload);

      // 컴포넌트 언마운트 시 오프라인 상태로 설정
      if (user?.uid) {
        UserStatusService.setOffline(user.uid).catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to set offline status:', error);
          }
        });
      }
    };
  }, [user?.uid, handleActivity, updateActivityStatus]);
};

