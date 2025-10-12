/**
 * 플랫폼 감지 유틸리티
 */

import { Platform } from '@/shared/types/settings';

/**
 * 현재 실행 중인 플랫폼 감지
 * @returns 'web' | 'desktop' | 'mobile'
 */
export const detectPlatform = (): Platform => {
  if (typeof window === 'undefined') return 'web';
  
  // Electron 환경
  if ((window as any).__ELECTRON__) return 'desktop';
  
  // React Native WebView 환경
  if ((window as any).ReactNativeWebView) return 'mobile';
  
  // 기본값: 웹 브라우저
  return 'web';
};

/**
 * Electron 환경 여부 확인
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__ELECTRON__ === true;
};

/**
 * 모바일 앱 환경 여부 확인
 */
export const isMobileApp = (): boolean => {
  return typeof window !== 'undefined' && (window as any).ReactNativeWebView !== undefined;
};

/**
 * 웹 브라우저 환경 여부 확인
 */
export const isWebBrowser = (): boolean => {
  return !isElectron() && !isMobileApp();
};


