import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Electron 및 모바일 앱 환경에서 알림 클릭 시 네비게이션 처리
 */
export const ElectronNavigationHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let electronUnsubscribe: (() => void) | undefined;
    let mobileNavigationHandler: ((event: CustomEvent<{ url: string }>) => void) | undefined;

    // Electron 환경 처리
    if (window.__ELECTRON__ && window.electron?.onNavigateTo) {
      // 알림 클릭 시 네비게이션 이벤트 수신
      electronUnsubscribe = window.electron.onNavigateTo((link: string) => {
        try {
          console.log('🔗 [Electron Navigation] 페이지 이동:', link);
          // React Router로 이동
          navigate(link);
        } catch (error) {
          console.error('❌ [Electron Navigation] 페이지 이동 실패:', error);
        }
      });
    }

    // 모바일 앱 환경 처리 (React Native WebView에서 커스텀 이벤트 전송)
    // Electron 환경이 아닐 때만 모바일 이벤트 리스너 등록
    if (!window.__ELECTRON__) {
      mobileNavigationHandler = (event: CustomEvent<{ url: string }>) => {
        try {
          const url = event.detail?.url;
          if (url) {
            console.log('🔗 [Mobile Navigation] 페이지 이동:', url);
            navigate(url);
          }
        } catch (error) {
          console.error('❌ [Mobile Navigation] 페이지 이동 실패:', error);
        }
      };

      window.addEventListener('react-native-navigate', mobileNavigationHandler as EventListener);
    }

    return () => {
      // Electron 구독 해제
      if (electronUnsubscribe) {
        electronUnsubscribe();
      }
      // 모바일 이벤트 리스너 제거
      if (mobileNavigationHandler) {
        window.removeEventListener('react-native-navigate', mobileNavigationHandler as EventListener);
      }
    };
  }, [navigate]);

  return null;
};

export default ElectronNavigationHandler;

