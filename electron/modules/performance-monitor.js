function startPerformanceMonitoring(mainWindow, evictLRUItems, nativeCache) {
  let consecutiveHighMemoryCount = 0;
  
  setInterval(() => {
    try {
      const stats = process.memoryUsage();
      const heapUsedMB = stats.heapUsed / 1024 / 1024;
      const heapTotalMB = stats.heapTotal / 1024 / 1024;
      const rssMB = stats.rss / 1024 / 1024;
      
      if (heapUsedMB > 150) {
        consecutiveHighMemoryCount++;
        console.warn(`⚠️ [Performance Monitor] 메모리 사용량 높음: ${heapUsedMB.toFixed(2)}MB`);
        
        if (consecutiveHighMemoryCount >= 3) {
          console.log('🧹 [Performance Monitor] 메모리 압박 감지, 강제 정리 시작...');
          
          if (nativeCache.size > 0) {
            const evictCount = Math.ceil(nativeCache.size * 0.3);
            evictLRUItems(evictCount);
          }
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.session.clearCache().catch(() => {});
          }
          
          if (global.gc) {
            global.gc();
          }
          
          consecutiveHighMemoryCount = 0;
        }
      } else {
        consecutiveHighMemoryCount = 0;
      }
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('performance-metrics', {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          rss: rssMB,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      // 성능 모니터링 실패는 무시
    }
  }, 5 * 60 * 1000); // 5분마다 체크
}

module.exports = {
  startPerformanceMonitoring,
};














