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
  if ((window as unknown as Record<string, unknown>).__ELECTRON__) return 'desktop';

  // React Native WebView 환경
  if ((window as unknown as Record<string, unknown>).ReactNativeWebView) return 'mobile';
  
  // 기본값: 웹 브라우저
  return 'web';
};

/**
 * Electron 환경 여부 확인
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON__ === true;
};

/**
 * 모바일 앱 환경 여부 확인
 */
export const isMobileApp = (): boolean => {
  return typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).ReactNativeWebView !== undefined;
};

/**
 * 웹 브라우저 환경 여부 확인
 */
export const isWebBrowser = (): boolean => {
  return !isElectron() && !isMobileApp();
};

/**
 * 태블릿 기기 여부 확인 (User-Agent 기반)
 */
export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // iPad 감지 (iOS 13 이전은 "ipad", iOS 13 이후는 "macintosh"로 표시되지만 touch 지원)
  const isIPad = userAgent.includes('ipad') || 
    (userAgent.includes('macintosh') && 'ontouchend' in document);
  
  // Android 태블릿 감지 (Mobile이 없고 Tablet이 있거나, Mobile이 없고 화면 크기가 큰 경우)
  const isAndroidTablet = userAgent.includes('android') && 
    !userAgent.includes('mobile') &&
    (userAgent.includes('tablet') || window.screen.width >= 768);
  
  // 기타 태블릿 (Galaxy Tab, Kindle 등)
  const isOtherTablet = /tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(userAgent);
  
  return isIPad || isAndroidTablet || isOtherTablet;
};


