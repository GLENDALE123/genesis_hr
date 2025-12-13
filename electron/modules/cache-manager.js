const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 네이티브 파일 시스템 캐시 관리 (메모리 누수 방지 및 자동 정리)
 */
const CACHE_DIR = path.join(app.getPath('userData'), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'data-cache.json');
const CACHE_STATS_FILE = path.join(CACHE_DIR, 'cache-stats.json');

const CACHE_CONFIG = {
  MAX_SIZE: 500,
  MAX_MEMORY_MB: 30,
  MAX_DISK_MB: 100,
  DEFAULT_TTL: 3 * 24 * 60 * 60 * 1000,
  CLEANUP_INTERVAL: 30 * 60 * 1000,
  SAVE_INTERVAL: 10 * 60 * 1000,
};

let nativeCache = new Map();
let cacheStats = {
  totalItems: 0,
  totalSize: 0,
  hitCount: 0,
  missCount: 0,
  evictionCount: 0,
  lastCleanup: Date.now(),
};

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function estimateCacheItemSize(key, value) {
  try {
    const keySize = Buffer.byteLength(key, 'utf-8');
    const valueSize = Buffer.byteLength(JSON.stringify(value), 'utf-8');
    return keySize + valueSize + 100;
  } catch {
    return 1024;
  }
}

function loadCacheStats() {
  try {
    if (fs.existsSync(CACHE_STATS_FILE)) {
      const data = fs.readFileSync(CACHE_STATS_FILE, 'utf-8');
      cacheStats = { ...cacheStats, ...JSON.parse(data) };
    }
  } catch (error) {
    console.warn('⚠️ [Cache Manager] 캐시 통계 로드 실패:', error.message);
  }
}

function saveCacheStats() {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_STATS_FILE, JSON.stringify(cacheStats, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ [Cache Manager] 캐시 통계 저장 실패:', error);
  }
}

function loadNativeCache() {
  try {
    ensureCacheDir();
    loadCacheStats();
    
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const now = Date.now();
      let loadedCount = 0;
      let expiredCount = 0;
      
      for (const [key, item] of Object.entries(parsed)) {
        if (item && typeof item === 'object' && item.timestamp) {
          const age = now - item.timestamp;
          const ttl = item.ttl || CACHE_CONFIG.DEFAULT_TTL;
          
          if (age < ttl) {
            nativeCache.set(key, item);
            loadedCount++;
          } else {
            expiredCount++;
          }
        } else {
          nativeCache.set(key, {
            data: item,
            timestamp: now,
            accessCount: 0,
            lastAccess: now,
            ttl: CACHE_CONFIG.DEFAULT_TTL,
          });
          loadedCount++;
        }
      }
      
      cacheStats.totalItems = nativeCache.size;
      console.log(`✅ [Cache Manager] 네이티브 캐시 로드 완료: ${loadedCount}개 항목 (만료: ${expiredCount}개)`);
      
      if (expiredCount > 0) {
        saveNativeCache();
      }
    }
  } catch (error) {
    console.warn('⚠️ [Cache Manager] 캐시 로드 실패:', error.message);
    nativeCache = new Map();
  }
}

function saveNativeCache() {
  try {
    ensureCacheDir();
    const data = {};
    let totalSize = 0;
    
    for (const [key, item] of nativeCache.entries()) {
      data[key] = item;
      totalSize += estimateCacheItemSize(key, item);
    }
    
    cacheStats.totalSize = totalSize;
    cacheStats.totalItems = nativeCache.size;
    
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    saveCacheStats();
  } catch (error) {
    console.error('❌ [Cache Manager] 캐시 저장 실패:', error);
  }
}

function evictLRUItems(count = 10) {
  const items = Array.from(nativeCache.entries())
    .map(([key, item]) => ({
      key,
      lastAccess: item.lastAccess || item.timestamp || 0,
      accessCount: item.accessCount || 0,
    }))
    .sort((a, b) => {
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      return a.lastAccess - b.lastAccess;
    });
  
  let evicted = 0;
  for (let i = 0; i < Math.min(count, items.length); i++) {
    nativeCache.delete(items[i].key);
    evicted++;
  }
  
  cacheStats.evictionCount += evicted;
  return evicted;
}

function checkDiskCacheSize() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return;
    }
    
    const stats = fs.statSync(CACHE_FILE);
    const fileSizeMB = stats.size / 1024 / 1024;
    
    if (fileSizeMB > CACHE_CONFIG.MAX_DISK_MB) {
      console.warn(`⚠️ [Cache Manager] 디스크 캐시 크기 초과: ${fileSizeMB.toFixed(2)}MB > ${CACHE_CONFIG.MAX_DISK_MB}MB`);
      
      const items = Array.from(nativeCache.entries())
        .map(([key, item]) => ({
          key,
          timestamp: item.timestamp || 0,
          size: estimateCacheItemSize(key, item),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      let removedSize = 0;
      const targetSize = CACHE_CONFIG.MAX_DISK_MB * 0.7 * 1024 * 1024;
      
      for (const item of items) {
        if (removedSize >= targetSize) break;
        nativeCache.delete(item.key);
        removedSize += item.size;
      }
      
      console.log(`🧹 [Cache Manager] 디스크 캐시 정리 완료: ${(removedSize / 1024 / 1024).toFixed(2)}MB 제거`);
    }
  } catch (error) {
    console.warn('⚠️ [Cache Manager] 디스크 캐시 크기 확인 실패:', error.message);
  }
}

function cleanupExpiredCache() {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, item] of nativeCache.entries()) {
    if (item && item.timestamp) {
      const age = now - item.timestamp;
      const ttl = item.ttl || CACHE_CONFIG.DEFAULT_TTL;
      
      if (age >= ttl) {
        nativeCache.delete(key);
        expiredCount++;
      }
    }
  }
  
  if (expiredCount > 0) {
    console.log(`🧹 [Cache Manager] 만료된 캐시 ${expiredCount}개 정리 완료`);
  }
  
  if (nativeCache.size > CACHE_CONFIG.MAX_SIZE) {
    const excess = nativeCache.size - CACHE_CONFIG.MAX_SIZE;
    const evicted = evictLRUItems(excess);
    console.log(`🧹 [Cache Manager] LRU 캐시 ${evicted}개 정리 완료`);
  }
  
  checkDiskCacheSize();
  cacheStats.lastCleanup = now;
  saveNativeCache();
}

function checkMemoryUsage(mainWindow) {
  try {
    const stats = process.memoryUsage();
    const heapUsedMB = stats.heapUsed / 1024 / 1024;
    const heapTotalMB = stats.heapTotal / 1024 / 1024;
    const rssMB = stats.rss / 1024 / 1024;
    
    if (heapUsedMB > CACHE_CONFIG.MAX_MEMORY_MB) {
      console.warn(`⚠️ [Cache Manager] 메모리 사용량 높음: ${heapUsedMB.toFixed(2)}MB`);
      
      const usageRatio = heapUsedMB / CACHE_CONFIG.MAX_MEMORY_MB;
      let evictRatio = 0.2;
      
      if (usageRatio > 1.5) {
        evictRatio = 0.5;
      } else if (usageRatio > 1.2) {
        evictRatio = 0.3;
      }
      
      const evictCount = Math.ceil(nativeCache.size * evictRatio);
      evictLRUItems(evictCount);
      console.log(`🧹 [Cache Manager] 메모리 압박으로 캐시 ${evictCount}개 정리`);
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.session.clearCache().catch(() => {});
      }
    }
  } catch (error) {
    // 메모리 체크 실패는 무시
  }
}

// IPC 핸들러
function setupCacheIpcHandlers(ipcMain) {
  ipcMain.handle('get-cached-data', async (event, key) => {
    try {
      if (key) {
        const item = nativeCache.get(key);
        if (!item) {
          cacheStats.missCount++;
          return null;
        }
        
        const now = Date.now();
        const age = now - item.timestamp;
        const ttl = item.ttl || CACHE_CONFIG.DEFAULT_TTL;
        
        if (age >= ttl) {
          nativeCache.delete(key);
          cacheStats.missCount++;
          return null;
        }
        
        item.lastAccess = now;
        item.accessCount = (item.accessCount || 0) + 1;
        nativeCache.set(key, item);
        cacheStats.hitCount++;
        return item.data;
      } else {
        const result = {};
        for (const [k, item] of nativeCache.entries()) {
          result[k] = item.data;
        }
        return result;
      }
    } catch (error) {
      console.error('❌ [Cache Manager] 캐시 읽기 실패:', error);
      cacheStats.missCount++;
      return null;
    }
  });

  ipcMain.handle('set-cached-data', async (event, key, data, options = {}) => {
    try {
      if (nativeCache.size >= CACHE_CONFIG.MAX_SIZE) {
        evictLRUItems(10);
      }
      
      const now = Date.now();
      const item = {
        data,
        timestamp: now,
        lastAccess: now,
        accessCount: 0,
        ttl: options.ttl || CACHE_CONFIG.DEFAULT_TTL,
      };
      
      nativeCache.set(key, item);
      
      setImmediate(() => {
        saveNativeCache();
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ [Cache Manager] 캐시 저장 실패:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-cached-data', async (event, key) => {
    try {
      const deleted = nativeCache.delete(key);
      if (deleted) {
        setImmediate(() => {
          saveNativeCache();
        });
      }
      return { success: true, deleted };
    } catch (error) {
      console.error('❌ [Cache Manager] 캐시 삭제 실패:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clear-cached-data', async (event) => {
    try {
      nativeCache.clear();
      cacheStats.totalItems = 0;
      cacheStats.totalSize = 0;
      
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
      }
      if (fs.existsSync(CACHE_STATS_FILE)) {
        fs.unlinkSync(CACHE_STATS_FILE);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ [Cache Manager] 캐시 전체 삭제 실패:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-cache-stats', async (event) => {
    try {
      const stats = process.memoryUsage();
      return {
        ...cacheStats,
        cacheSize: nativeCache.size,
        memoryUsage: {
          heapUsed: Math.round(stats.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(stats.heapTotal / 1024 / 1024 * 100) / 100,
          rss: Math.round(stats.rss / 1024 / 1024 * 100) / 100,
        },
        hitRate: cacheStats.hitCount + cacheStats.missCount > 0
          ? Math.round((cacheStats.hitCount / (cacheStats.hitCount + cacheStats.missCount)) * 100 * 100) / 100
          : 0,
      };
    } catch (error) {
      console.error('❌ [Cache Manager] 캐시 통계 조회 실패:', error);
      return null;
    }
  });
}

// 정기 작업 설정
function setupCachePeriodicTasks(mainWindow) {
  setInterval(() => {
    saveNativeCache();
  }, CACHE_CONFIG.SAVE_INTERVAL);

  setInterval(() => {
    cleanupExpiredCache();
    checkMemoryUsage(mainWindow);
  }, CACHE_CONFIG.CLEANUP_INTERVAL);
}

module.exports = {
  loadNativeCache,
  saveNativeCache,
  cleanupExpiredCache,
  checkMemoryUsage,
  setupCacheIpcHandlers,
  setupCachePeriodicTasks,
  evictLRUItems,
  getCache: () => nativeCache,
  getCacheStats: () => cacheStats,
};





















