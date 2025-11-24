import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 인증이 필요한 페이지를 보호하는 컴포넌트
 * 로그인하지 않은 사용자를 로그인 페이지로 리다이렉트합니다.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  // 클라이언트에서만 마운트 상태 관리
  useEffect(() => {
    setMounted(true);
  }, []);

  // 무한 로딩 방지 타임아웃 (파일 프로토콜/내장서버 환경 보호)
  useEffect(() => {
    if (!mounted || timerStarted) return;
    setTimerStarted(true);
    const id = setTimeout(() => {
      try {
        if (!user && isLoading) {
<<<<<<< HEAD
          navigate('/login', { replace: true });
=======
          navigate('/login/');
>>>>>>> develop
        }
      } catch {
        // 네비게이션 실패 시 무시
      }
    }, 4000);
    return () => clearTimeout(id);
  }, [mounted, timerStarted, user, isLoading, navigate]);

  useEffect(() => {
    // 로딩이 완료되고 사용자가 로그인되지 않은 경우 로그인 페이지로 리다이렉트
    if (!isLoading && !user) {
<<<<<<< HEAD
      navigate('/login', { replace: true });
=======
      navigate('/login/');
>>>>>>> develop
    }
  }, [user, isLoading, navigate]);

  // 서버에서는 아무것도 렌더링하지 않음 (hydration 불일치 방지)
  if (!mounted) {
    return fallback || (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner 
          size="xl" 
          label="인증 확인 중..." 
          loadingVariant="card"
        />
      </div>
    );
  }

  // 첫 로드 시 (isLoading=true, user=null)에만 스피너 표시
  // localStorage에 사용자 정보가 있으면 즉시 렌더링
  if (isLoading && !user) {
    return fallback || (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner 
          size="xl" 
          label="인증 확인 중..." 
          loadingVariant="card"
        />
      </div>
    );
  }
  
  // localStorage에 사용자 정보가 있고 isLoading=true인 경우는 백그라운드 검증 중이므로 렌더링
  if (isLoading && user) {
    return <>{children}</>;
  }

  // 사용자가 로그인되지 않은 경우 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!user) {
    return null;
  }

  // 인증된 사용자에게는 자식 컴포넌트 렌더링
  return <>{children}</>;
};

