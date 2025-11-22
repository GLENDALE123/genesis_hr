
import { useAppState } from '@/shared/hooks/useAppState';

/**
 * 앱 상태 감지를 위한 Provider 컴포넌트
 */
export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAppState();
  return <>{children}</>;
};

export default AppStateProvider;




