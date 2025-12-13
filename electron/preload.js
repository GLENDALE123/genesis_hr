const { contextBridge, ipcRenderer } = require('electron');

/**
 * 데이터 프리로드 및 네이티브 캐싱 (메모리 누수 방지)
 * 앱 시작 시 IndexedDB 캐시를 미리 메모리에 로드하여 빠른 접근 가능
 */
let preloadedDataCache = new Map();
let isPreloading = false;

// 메모리 누수 방지: 최대 캐시 크기 제한
const MAX_PRELOAD_CACHE_SIZE = 500; // 최대 500개 항목

// 오래된 캐시 정리 (LRU 방식)
function cleanupPreloadCache() {
  if (preloadedDataCache.size <= MAX_PRELOAD_CACHE_SIZE) {
    return;
  }

  // 가장 오래된 항목 제거 (Map은 삽입 순서 유지)
  const itemsToRemove = preloadedDataCache.size - MAX_PRELOAD_CACHE_SIZE;
  const keys = Array.from(preloadedDataCache.keys());
  for (let i = 0; i < itemsToRemove; i++) {
    preloadedDataCache.delete(keys[i]);
  }
}

/**
 * IndexedDB에서 캐시된 Firestore 데이터 프리로드
 * Preload 스크립트는 렌더러 프로세스에서 실행되므로 IndexedDB에 직접 접근 가능
 */
async function preloadFirestoreCache() {
  if (isPreloading) return;
  isPreloading = true;

  try {
    // IndexedDB는 비동기이므로 약간의 지연 후 접근
    // Firestore는 자동으로 IndexedDB에 캐시를 저장하므로,
    // 앱이 로드되면 이미 캐시가 준비되어 있을 것
    console.log('🔄 [Preload] Firestore 캐시 프리로드 시작...');

    // IndexedDB에서 직접 읽기는 복잡하므로,
    // 대신 메인 프로세스에 요청하여 네이티브 파일 시스템 캐시 활용
    const cacheData = await ipcRenderer.invoke('get-cached-data');
    if (cacheData) {
      // 메모리 제한 적용
      const entries = Object.entries(cacheData);
      const limitedEntries = entries.slice(0, MAX_PRELOAD_CACHE_SIZE);
      preloadedDataCache = new Map(limitedEntries);
      console.log(`✅ [Preload] ${preloadedDataCache.size}개 항목 프리로드 완료 (제한: ${MAX_PRELOAD_CACHE_SIZE})`);
    }
  } catch (error) {
    console.warn('⚠️ [Preload] 캐시 프리로드 실패 (무시 가능):', error.message);
  } finally {
    isPreloading = false;
  }
}

/**
 * 중요 데이터 프리로드 (인증 상태, 사용자 프로필 등)
 */
async function preloadCriticalData() {
  try {
    // 1. 인증 상태 확인 (이미 localStorage에서 로드됨)
    const authData = localStorage.getItem('auth-store');
    let userId = null;

    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        userId = parsed.state?.user?.uid || null;
      } catch (e) {
        // JSON 파싱 실패 무시
      }
    }

    // 2. 네이티브 파일 캐시 로드 (인증 상태와 무관하게 실행)
    await preloadFirestoreCache();

    // 3. IndexedDB 준비 대기 (Firebase 초기화 대기)
    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      try {
        await indexedDB.databases(); // IndexedDB 준비 확인
        console.log('✅ [Preload] IndexedDB 준비 완료');
      } catch (e) {
        console.warn('⚠️ [Preload] IndexedDB 확인 실패:', e.message);
      }
    }

    // 4. 프리로드 완료 표시
    if (typeof window !== 'undefined') {
      window.__PRELOAD_COMPLETE__ = true;
      console.log('✅ [Preload] 중요 데이터 프리로드 완료');
    }
  } catch (error) {
    console.warn('⚠️ [Preload] 중요 데이터 프리로드 실패:', error);
    // 실패해도 진행 (프리로드는 선택적)
    if (typeof window !== 'undefined') {
      window.__PRELOAD_COMPLETE__ = true;
    }
  }
}

// 앱 시작 시 즉시 프리로드 시작 (비동기, 블로킹 안 함)
// Preload 스크립트는 렌더러 프로세스 시작 전에 실행되므로,
// 가능한 한 빨리 시작하여 앱 로드 속도 향상
setImmediate(() => {
  preloadCriticalData();
});

// Electron API를 window.electron 객체로 노출
contextBridge.exposeInMainWorld('electron', {
  /**
   * IPC Renderer 노출 (electron-push-receiver용)
   */
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, listener) => {
      ipcRenderer.on(channel, listener);
      // 구독 해제 함수를 반환하여 메모리 누수 방지
      return () => ipcRenderer.removeListener(channel, listener);
    },
    removeListener: (channel, listener) => {
      ipcRenderer.removeListener(channel, listener);
    },
  },

  /**
   * 플랫폼 정보
   */
  platform: process.platform,

  /**
   * Electron 버전 정보
   */
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },

  /**
   * 알림 표시
   * @param {Object} options - 알림 옵션
   * @param {string} options.title - 알림 제목
   * @param {string} options.body - 알림 내용
   * @param {string} [options.icon] - 알림 아이콘 경로
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  showNotification: async (options) => {
    try {
      const result = await ipcRenderer.invoke('show-notification', options);
      return result;
    } catch (error) {
      console.error('❌ [Preload] 알림 표시 실패:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 개발 모드 여부
   */
  isDev: process.env.NODE_ENV === 'development',

  /**
   * 윈도우 컨트롤 함수들
   */
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    resize: (options) => ipcRenderer.invoke('window-resize', options),
    getSize: () => ipcRenderer.invoke('window-get-size'),
    captureScreenshot: async (mode) => {
      try {
        const result = await ipcRenderer.invoke('capture-screenshot', mode);
        return result;
      } catch (error) {
        console.error('❌ [Preload] 스크린샷 캡처 실패:', error);
        return { success: false, error: error.message };
      }
    },
    // 특정 요소 캡처 (요소 선택자 또는 요소 ID 전달)
    captureElement: async (elementSelector) => {
      try {
        const result = await ipcRenderer.invoke('capture-element', elementSelector);
        return result;
      } catch (error) {
        console.error('❌ [Preload] 요소 캡처 실패:', error);
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * 알림 클릭 시 네비게이션 이벤트 수신
   * @param {Function} callback - 링크를 받아서 처리할 콜백 함수
   */
  onNavigateTo: (callback) => {
    const listener = (event, link) => {
      callback(link);
    };
    ipcRenderer.on('navigate-to', listener);

    // 리스너 제거 함수 반환
    return () => {
      ipcRenderer.removeListener('navigate-to', listener);
    };
  },

  /**
   * 업데이트 관련 API
   */
  updater: {
    // 업데이트 체크
    checkForUpdates: async () => {
      try {
        const result = await ipcRenderer.invoke('check-for-updates');
        return result;
      } catch (error) {
        console.error('❌ [Preload] 업데이트 체크 실패:', error);
        return { success: false, error: error.message };
      }
    },

    // 업데이트 다운로드 시작
    downloadUpdate: async () => {
      try {
        const result = await ipcRenderer.invoke('download-update');
        return result;
      } catch (error) {
        console.error('❌ [Preload] 업데이트 다운로드 실패:', error);
        return { success: false, error: error.message };
      }
    },

    // 업데이트 설치 및 재시작
    installUpdate: async () => {
      try {
        const result = await ipcRenderer.invoke('install-update');
        return result;
      } catch (error) {
        console.error('❌ [Preload] 업데이트 설치 실패:', error);
        return { success: false, error: error.message };
      }
    },

    // 업데이트 이벤트 리스너
    onUpdateAvailable: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('update-available', listener);
      return () => ipcRenderer.removeListener('update-available', listener);
    },

    onUpdateDownloadProgress: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('update-download-progress', listener);
      return () => ipcRenderer.removeListener('update-download-progress', listener);
    },

    onUpdateDownloaded: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('update-downloaded', listener);
      return () => ipcRenderer.removeListener('update-downloaded', listener);
    },

    onUpdateError: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('update-error', listener);
      return () => ipcRenderer.removeListener('update-error', listener);
    },

    onUpdateNotAvailable: (callback) => {
      ipcRenderer.on('update-not-available', () => callback());
      return () => ipcRenderer.removeListener('update-not-available', () => { });
    },
  },

  /**
   * Firebase 최적화 API
   */
  firebase: {
    /**
     * Firestore 최적화 (캐시 프리로드 등)
     * @param {Object} options - 최적화 옵션
     * @returns {Promise<{success: boolean}>}
     */
    optimize: async (options) => {
      try {
        // Firestore 최적화는 렌더러 프로세스에서 직접 처리
        if (typeof window !== 'undefined' && window.firebaseOptimizer) {
          await window.firebaseOptimizer.optimize(options);
        }
        return { success: true };
      } catch (error) {
        console.error('❌ [Preload] Firebase 최적화 실패:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Storage 파일 캐시 가져오기
     * @param {string} url - Storage URL
     * @returns {Promise<string|null>} 캐시된 파일 경로 또는 null
     */
    getCachedStorageFile: async (url) => {
      try {
        const result = await ipcRenderer.invoke('get-cached-storage-file', url);
        return result;
      } catch (error) {
        console.error('❌ [Preload] Storage 캐시 읽기 실패:', error);
        return null;
      }
    },

    /**
     * Storage 파일 캐시 저장
     * @param {string} url - Storage URL
     * @param {string} filePath - 로컬 파일 경로
     * @returns {Promise<{success: boolean}>}
     */
    cacheStorageFile: async (url, filePath) => {
      try {
        const result = await ipcRenderer.invoke('cache-storage-file', url, filePath);
        return result;
      } catch (error) {
        console.error('❌ [Preload] Storage 캐시 저장 실패:', error);
        return { success: false, error: error.message };
      }
    },
  },

  /**
   * 네이티브 데이터 캐싱 API
   * 메모리 및 디스크 캐시 접근
   */
  cache: {
    /**
     * 프리로드된 데이터 가져오기 (메모리 캐시)
     * @param {string} key - 캐시 키
     * @returns {any|null} 캐시된 데이터 또는 null
     */
    getPreloaded: (key) => {
      return preloadedDataCache.get(key) || null;
    },

    /**
     * 모든 프리로드된 데이터 가져오기
     * @returns {Object} 캐시된 데이터 맵
     */
    getAllPreloaded: () => {
      return Object.fromEntries(preloadedDataCache);
    },

    /**
     * 네이티브 파일 시스템 캐시 저장
     * @param {string} key - 캐시 키
     * @param {any} data - 저장할 데이터
     * @param {Object} [options] - 캐시 옵션
     * @param {number} [options.ttl] - TTL (밀리초, 기본값: 7일)
     * @returns {Promise<{success: boolean}>}
     */
    setNative: async (key, data, options = {}) => {
      try {
        const result = await ipcRenderer.invoke('set-cached-data', key, data, options);

        // 메모리 캐시에도 저장 (크기 제한 적용)
        if (preloadedDataCache.size >= MAX_PRELOAD_CACHE_SIZE) {
          cleanupPreloadCache();
        }
        preloadedDataCache.set(key, data);

        return result;
      } catch (error) {
        console.error('❌ [Preload] 네이티브 캐시 저장 실패:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * 네이티브 파일 시스템 캐시 읽기
     * @param {string} key - 캐시 키
     * @returns {Promise<any|null>} 캐시된 데이터 또는 null
     */
    getNative: async (key) => {
      try {
        // 먼저 메모리 캐시 확인
        const memoryCache = preloadedDataCache.get(key);
        if (memoryCache) {
          return memoryCache;
        }

        // 메모리에 없으면 네이티브 캐시에서 읽기
        const result = await ipcRenderer.invoke('get-cached-data', key);
        if (result) {
          preloadedDataCache.set(key, result);
        }
        return result;
      } catch (error) {
        console.error('❌ [Preload] 네이티브 캐시 읽기 실패:', error);
        return null;
      }
    },

    /**
     * 네이티브 파일 시스템 캐시 삭제
     * @param {string} key - 캐시 키
     * @returns {Promise<{success: boolean}>}
     */
    deleteNative: async (key) => {
      try {
        const result = await ipcRenderer.invoke('delete-cached-data', key);
        preloadedDataCache.delete(key);
        return result;
      } catch (error) {
        console.error('❌ [Preload] 네이티브 캐시 삭제 실패:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * 네이티브 파일 시스템 캐시 전체 삭제
     * @returns {Promise<{success: boolean}>}
     */
    clearNative: async () => {
      try {
        const result = await ipcRenderer.invoke('clear-cached-data');
        preloadedDataCache.clear();
        return result;
      } catch (error) {
        console.error('❌ [Preload] 네이티브 캐시 전체 삭제 실패:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * 캐시 통계 조회
     * @returns {Promise<Object|null>} 캐시 통계 정보
     */
    getStats: async () => {
      try {
        const stats = await ipcRenderer.invoke('get-cache-stats');
        return stats;
      } catch (error) {
        console.error('❌ [Preload] 캐시 통계 조회 실패:', error);
        return null;
      }
    },
  },

});

// 주기적으로 프리로드 캐시 정리 (10분마다)
setInterval(() => {
  cleanupPreloadCache();
}, 10 * 60 * 1000);

// Electron 환경임을 직접 window 객체에 추가 (contextBridge로는 불가능)
// eslint-disable-next-line no-undef
if (typeof window !== 'undefined') {
  window.__ELECTRON__ = true;
}
