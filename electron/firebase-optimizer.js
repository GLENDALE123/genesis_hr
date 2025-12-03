/**
 * Firebase Firestore & Storage 일렉트론 최적화
 * 네트워크 상태 모니터링, 오프라인 모드 관리, 캐시 최적화
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

/**
 * Firebase 최적화 설정
 */
const FIREBASE_OPTIMIZATION_CONFIG = {
  // Storage 캐시 디렉토리
  STORAGE_CACHE_DIR: path.join(app.getPath('userData'), 'storage-cache'),
  // Firestore 캐시 프리로드 설정
  PRELOAD_COLLECTIONS: [
    'users',
    'products',
    'work-schedules',
  ],
  // 네트워크 재연결 대기 시간 (ms)
  RECONNECT_DELAY: 2000,
  // 오프라인 모드 전환 임계값 (연결 실패 횟수)
  OFFLINE_THRESHOLD: 3,
};

// Storage 캐시 디렉토리 생성
function ensureStorageCacheDir() {
  if (!fs.existsSync(FIREBASE_OPTIMIZATION_CONFIG.STORAGE_CACHE_DIR)) {
    fs.mkdirSync(FIREBASE_OPTIMIZATION_CONFIG.STORAGE_CACHE_DIR, { recursive: true });
  }
}

/**
 * 네트워크 상태 모니터링 및 Firestore 오프라인 모드 관리
 */
class FirebaseOptimizer {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.isOnline = true;
    this.connectionFailures = 0;
    this.reconnectTimer = null;
    this.storageCache = new Map();
    
    ensureStorageCacheDir();
    this.initialize();
  }

  /**
   * 초기화
   */
  initialize() {
    // 네트워크 상태 모니터링 시작
    this.startNetworkMonitoring();
    
    // Storage 캐시 로드
    this.loadStorageCache();
    
    console.log('✅ [Firebase Optimizer] 초기화 완료');
  }

  /**
   * 네트워크 상태 모니터링 시작
   */
  startNetworkMonitoring() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // 네트워크 상태 체크 (주기적)
    setInterval(() => {
      this.checkNetworkStatus();
    }, 5000); // 5초마다 체크

    // 윈도우가 준비되면 Firestore 최적화 명령 전송
    this.mainWindow.webContents.on('did-finish-load', () => {
      this.optimizeFirestore();
    });
  }

  /**
   * 네트워크 상태 확인
   */
  async checkNetworkStatus() {
    return new Promise((resolve) => {
      try {
        // 간단한 네트워크 체크 (Firebase 도메인)
        const testUrl = 'https://firebase.googleapis.com';
        const url = new URL(testUrl);
        const client = https;
        
        const req = client.request({
          hostname: url.hostname,
          port: url.port || 443,
          path: '/',
          method: 'HEAD',
          timeout: 3000,
        }, (res) => {
          const wasOnline = this.isOnline;
          this.isOnline = true;
          this.connectionFailures = 0;

          // 오프라인에서 온라인으로 전환
          if (!wasOnline) {
            console.log('✅ [Firebase Optimizer] 네트워크 연결 복구');
            this.onNetworkReconnected();
          }
          resolve();
        });

        req.on('error', () => {
          this.connectionFailures++;
          const wasOnline = this.isOnline;
          
          // 연결 실패 임계값 초과 시 오프라인 모드로 전환
          if (this.connectionFailures >= FIREBASE_OPTIMIZATION_CONFIG.OFFLINE_THRESHOLD) {
            this.isOnline = false;
            
            if (wasOnline) {
              console.warn('⚠️ [Firebase Optimizer] 네트워크 연결 끊김, 오프라인 모드 전환');
              this.onNetworkDisconnected();
            }
          }
          resolve();
        });

        req.on('timeout', () => {
          req.destroy();
          this.connectionFailures++;
          const wasOnline = this.isOnline;
          
          if (this.connectionFailures >= FIREBASE_OPTIMIZATION_CONFIG.OFFLINE_THRESHOLD) {
            this.isOnline = false;
            
            if (wasOnline) {
              console.warn('⚠️ [Firebase Optimizer] 네트워크 연결 끊김, 오프라인 모드 전환');
              this.onNetworkDisconnected();
            }
          }
          resolve();
        });

        req.end();
      } catch (error) {
        this.connectionFailures++;
        resolve();
      }
    });
  }

  /**
   * 네트워크 연결 끊김 처리
   */
  onNetworkDisconnected() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // Firestore 오프라인 모드 활성화
    this.mainWindow.webContents.executeJavaScript(`
      (async () => {
        try {
          const { db } = await import('/src/shared/services/firebase/config.ts');
          const { disableNetwork } = await import('firebase/firestore');
          if (db) {
            await disableNetwork(db);
            console.log('✅ [Firebase] 오프라인 모드 활성화');
          }
        } catch (error) {
          console.error('❌ [Firebase] 오프라인 모드 전환 실패:', error);
        }
      })();
    `).catch(() => {});
  }

  /**
   * 네트워크 재연결 처리
   */
  onNetworkReconnected() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // 재연결 대기 후 Firestore 온라인 모드 활성화
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.mainWindow.webContents.executeJavaScript(`
        (async () => {
          try {
            const { db } = await import('/src/shared/services/firebase/config.ts');
            const { enableNetwork } = await import('firebase/firestore');
            if (db) {
              await enableNetwork(db);
              console.log('✅ [Firebase] 온라인 모드 활성화, 동기화 시작');
            }
          } catch (error) {
            console.error('❌ [Firebase] 온라인 모드 전환 실패:', error);
          }
        })();
      `).catch(() => {});
    }, FIREBASE_OPTIMIZATION_CONFIG.RECONNECT_DELAY);
  }

  /**
   * Firestore 최적화 (캐시 프리로드 등)
   */
  optimizeFirestore() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    // Firestore 캐시 최적화 명령 전송
    this.mainWindow.webContents.send('firebase-optimize', {
      preloadCollections: FIREBASE_OPTIMIZATION_CONFIG.PRELOAD_COLLECTIONS,
      cacheSize: 100 * 1024 * 1024, // 100MB
    });
  }

  /**
   * Storage 파일 캐시 저장
   */
  cacheStorageFile(url, filePath) {
    try {
      const cacheKey = this.getStorageCacheKey(url);
      this.storageCache.set(cacheKey, {
        url,
        filePath,
        timestamp: Date.now(),
        size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
      });
      
      // 캐시 메타데이터 저장
      this.saveStorageCache();
    } catch (error) {
      console.error('❌ [Firebase Optimizer] Storage 캐시 저장 실패:', error);
    }
  }

  /**
   * Storage 파일 캐시에서 가져오기
   */
  getCachedStorageFile(url) {
    const cacheKey = this.getStorageCacheKey(url);
    const cached = this.storageCache.get(cacheKey);
    
    if (cached && fs.existsSync(cached.filePath)) {
      // 캐시 만료 확인 (7일)
      const age = Date.now() - cached.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      
      if (age < maxAge) {
        return cached.filePath;
      } else {
        // 만료된 캐시 삭제
        this.storageCache.delete(cacheKey);
        try {
          if (fs.existsSync(cached.filePath)) {
            fs.unlinkSync(cached.filePath);
          }
        } catch {}
      }
    }
    
    return null;
  }

  /**
   * Storage 캐시 키 생성
   */
  getStorageCacheKey(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/\//g, '_');
    } catch {
      return Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '_');
    }
  }

  /**
   * Storage 캐시 로드
   */
  loadStorageCache() {
    try {
      const cacheFile = path.join(
        FIREBASE_OPTIMIZATION_CONFIG.STORAGE_CACHE_DIR,
        'cache-metadata.json'
      );
      
      if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile, 'utf-8');
        const parsed = JSON.parse(data);
        this.storageCache = new Map(Object.entries(parsed));
        console.log(`✅ [Firebase Optimizer] Storage 캐시 로드: ${this.storageCache.size}개 항목`);
      }
    } catch (error) {
      console.warn('⚠️ [Firebase Optimizer] Storage 캐시 로드 실패:', error.message);
      this.storageCache = new Map();
    }
  }

  /**
   * Storage 캐시 저장
   */
  saveStorageCache() {
    try {
      ensureStorageCacheDir();
      const cacheFile = path.join(
        FIREBASE_OPTIMIZATION_CONFIG.STORAGE_CACHE_DIR,
        'cache-metadata.json'
      );
      
      const data = Object.fromEntries(this.storageCache);
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('❌ [Firebase Optimizer] Storage 캐시 저장 실패:', error);
    }
  }

  /**
   * Storage 캐시 정리 (오래된 파일 삭제)
   */
  cleanupStorageCache() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
    let cleanedCount = 0;

    for (const [key, cached] of this.storageCache.entries()) {
      const age = now - cached.timestamp;
      
      if (age >= maxAge) {
        try {
          if (fs.existsSync(cached.filePath)) {
            fs.unlinkSync(cached.filePath);
          }
        } catch {}
        
        this.storageCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [Firebase Optimizer] Storage 캐시 ${cleanedCount}개 정리`);
      this.saveStorageCache();
    }
  }

  /**
   * 정리
   */
  destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.saveStorageCache();
  }
}

module.exports = { FirebaseOptimizer, FIREBASE_OPTIMIZATION_CONFIG };

