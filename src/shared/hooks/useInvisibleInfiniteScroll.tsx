/**
 * 투명한 무한 스크롤 훅
 * 
 * 사용자가 로드 과정을 전혀 느끼지 못하도록 자연스럽게 미리 로드
 * - Intersection Observer로 뷰포트 하단 80% 지점 감지
 * - 로딩 인디케이터 완전 제거
 * - IndexedDB 캐시에서 즉시 표시 후 백그라운드 동기화
 */

import React, { useEffect, useRef, useCallback, RefObject } from 'react';
// import { createIntersectionOptions } from '@/shared/utils/scrollOptimizer';
const createIntersectionOptions = (rootMargin?: string, threshold?: number) => ({
  root: null,
  rootMargin: rootMargin || '0px',
  threshold: threshold || 0.1,
});

interface UseInvisibleInfiniteScrollOptions {
  /**
   * 다음 페이지 로드 함수
   */
  loadNextPage: () => Promise<void>;

  /**
   * 더 이상 로드할 데이터가 있는지
   */
  hasMore: boolean;

  /**
   * 로딩 중인지
   */
  isLoading: boolean;

  /**
   * 프리로딩 트리거 지점 (기본: 80% = 하단 20% 지점)
   */
  rootMargin?: string;

  /**
   * 활성화 여부
   */
  enabled?: boolean;
}

interface UseInvisibleInfiniteScrollReturn {
  /**
   * 스크롤 감지를 위한 ref
   */
  sentinelRef: RefObject<HTMLDivElement | null>;
}

/**
 * 투명한 무한 스크롤 훅
 * 
 * 사용자가 로드 과정을 전혀 느끼지 못하도록 자연스럽게 미리 로드
 */
export function useInvisibleInfiniteScroll(
  options: UseInvisibleInfiniteScrollOptions
): UseInvisibleInfiniteScrollReturn {
  const {
    loadNextPage,
    hasMore,
    isLoading,
    rootMargin = '0px 0px 20% 0px', // 하단 20% 지점에서 트리거
    enabled = true
  } = options;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  /**
   * 다음 페이지 로드 (중복 방지)
   */
  const handleLoadNext = useCallback(async () => {
    if (loadingRef.current || isLoading || !hasMore) {
      return;
    }

    loadingRef.current = true;

    try {
      await loadNextPage();
    } catch (error) {
      console.error('다음 페이지 로드 실패:', error);
    } finally {
      loadingRef.current = false;
    }
  }, [loadNextPage, hasMore, isLoading]);

  /**
   * Intersection Observer 설정
   */
  useEffect(() => {
    if (!enabled || !sentinelRef.current) {
      return;
    }

    const observerOptions = createIntersectionOptions(rootMargin, 0.1);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // 뷰포트에 들어왔고, 더 로드할 데이터가 있고, 로딩 중이 아니면
          if (entry.isIntersecting && hasMore && !isLoading && !loadingRef.current) {
            handleLoadNext();
          }
        });
      },
      observerOptions
    );

    const currentSentinel = sentinelRef.current;
    observerRef.current.observe(currentSentinel);

    return () => {
      if (observerRef.current && currentSentinel) {
        observerRef.current.unobserve(currentSentinel);
      }
      observerRef.current = null;
    };
  }, [enabled, hasMore, isLoading, rootMargin, handleLoadNext]);

  return {
    sentinelRef
  };
}

/**
 * 스크롤 컨테이너용 투명 센티넬 컴포넌트
 */
export const InvisibleScrollSentinel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        style={{
          height: '1px',
          width: '100%',
          pointerEvents: 'none',
          visibility: 'hidden'
        }}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

InvisibleScrollSentinel.displayName = 'InvisibleScrollSentinel';

