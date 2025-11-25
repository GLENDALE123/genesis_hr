'use client';

import React, { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { toast } from 'sonner';

interface NetworkStatusProviderProps {
  children: React.ReactNode;
}

/**
 * 네트워크 상태 변화를 감지하고 사용자에게 알림을 표시하는 프로바이더
 */
export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({ children }) => {
  const { isOnline, isOffline } = useNetworkStatus();
  const wasOffline = useRef(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // 첫 렌더링 시에는 알림 표시 안 함
    if (isFirstRender.current) {
      isFirstRender.current = false;
      wasOffline.current = isOffline;
      return;
    }

    if (isOffline && !wasOffline.current) {
      // 온라인 → 오프라인
      toast.error('인터넷 연결이 끊어졌습니다.', {
        duration: Infinity,
        id: 'network-offline',
      });
      wasOffline.current = true;
    } else if (isOnline && wasOffline.current) {
      // 오프라인 → 온라인
      toast.dismiss('network-offline');
      toast.success('인터넷에 다시 연결되었습니다.', {
        duration: 3000,
      });
      wasOffline.current = false;
    }
  }, [isOnline, isOffline]);

  return <>{children}</>;
};

