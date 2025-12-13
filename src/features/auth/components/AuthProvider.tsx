import React, { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
// 자동 로그아웃은 Firebase Functions에서 처리하므로 dateUtils import 제거
import { onSessionChange, getActiveSession } from '../services/sessionService';
import { getDeviceId } from '../utils/savedAccounts';
import { toast } from 'sonner';
import { isElectron, isMobileApp } from '@/shared/utils/platform/platform';

interface AuthProviderProps {
  children: React.ReactNode;
}

// 자동 로그아웃은 Firebase Functions에서 처리

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initializeAuth, user, isLoading, logout } = useAuthStore();
  const navigate = useNavigate();
  const sessionUnsubscribeRef = useRef<(() => void) | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRegistrationTimeRef = useRef<number>(0); // 현재 기기 세션 등록 시간
  const isCheckingSessionRef = useRef<boolean>(false); // 세션 체크 중 플래그 (중복 체크 방지)
  
  const cleanupSessionListener = useCallback(() => {
    if (sessionUnsubscribeRef.current) {
      sessionUnsubscribeRef.current();
      sessionUnsubscribeRef.current = null;
    }
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
  }, []);

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
      cleanupSessionListener();
      return;
    }

    // 세션 변경 감지 리스너 등록
    const currentDeviceId = getDeviceId();
    const listenerRegistrationTime = Date.now(); // 리스너 등록 시간
    
    // 세션 체크 함수 (주기적 체크 및 앱 활성화 시 사용)
    const checkSessionStatus = async (): Promise<boolean> => {
      // 중복 체크 방지
      if (isCheckingSessionRef.current) {
        return false;
      }
      
      try {
        isCheckingSessionRef.current = true;
        const activeSession = await getActiveSession(user.uid);
        
        // 세션이 없으면 삭제된 것 (자동 로그아웃)
        if (!activeSession) {
          console.log('🔄 [AuthProvider] 주기적 세션 체크 - 세션 삭제 감지 (자동 로그아웃)');
          cleanupSessionListener();
          toast.warning('세션이 만료되어 로그아웃되었습니다.');
          await logout();
          navigate('/login');
          return true; // 세션 삭제됨
        }
        
        // 다른 기기의 세션이면 로그아웃
        if (activeSession.deviceId !== currentDeviceId) {
          console.log('🔄 [AuthProvider] 주기적 세션 체크 - 다른 기기 세션 감지');
          cleanupSessionListener();
          toast.warning('다른 기기에서 로그인되어 로그아웃되었습니다.');
          await logout();
          navigate('/login');
          return true; // 세션 변경됨
        }
        
        return false; // 세션 정상
      } catch (error) {
        console.error('❌ [AuthProvider] 세션 체크 실패:', error);
        return false; // 에러 발생 시 계속 진행
      } finally {
        isCheckingSessionRef.current = false;
      }
    };
    
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
        // session이 null이면 세션이 삭제된 것 (Firebase Functions에서 새벽 1시 자동 로그아웃 또는 수동 삭제)
        if (!session) {
          try {
            cleanupSessionListener();
            console.log('🔄 [AuthProvider] 세션 삭제 감지 - 자동 로그아웃 실행 (새벽 1시 또는 수동 삭제)');
            toast.warning('세션이 만료되어 로그아웃되었습니다.');
            
            // 로그아웃 처리
            await logout();
            
            navigate('/login');
          } catch (error) {
            console.error('❌ [AuthProvider] 세션 삭제로 인한 자동 로그아웃 실패:', error);
          }
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
              cleanupSessionListener();
              console.log('🔄 [AuthProvider] 다른 기기에서 로그인 감지 - 자동 로그아웃 실행');
              toast.warning('다른 기기에서 로그인되어 로그아웃되었습니다.');
              
              // 로그아웃 처리
              await logout();
              
              navigate('/login');
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
    
    // 일렉트론/모바일 환경에서 주기적 세션 체크 (백그라운드에서도 작동)
    // Firestore 리스너가 백그라운드에서 작동하지 않을 수 있으므로 주기적 체크 추가
    // 비용 최적화: 새벽 1시 전후에만 더 자주 체크하고, 평소에는 5분 간격으로 체크
    if (isElectron() || isMobileApp()) {
      const getCheckInterval = (): number => {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // 새벽 1시 전후 30분 (00:30 ~ 01:30)에는 1분마다 체크
        // 새벽 1시가 지났는지 확인하기 위해 더 자주 체크
        if ((hour === 0 && minute >= 30) || (hour === 1 && minute <= 30)) {
          return 60 * 1000; // 1분
        }
        
        // 평소에는 5분마다 체크 (비용 절감)
        return 5 * 60 * 1000; // 5분
      };
      
      // 초기 체크 간격 설정
      let checkInterval = getCheckInterval();
      
      // 주기적 세션 체크
      const startPeriodicCheck = () => {
        // 동적 간격으로 체크 (시간대에 따라 간격 변경)
        const intervalId = setInterval(() => {
          checkSessionStatus();
          
          // 간격이 변경되었는지 확인 (새벽 1시 전후로 진입/이탈)
          const newInterval = getCheckInterval();
          if (newInterval !== checkInterval) {
            checkInterval = newInterval;
            // 기존 인터벌 정리하고 새로 시작
            clearInterval(intervalId);
            startPeriodicCheck();
          }
        }, checkInterval);
        
        sessionCheckIntervalRef.current = intervalId;
      };
      
      startPeriodicCheck();
      
      console.log(`✅ [AuthProvider] 일렉트론/모바일 환경 - 주기적 세션 체크 활성화 (초기 간격: ${checkInterval / 1000}초)`);
    }
    
    // 앱 활성화 시 세션 체크 (포그라운드로 돌아올 때)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // 앱이 포그라운드로 돌아왔을 때 세션 체크
        console.log('📱 [AuthProvider] 앱 활성화 - 세션 체크 실행');
        checkSessionStatus();
      }
    };
    
    const handleFocus = () => {
      // 윈도우 포커스 시 세션 체크
      console.log('📱 [AuthProvider] 윈도우 포커스 - 세션 체크 실행');
      checkSessionStatus();
    };
    
    // 네트워크 재연결 시 세션 체크
    const handleOnline = () => {
      // 네트워크가 재연결되었을 때 세션 체크
      console.log('🌐 [AuthProvider] 네트워크 재연결 - 세션 체크 실행');
      checkSessionStatus();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    
    // cleanup: 컴포넌트 언마운트 또는 로그아웃 시 리스너 정리
    return () => {
      cleanupSessionListener();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [user, isLoading, logout, navigate, cleanupSessionListener]);

  // 자동 로그아웃은 Firebase Functions에서 처리
  // 새벽 1시에 Functions가 모든 세션을 삭제하면,
  // onSessionChange 리스너와 주기적 세션 체크가 이를 감지하여 자동 로그아웃 처리
  // 일렉트론/모바일 환경에서는 주기적 체크로 백그라운드에서도 작동 보장

  return <>{children}</>;
};
