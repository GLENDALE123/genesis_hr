'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingSpinner } from '@/shared/components/common';

export default function Home() {
  const router = useRouter();
  const { user, isLoading: loading } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // 클라이언트에서만 실행
    if (!isClient) return;

    // 로딩 중이면 대기
    if (loading) {
      return;
    }

    // 로그인 상태에 따라 리다이렉트
    if (user) {
      router.replace('/dashboard/');
    } else {
      router.replace('/login/');
      // Next 라우터가 실패하는 경우를 대비한 강제 폴백 (Electron/file 환경 안전성 향상)
      if (!triedFallback) {
        setTriedFallback(true);
        setTimeout(function () {
          try {
            if (typeof window !== 'undefined' && window.location && window.location.pathname === '/') {
              // 내장 정적 서버(파일 대체)에서만 index.html 폴백 적용
              var host = window.location.hostname;
              if (host === '127.0.0.1' || host === 'localhost') {
                window.location.href = '/login/index.html';
              }
            }
          } catch (e) {}
        }, 600);
      }
    }
  }, [user, loading, router, isClient, triedFallback]);

  // 서버와 클라이언트에서 동일한 초기 렌더링을 위해 고정된 label 사용
  return (
    <LoadingSpinner 
      fullScreen 
      size="xl"
      label="인증 상태 확인 중..."
    />
  );
}
