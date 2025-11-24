import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { getKoreaDateString, getKoreaTimeInfo } from '@/shared/utils/dateUtils';
import { onSessionChange, clearSession } from '../services/sessionService';
=======
// 자동 로그아웃은 Firebase Functions에서 처리하므로 dateUtils import 제거
import { onSessionChange } from '../services/sessionService';
>>>>>>> develop
import { getDeviceId } from '../utils/savedAccounts';
import { toast } from 'sonner';

interface AuthProviderProps {
  children: React.ReactNode;
}

<<<<<<< HEAD
// localStorage 키
const LAST_LOGIN_DATE_KEY = 'last-login-date';
=======
// 자동 로그아웃은 Firebase Functions에서 처리
>>>>>>> develop

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initializeAuth, user, isLoading, logout } = useAuthStore();
  const navigate = useNavigate();
<<<<<<< HEAD
  const logoutCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedDateRef = useRef<string>('');
=======
>>>>>>> develop
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionRegistrationTimeRef = useRef<number>(0); // 현재 기기 세션 등록 시간

  useEffect(() => {
    // 스크립트에서 이미 초기 상태가 설정되었다면 즉시 Firebase 인증 확인
    // if (window.__AUTH_INITIAL_STATE__) {
    //   // 초기 상태 처리 로직이 필요한 경우 여기에 추가
    // }
    
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
    const listenerRegistrationTime = Date.now(); // 리스너 등록 시간
    
    // 현재 세션 등록 시간 확인 (로그인 직후 등록된 세션 무시를 위해)
    const checkCurrentSession = async () => {
      try {
        // 세션 스토리지에서 등록 시간 확인 (로그인 시 저장된 시간)
        const storedTime = sessionStorage.getItem(`session-reg-time-${user.uid}`);
        if (storedTime) {
          sessionRegistrationTimeRef.current = parseInt(storedTime, 10);
          console.log(`✅ [AuthProvider] 세션 등록 시간 확인 (sessionStorage): ${new Date(sessionRegistrationTimeRef.current).toISOString()}`);
        } else {
          // 세션 스토리지에 없으면 Firestore에서 확인
          const { getActiveSession } = await import('../services/sessionService');
          const activeSession = await getActiveSession(user.uid);
          
          // 현재 기기의 세션이면 등록 시간 저장
          if (activeSession && activeSession.deviceId === currentDeviceId) {
            sessionRegistrationTimeRef.current = activeSession.lastActiveAt?.getTime() || Date.now();
            console.log(`✅ [AuthProvider] 현재 기기 세션 확인 (Firestore): ${new Date(sessionRegistrationTimeRef.current).toISOString()}`);
          }
        }
      } catch (error) {
        console.error('⚠️ [AuthProvider] 현재 세션 확인 실패:', error);
      }
    };
    
    checkCurrentSession();
    
    // 리스너 등록 (onSessionChange 내부에서 첫 번째 스냅샷을 무시하도록 개선됨)
    const unsubscribe = onSessionChange(
      user.uid,
      currentDeviceId,
      async (session) => {
<<<<<<< HEAD
        // session이 null이면 세션이 삭제된 것이므로 무시
        if (!session) {
=======
        // session이 null이면 세션이 삭제된 것 (Firebase Functions에서 새벽 1시 자동 로그아웃 또는 수동 삭제)
        if (!session) {
          try {
            console.log('🔄 [AuthProvider] 세션 삭제 감지 - 자동 로그아웃 실행 (새벽 1시 또는 수동 삭제)');
            toast.warning('세션이 만료되어 로그아웃되었습니다.');
            
            // 로그아웃 처리
            await logout();
            
            navigate('/login');
          } catch (error) {
            console.error('❌ [AuthProvider] 세션 삭제로 인한 자동 로그아웃 실패:', error);
          }
>>>>>>> develop
          return;
        }
        
        // 다른 기기에서 로그인한 경우 (세션이 변경됨)
        if (session.deviceId !== currentDeviceId) {
          // 최근 등록된 세션인지 확인 (10초 이내)
          const sessionTime = session.lastActiveAt?.getTime() || Date.now();
          const timeDiff = Date.now() - sessionTime;
          
          // 리스너 등록 후 3초 이내에 발생한 변경은 무시 (자신의 세션 등록일 수 있음)
          const timeSinceListenerRegistration = Date.now() - listenerRegistrationTime;
          if (timeSinceListenerRegistration < 3000) {
            console.log(`⏳ [AuthProvider] 리스너 등록 직후 변경 감지 - 무시 (${timeSinceListenerRegistration}ms)`);
            return;
          }
          
          // 10초 이내에 등록된 세션이면 다른 기기에서 로그인한 것으로 간주
          if (timeDiff <= 10000) {
            // 현재 기기 세션 등록 시간과 비교 (자신의 세션 등록인지 확인)
            if (sessionRegistrationTimeRef.current > 0) {
              const timeFromOwnRegistration = sessionTime - sessionRegistrationTimeRef.current;
              // 자신의 세션 등록 후 5초 이내면 무시
              if (timeFromOwnRegistration >= 0 && timeFromOwnRegistration < 5000) {
                console.log(`ℹ️ [AuthProvider] 자신의 세션 등록으로 판단 - 무시 (${timeFromOwnRegistration}ms)`);
                return;
              }
            }
            
            try {
              console.log('🔄 [AuthProvider] 다른 기기에서 로그인 감지 - 자동 로그아웃 실행');
              toast.warning('다른 기기에서 로그인되어 로그아웃되었습니다.');
              
              // 로그아웃 처리
              await logout();
              
<<<<<<< HEAD
              navigate('/login', { replace: true });
=======
              navigate('/login');
>>>>>>> develop
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
      if (sessionUnsubscribeRef.current) {
        sessionUnsubscribeRef.current();
        sessionUnsubscribeRef.current = null;
      }
    };
  }, [user, isLoading, logout, navigate]);

<<<<<<< HEAD
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
            navigate('/login', { replace: true });
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
  }, [user, isLoading, logout, navigate]);
=======
  // 자동 로그아웃은 Firebase Functions에서 처리
  // 새벽 1시에 Functions가 모든 세션을 삭제하면,
  // onSessionChange 리스너가 이를 감지하여 자동 로그아웃 처리
  // 클라이언트에서는 별도의 시간 체크가 필요 없음
>>>>>>> develop

  return <>{children}</>;
};

