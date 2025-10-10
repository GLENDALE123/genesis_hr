'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Electron 환경에서 알림 클릭 시 네비게이션 처리
 */
export const ElectronNavigationHandler: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Electron 환경 체크
    if (typeof window === 'undefined' || !window.__ELECTRON__ || !window.electron?.onNavigateTo) {
      return;
    }

    // 알림 클릭 시 네비게이션 이벤트 수신
    const unsubscribe = window.electron.onNavigateTo((link: string) => {
      try {
        // Next.js 라우터로 이동
        router.push(link);
      } catch (error) {
        console.error('❌ [Electron Navigation] 페이지 이동 실패:', error);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);

  return null;
};

export default ElectronNavigationHandler;

