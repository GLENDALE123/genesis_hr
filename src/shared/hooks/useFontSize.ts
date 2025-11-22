/**
 * 폰트 크기 관리 훅
 * CSS 변수를 통해 동적으로 폰트 크기를 변경
 */


import React, { useEffect } from 'react';
import { useSettings } from '@/features/settings/hooks/useSettings';

// 폰트 크기 배율 매핑
const FONT_SIZE_SCALE = {
  small: 0.875,   // 14px * 0.875 = 12.25px
  medium: 1,      // 14px * 1 = 14px (기본)
  large: 1.125,   // 14px * 1.125 = 15.75px
} as const;

export const useFontSize = () => {
  const { settings } = useSettings();
  
  // fontSize만 추출하여 불필요한 리렌더링 방지
  const fontSize = React.useMemo(() => settings.appearance.fontSize, [settings.appearance.fontSize]);
  const scale = React.useMemo(() => FONT_SIZE_SCALE[fontSize], [fontSize]);

  useEffect(() => {
    // CSS 변수 업데이트
    const root = document.documentElement;
    const currentScale = root.style.getPropertyValue('--font-size-scale');
    const newScale = scale.toString();
    
    // 값이 실제로 변경된 경우에만 업데이트 (불필요한 DOM 조작 방지)
    if (currentScale !== newScale) {
      root.style.setProperty('--font-size-scale', newScale);
    }
  }, [scale]);

  return {
    fontSize,
    scale,
  };
};

