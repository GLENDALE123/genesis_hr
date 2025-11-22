/**
 * 폰트 크기 적용 컴포넌트
 * 설정에 따라 CSS 변수를 업데이트
 */


import { useFontSize } from '@/shared/hooks/useFontSize';

export const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 폰트 크기 설정 적용
  useFontSize();
  
  return <>{children}</>;
};


