'use client';

import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { useRouter } from 'next/navigation';
import { getKoreaDateString, getKoreaTimeInfo } from '@/shared/utils/dateUtils';
import { onSessionChange, clearSession } from '../services/sessionService';
import { getDeviceId } from '../utils/savedAccounts';
import { toast } from 'sonner';

interface AuthProviderProps {
  children: React.ReactNode;
}

// localStorage 키
const LAST_LOGIN_DATE_KEY = 'last-login-date';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initializeAuth, user, isLoading, logout } = useAuthStore();
  const router = useRouter();
  const logoutCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedDateRef = useRef<string>('');
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionInitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSessionInitializingRef = useRef<boolean>(false);
  const sessionInitTimeRef = useRef<number>(0);

  useEffect(() => {
    // 스크립트에서 이미 초기 상태가 설정되었다면 즉시 Firebase 인증 확인
    if (window.__AUTH_INITIAL_STATE__) {
    }
    
    // Auth 상태 초기화
    const unsubscribe = initializeAuth();
    
    return unsubscribe;
  }, [initializeAuth]);

  // 세션 변경 감지 및 자동 로그아웃 (다른 기기에서 로그인 감지)
  useEffect(() => {
    // 로그인된 사용자가 없거나 로딩 중이면 스킵
    if (isLoading || !user) {
      // 기존 세션 리스너 정리
      if (sessionUnsubscribeRef.current) {
        sessionUnsubscribeRef.current();
        sessionUnsubscribeRef.current = null;
      }
      return;
    }

    // 세션 변경 감지 리스너 등록
    const currentDeviceId = getDeviceId();
    
    // 초기화 시작
    isSessionInitializingRef.current = true;
    sessionInitTimeRef.current = Date.now();
    
    // 기존 타이머 정리
    if (sessionInitTimerRef.current) {
      clearTimeout(sessionInitTimerRef.current);
    }
    
    // 초기 체크: 현재 세션이 이미 존재하는지 확인
    const checkInitialSession = async () => {
      try {
        const { getActiveSession } = await import('../services/sessionService');
        const activeSession = await getActiveSession(user.uid);
        
        // 현재 기기의 세션이 이미 존재하면 초기화 시간 단축
        if (activeSession && activeSession.deviceId === currentDeviceId) {
          console.log('✅ [AuthProvider] 현재 기기 세션 확인 완료');
          // 이미 세션이 있으면 0.5초 후 초기화 완료
          sessionInitTimerRef.current = setTimeout(() => {
            isSessionInitializingRef.current = false;
            console.log('✅ [AuthProvider] 세션 감지 초기화 완료 (기존 세션)');
          }, 500);
          return;
        }
      } catch (error) {
        console.error('⚠️ [AuthProvider] 초기 세션 확인 실패:', error);
      }
      
      // 세션이 없거나 다른 기기 세션이면 3초 후 초기화 완료 (새 로그인 시 세션 등록 시간 확보)
      sessionInitTimerRef.current = setTimeout(() => {
        isSessionInitializingRef.current = false;
        console.log('✅ [AuthProvider] 세션 감지 초기화 완료');
      }, 3000);
    };
    
    checkInitialSession();
    
    // 리스너 등록
    const unsubscribe = onSessionChange(
      user.uid,
      currentDeviceId,
      async (session) => {
        // 초기화 중이면 현재 기기 세션인지 확인
        if (isSessionInitializingRef.current) {
          // 현재 기기의 세션이면 무시 (자신의 세션 등록)
          if (session && session.deviceId === currentDeviceId) {
            console.log('⏳ [AuthProvider] 초기화 중 - 현재 기기 세션 등록 무시');
            return;
          }
          
          // 다른 기기 세션이지만 최근 등록된 것이 아니면 무시 (이전 세션일 수 있음)
          if (session) {
            const sessionTime = session.lastActiveAt?.getTime() || Date.now();
            const timeSinceInit = Date.now() - sessionInitTimeRef.current;
            
            // 초기화 후 5초 이내에 등록된 세션이 아니면 무시
            if (timeSinceInit > 5000) {
              console.log('⏳ [AuthProvider] 초기화 중 - 이전 세션 무시');
              return;
            }
          }
        }
        
        // 다른 기기에서 로그인한 경우 (세션이 변경됨)
        // session이 null이면 세션이 삭제된 것이므로 무시
        if (session && session.deviceId !== currentDeviceId) {
          // 최근 등록된 세션인지 확인 (10초 이내)
          const sessionTime = session.lastActiveAt?.getTime() || Date.now();
          const timeDiff = Date.now() - sessionTime;
          
          // 10초 이내에 등록된 세션이면 다른 기기에서 로그인한 것으로 간주
          if (timeDiff <= 10000) {
            try {
              console.log('🔄 [AuthProvider] 다른 기기에서 로그인 감지 - 자동 로그아웃 실행');
              toast.warning('다른 기기에서 로그인되어 로그아웃되었습니다.');
              
              // 로그아웃 처리
              await logout();
              
              router.push('/login');
            } catch (error) {
              console.error('❌ [AuthProvider] 자동 로그아웃 실패:', error);
            }
          } else {
            console.log('ℹ️ [AuthProvider] 오래된 세션 변경 무시');
          }
        }
      }
    );
    
    sessionUnsubscribeRef.current = unsubscribe;
    
    // cleanup: 컴포넌트 언마운트 또는 로그아웃 시 리스너 정리
    return () => {
      if (sessionInitTimerRef.current) {
        clearTimeout(sessionInitTimerRef.current);
        sessionInitTimerRef.current = null;
      }
      if (sessionUnsubscribeRef.current) {
        sessionUnsubscribeRef.current();
        sessionUnsubscribeRef.current = null;
      }
    };
  }, [user, isLoading, logout, router]);

  // 자동 로그아웃 체크 로직 (한국 시간대 기준)
  useEffect(() => {
    // 로그인된 사용자가 없거나 로딩 중이면 스킵
    if (isLoading || !user) {
      // 기존 체크 인터벌 정리
      if (logoutCheckIntervalRef.current) {
        clearInterval(logoutCheckIntervalRef.current);
        logoutCheckIntervalRef.current = null;
      }
      return;
    }

    // 로그인 날짜 저장 (최초 로그인 시에만) - 한국 시간대 기준
    const saveLoginDate = () => {
      const today = getKoreaDateString(); // 한국 시간대 기준 날짜
      const savedDate = localStorage.getItem(LAST_LOGIN_DATE_KEY);
      
      // 저장된 날짜가 없거나 오늘과 다르면 오늘 날짜 저장
      if (!savedDate || savedDate !== today) {
        localStorage.setItem(LAST_LOGIN_DATE_KEY, today);
        lastCheckedDateRef.current = today;
      } else {
        lastCheckedDateRef.current = savedDate;
      }
    };

    // 초기 로그인 날짜 저장
    saveLoginDate();

    // 자동 로그아웃 체크 함수 (한국 시간대 기준)
    const checkAutoLogout = async () => {
      // 한국 시간대의 현재 시간 정보
      const koreaTimeInfo = getKoreaTimeInfo();
      const currentHour = koreaTimeInfo.hours;
      const currentDate = getKoreaDateString();
      const savedDate = localStorage.getItem(LAST_LOGIN_DATE_KEY);

      // 저장된 날짜가 있고 오늘 날짜와 다른 경우
      if (savedDate && savedDate !== currentDate) {
        // 날짜가 변경되었고 현재 시간이 01시 00분~01시 59분 사이인 경우 로그아웃
        if (currentHour === 1) {
          try {
            console.log('🔄 [AuthProvider] 날짜 변경 감지 - 새벽 01시(한국 시간) 자동 로그아웃 실행');
            await logout();
            localStorage.removeItem(LAST_LOGIN_DATE_KEY);
            router.push('/login');
          } catch (error) {
            console.error('❌ [AuthProvider] 자동 로그아웃 실패:', error);
          }
        }
        // 날짜는 변경되었지만 01시가 아닌 경우, 새 날짜로 업데이트
        // 이렇게 하면 사용자는 그날 계속 사용할 수 있고, 다음 날 01시에 로그아웃됨
        else {
          localStorage.setItem(LAST_LOGIN_DATE_KEY, currentDate);
          lastCheckedDateRef.current = currentDate;
        }
      }
    };

    // 초기 체크
    checkAutoLogout();

    // 매 분마다 체크 (01시 정확히 감지하기 위함)
    logoutCheckIntervalRef.current = setInterval(checkAutoLogout, 60000); // 1분 = 60000ms

    // cleanup: 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (logoutCheckIntervalRef.current) {
        clearInterval(logoutCheckIntervalRef.current);
        logoutCheckIntervalRef.current = null;
      }
    };
  }, [user, isLoading, logout, router]);

  return <>{children}</>;
};
