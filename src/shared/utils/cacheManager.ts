/**
 * 캐시 관리 유틸리티
 * 메모리 사용량 모니터링 및 캐시 정리 전략
 * 
 * Firestore의 IndexedDB Persistence를 활용한 캐시 관리
 */

// 메모리 사용량 추적
interface MemoryStats {
  estimatedSize: number; // 바이트
  lastCleanup: number;
}

class CacheManager {
  private memoryStats: MemoryStats = {
    estimatedSize: 0,
    lastCleanup: Date.now()
  };

  // 최대 캐시 크기 (100MB) - Firestore 설정과 동일
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024;
  
  // 캐시 정리 임계값 (80% 도달 시 경고)
  private readonly CLEANUP_THRESHOLD = this.MAX_CACHE_SIZE * 0.8;
  
  // 정리 주기 (30분)
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000;

  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private memoryCheckIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 초기화를 지연하여 모든 모듈이 로드된 후 실행
    if (typeof window !== 'undefined') {
      // 다음 이벤트 루프에서 초기화 (모든 모듈 로드 완료 후)
      setTimeout(() => {
        this.initialize();
      }, 1000); // 1초 지연으로 안전하게 초기화
    }
  }

  /**
   * 캐시 관리자 초기화
   */
  private initialize(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // 주기적 메모리 체크
      this.cleanupIntervalId = setInterval(() => {
        this.checkMemoryPressure();
      }, this.CLEANUP_INTERVAL);

      // 페이지 언로드 시 정리
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });

      // 메모리 압박 감지 (Chrome/Edge) - 5분마다 체크
      if ('memory' in performance) {
        this.memoryCheckIntervalId = setInterval(() => {
          this.checkMemoryPressure();
        }, 5 * 60 * 1000);
      }

      console.log('✅ [CacheManager] 캐시 관리자 초기화 완료');
    } catch (error) {
      console.error('❌ [CacheManager] 초기화 실패:', error);
    }
  }

  /**
   * 메모리 사용량 추정
   */
  async estimateMemoryUsage(): Promise<MemoryStats> {
    try {
      // 브라우저 메모리 정보 확인 (Chrome/Edge)
      if ('memory' in performance) {
        const memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        this.memoryStats.estimatedSize = memory.usedJSHeapSize;
      }

      return this.memoryStats;
    } catch (error) {
      // 메모리 체크 실패는 무시 (일부 브라우저에서 지원하지 않음)
      return this.memoryStats;
    }
  }

  /**
   * 캐시 정리 수행
   * Firestore는 자동으로 LRU(Least Recently Used) 방식으로 캐시를 관리합니다.
   * 여기서는 메모리 사용량만 모니터링합니다.
   */
  private async cleanup(): Promise<void> {
    try {
      console.log('🧹 [CacheManager] 메모리 상태 확인...');
      
      const stats = await this.estimateMemoryUsage();
      this.memoryStats.lastCleanup = Date.now();
      
      if (stats.estimatedSize > 0) {
        const sizeMB = (stats.estimatedSize / 1024 / 1024).toFixed(2);
        console.log(`💾 [CacheManager] 현재 메모리 사용량: ${sizeMB}MB`);
      }
    } catch (error) {
      console.error('❌ [CacheManager] 메모리 체크 실패:', error);
    }
  }

  /**
   * 메모리 압박 감지 및 대응
   */
  private async checkMemoryPressure(): Promise<void> {
    try {
      const stats = await this.estimateMemoryUsage();
      
      // 브라우저 메모리 정보 확인 (Chrome/Edge)
      if ('memory' in performance) {
        const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const usagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

        // 메모리 사용률이 80% 이상이면 경고
        if (usagePercent > 80) {
          console.warn(`⚠️ [CacheManager] 메모리 사용률 높음: ${usagePercent.toFixed(1)}% (${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB)`);
          console.warn('💡 [CacheManager] Firestore는 자동으로 캐시를 관리합니다. 필요시 브라우저를 새로고침하세요.');
        }
      }
    } catch (error) {
      // 메모리 체크 실패는 무시 (일부 브라우저에서 지원하지 않음)
    }
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): MemoryStats {
    return { ...this.memoryStats };
  }

  /**
   * 정리 (인터벌 정리)
   */
  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    if (this.memoryCheckIntervalId) {
      clearInterval(this.memoryCheckIntervalId);
      this.memoryCheckIntervalId = null;
    }
  }
}

// 싱글톤 인스턴스 (lazy initialization)
let cacheManagerInstance: CacheManager | null = null;

export const cacheManager = (() => {
  if (!cacheManagerInstance && typeof window !== 'undefined') {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
})();

