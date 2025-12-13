/**
 * Product Detail 로컬 캐시 서비스
 * 같은 제품 상세 정보를 다시 열 때 재조회 방지
 */

import { ProductDetail } from '@/features/production/products/types';

const CACHE_TTL = 5 * 60 * 1000; // 5분

interface CacheEntry {
  detail: ProductDetail;
  timestamp: number;
}

// 메모리 캐시 (productId별로 저장)
const memoryCache = new Map<string, CacheEntry>();

/**
 * 제품 상세 정보를 캐시에 저장
 */
export function cacheProductDetail(productId: string, detail: ProductDetail): void {
  memoryCache.set(productId, {
    detail,
    timestamp: Date.now()
  });
}

/**
 * 캐시에서 제품 상세 정보 읽기
 */
export function getCachedProductDetail(productId: string): ProductDetail | null {
  const entry = memoryCache.get(productId);
  
  if (!entry) {
    return null;
  }
  
  // TTL 확인
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    memoryCache.delete(productId);
    return null;
  }
  
  return entry.detail;
}

/**
 * 특정 제품의 캐시 무효화
 */
export function invalidateProductDetailCache(productId: string): void {
  memoryCache.delete(productId);
}

/**
 * 모든 제품 상세 캐시 무효화
 */
export function clearProductDetailCache(): void {
  memoryCache.clear();
}

/**
 * 만료된 캐시 정리
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [productId, entry] of memoryCache.entries()) {
    const age = now - entry.timestamp;
    if (age > CACHE_TTL) {
      memoryCache.delete(productId);
    }
  }
}

// 주기적으로 만료된 캐시 정리 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}





