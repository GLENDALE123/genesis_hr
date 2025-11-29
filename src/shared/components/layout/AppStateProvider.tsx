import React from 'react';
import { useAppState } from '@/shared/hooks/useAppState';
import { useUserActivity } from '@/shared/hooks/useUserActivity';

/**
 * 앱 상태 감지를 위한 Provider 컴포넌트
 */
export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAppState();
  useUserActivity(); // 사용자 활동 추적 추가
  return <>{children}</>;
};

export default AppStateProvider;




