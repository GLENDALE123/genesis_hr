/**
 * 폰트 크기 관리 훅
 * CSS 변수를 통해 동적으로 폰트 크기를 변경
 */

'use client';

import { useEffect } from 'react';
import { useSettings } from '@/features/settings/hooks/useSettings';

// 폰트 크기 배율 매핑
const FONT_SIZE_SCALE = {
  small: 0.875,   // 14px * 0.875 = 12.25px
  medium: 1,      // 14px * 1 = 14px (기본)
  large: 1.125,   // 14px * 1.125 = 15.75px
} as const;

export const useFontSize = () => {
  const { settings } = useSettings();

  useEffect(() => {
    // CSS 변수 업데이트
    const root = document.documentElement;
    const scale = FONT_SIZE_SCALE[settings.appearance.fontSize];
    
    root.style.setProperty('--font-size-scale', scale.toString());
    
    console.log(`📝 폰트 크기 변경: ${settings.appearance.fontSize} (배율: ${scale})`);
  }, [settings.appearance.fontSize]);

  return {
    fontSize: settings.appearance.fontSize,
    scale: FONT_SIZE_SCALE[settings.appearance.fontSize],
  };
};
