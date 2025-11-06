'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Electron 및 모바일 앱 환경에서 알림 클릭 시 네비게이션 처리
 */
export const ElectronNavigationHandler: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Electron 환경 처리
    if (window.__ELECTRON__ && window.electron?.onNavigateTo) {
      // 알림 클릭 시 네비게이션 이벤트 수신
      const unsubscribe = window.electron.onNavigateTo((link: string) => {
        try {
          console.log('🔗 [Electron Navigation] 페이지 이동:', link);
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
    }

    // 모바일 앱 환경 처리 (React Native WebView에서 커스텀 이벤트 전송)
    const handleMobileNavigation = (event: CustomEvent<{ url: string }>) => {
      try {
        const url = event.detail?.url;
        if (url) {
          console.log('🔗 [Mobile Navigation] 페이지 이동:', url);
          router.push(url);
        }
      } catch (error) {
        console.error('❌ [Mobile Navigation] 페이지 이동 실패:', error);
      }
    };

    window.addEventListener('react-native-navigate', handleMobileNavigation as EventListener);

    return () => {
      window.removeEventListener('react-native-navigate', handleMobileNavigation as EventListener);
    };
  }, [router]);

  return null;
};

export default ElectronNavigationHandler;

