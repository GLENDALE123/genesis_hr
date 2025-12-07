/**
 * localStorage 최적화 유틸리티
 * - 크기 제한 체크
 * - 만료 데이터 자동 정리
 * - 메모리 사용량 모니터링
 */

import { useEffect } from 'react';

const STORAGE_PREFIX = 'hs-';
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB (안전한 크기, 브라우저 제한은 보통 5-10MB)
const CLEANUP_THRESHOLD = 0.8; // 80% 사용 시 정리 시작
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24시간마다 정리

interface StorageItem {
  key: string;
  size: number;
  timestamp?: number;
  expiry?: number;
}

/**
 * localStorage 항목의 크기 계산 (대략적)
 */
function getItemSize(key: string, value: string): number {
  // 키와 값의 문자열 길이 + 오버헤드 (대략 2바이트 per 문자)
  return (key.length + value.length) * 2;
}

/**
 * localStorage 전체 사용량 계산
 */
export function getStorageUsage(): {
  used: number;
  available: number;
  percentage: number;
  items: StorageItem[];
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      used: 0,
      available: MAX_STORAGE_SIZE,
      percentage: 0,
      items: []
    };
  }

  const items: StorageItem[] = [];
  let totalSize = 0;

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      const value = window.localStorage.getItem(key);
      if (!value) continue;

      const size = getItemSize(key, value);
      totalSize += size;

      // 타임스탬프 추출 시도 (Zustand persist 형식)
      let timestamp: number | undefined;
      let expiry: number | undefined;

      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          // Zustand persist 형식: { state: {...}, version: ... }
          if (parsed.state && parsed.state.lastUpdated) {
            timestamp = parsed.state.lastUpdated;
          }
          // 캐시 형식: { timestamp: ..., expiry: ... }
          if (parsed.timestamp) {
            timestamp = parsed.timestamp;
          }
          if (parsed.expiry) {
            expiry = parsed.expiry;
          }
        }
      } catch {
        // JSON 파싱 실패는 무시
      }

      items.push({
        key,
        size,
        timestamp,
        expiry
      });
    }
  } catch (error) {
    console.warn('[StorageOptimizer] 저장소 사용량 계산 실패:', error);
  }

  const available = MAX_STORAGE_SIZE - totalSize;
  const percentage = (totalSize / MAX_STORAGE_SIZE) * 100;

  return {
    used: totalSize,
    available,
    percentage,
    items: items.sort((a, b) => (b.size || 0) - (a.size || 0)) // 큰 것부터 정렬
  };
}

/**
 * 만료된 항목 정리
 */
export function cleanupExpiredItems(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  let cleanedCount = 0;
  const now = Date.now();

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      // 프로젝트 관련 키만 처리
      if (!key.startsWith(STORAGE_PREFIX)) continue;

      const value = window.localStorage.getItem(key);
      if (!value) continue;

      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          // 캐시 만료 시간 확인
          if (parsed.expiry && now > parsed.expiry) {
            keysToRemove.push(key);
            continue;
          }

          // Zustand persist 형식에서 lastUpdated 확인
          if (parsed.state && parsed.state.lastUpdated) {
            const lastUpdated = parsed.state.lastUpdated;
            const cacheDuration = 5 * 60 * 1000; // 5분
            // 7일 이상 오래된 데이터는 정리 (캐시가 아닌 경우)
            if (now - lastUpdated > 7 * 24 * 60 * 60 * 1000) {
              // quality-inspection-store는 cache를 persist하지 않으므로 안전
              // 하지만 오래된 lastUpdated는 정리 가능
              if (key.includes('quality-inspection-store') || 
                  key.includes('quality-issues-store') ||
                  key.includes('sample-requests-store')) {
                // 캐시만 있는 store는 lastUpdated가 오래되면 정리
                if (now - lastUpdated > 30 * 24 * 60 * 60 * 1000) { // 30일
                  keysToRemove.push(key);
                }
              }
            }
          }
        }
      } catch {
        // JSON 파싱 실패는 무시
      }
    }

    // 항목 제거
    keysToRemove.forEach(key => {
      try {
        window.localStorage.removeItem(key);
        cleanedCount++;
      } catch (error) {
        console.warn(`[StorageOptimizer] 항목 제거 실패: ${key}`, error);
      }
    });
  } catch (error) {
    console.warn('[StorageOptimizer] 만료 항목 정리 실패:', error);
  }

  return cleanedCount;
}

/**
 * 가장 큰 항목부터 정리 (크기 기반)
 */
export function cleanupBySize(targetSize: number): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 0;
  }

  const usage = getStorageUsage();
  if (usage.used <= targetSize) {
    return 0;
  }

  let cleanedSize = 0;
  let cleanedCount = 0;
  const targetCleanSize = usage.used - targetSize;

  // 크기 순으로 정렬된 항목들
  const items = usage.items.filter(item => {
    // 중요한 데이터는 보호 (auth-store, global-store)
    return !item.key.includes('auth-store') && 
           !item.key.includes('global-store');
  });

  for (const item of items) {
    if (cleanedSize >= targetCleanSize) {
      break;
    }

    try {
      window.localStorage.removeItem(item.key);
      cleanedSize += item.size;
      cleanedCount++;
    } catch (error) {
      console.warn(`[StorageOptimizer] 항목 제거 실패: ${item.key}`, error);
    }
  }

  return cleanedCount;
}

/**
 * 자동 정리 실행 (크기 기반)
 */
export function autoCleanup(): {
  cleaned: number;
  expired: number;
  usage: ReturnType<typeof getStorageUsage>;
} {
  const usage = getStorageUsage();
  let cleanedCount = 0;
  let expiredCount = 0;

  // 만료된 항목 정리
  expiredCount = cleanupExpiredItems();

  // 사용량이 임계값을 넘으면 크기 기반 정리
  if (usage.percentage > CLEANUP_THRESHOLD * 100) {
    const targetSize = MAX_STORAGE_SIZE * CLEANUP_THRESHOLD;
    cleanedCount = cleanupBySize(targetSize);
  }

  return {
    cleaned: cleanedCount,
    expired: expiredCount,
    usage: getStorageUsage()
  };
}

/**
 * 정기적인 정리 스케줄러 시작
 */
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

export function startAutoCleanup(): void {
  if (cleanupIntervalId) {
    return; // 이미 실행 중
  }

  // 즉시 한 번 실행
  autoCleanup();

  // 주기적으로 실행
  cleanupIntervalId = setInterval(() => {
    autoCleanup();
  }, CLEANUP_INTERVAL);
}

/**
 * 정기적인 정리 스케줄러 중지
 */
export function stopAutoCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * localStorage 저장 시도 (크기 체크 포함)
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const itemSize = getItemSize(key, value);
    const usage = getStorageUsage();

    // 새 항목을 추가하면 초과하는 경우
    if (usage.used + itemSize > MAX_STORAGE_SIZE) {
      // 자동 정리 시도
      autoCleanup();
      
      // 정리 후 다시 확인
      const newUsage = getStorageUsage();
      if (newUsage.used + itemSize > MAX_STORAGE_SIZE) {
        console.warn(`[StorageOptimizer] 저장소 공간 부족: ${key}`, {
          current: newUsage.used,
          required: itemSize,
          available: newUsage.available
        });
        return false;
      }
    }

    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // QuotaExceededError 처리
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[StorageOptimizer] 저장소 할당량 초과, 정리 시도:', error);
      autoCleanup();
      
      // 정리 후 재시도
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('[StorageOptimizer] 저장소 정리 후에도 저장 실패:', retryError);
        return false;
      }
    }
    
    console.error('[StorageOptimizer] 저장소 저장 실패:', error);
    return false;
  }
}

/**
 * 개발 모드에서 저장소 상태 로깅
 */
export function logStorageStatus(): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const usage = getStorageUsage();
  console.log('[StorageOptimizer] 저장소 사용량:', {
    used: `${(usage.used / 1024).toFixed(2)} KB`,
    available: `${(usage.available / 1024).toFixed(2)} KB`,
    percentage: `${usage.percentage.toFixed(2)}%`,
    items: usage.items.length,
    topItems: usage.items.slice(0, 5).map(item => ({
      key: item.key,
      size: `${(item.size / 1024).toFixed(2)} KB`
    }))
  });
}

/**
 * React Hook: localStorage 자동 정리
 * 컴포넌트 마운트 시 자동 정리를 시작하고, 언마운트 시 중지
 */
export function useStorageOptimizer(): void {
  useEffect(() => {
    // 브라우저 환경에서만 실행
    if (typeof window === 'undefined') {
      return;
    }

    // 자동 정리 시작
    startAutoCleanup();
    
    // 개발 모드에서 상태 로깅
    if (process.env.NODE_ENV === 'development') {
      logStorageStatus();
    }

    // 컴포넌트 언마운트 시 정리 중지
    return () => {
      stopAutoCleanup();
    };
  }, []); // 빈 의존성 배열: 마운트 시 한 번만 실행
}

