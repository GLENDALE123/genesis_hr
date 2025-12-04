/**
 * localStorage 최적화 React 훅
 * 앱 시작 시 자동 정리 활성화
 */

import { useEffect } from 'react';
import { startAutoCleanup, stopAutoCleanup, logStorageStatus } from './storageOptimizer';

/**
 * localStorage 자동 정리 훅
 * 앱 시작 시 자동으로 정리 스케줄러를 시작하고,
 * 언마운트 시 정리합니다.
 */
export function useStorageOptimizer() {
  useEffect(() => {
    // 개발 모드에서 저장소 상태 로깅
    if (process.env.NODE_ENV === 'development') {
      logStorageStatus();
    }

    // 자동 정리 시작
    startAutoCleanup();

    // 언마운트 시 정리 중지
    return () => {
      stopAutoCleanup();
    };
  }, []);
}





