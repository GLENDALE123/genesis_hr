import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  effectiveType?: string;
}

/**
 * 네트워크 상태를 실시간으로 감지하는 훅
 * 
 * @returns {NetworkStatus} 현재 네트워크 상태
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // 온라인/오프라인 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 초기 상태 확인
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    effectiveType: typeof window !== 'undefined' && 'connection' in navigator
      ? (navigator as any).connection?.effectiveType
      : undefined
  };
};

