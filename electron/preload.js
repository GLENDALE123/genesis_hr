const { contextBridge, ipcRenderer } = require('electron');
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
      return () => ipcRenderer.removeListener('update-not-available', () => {});
    },
  },
});

// Electron 환경임을 직접 window 객체에 추가 (contextBridge로는 불가능)
// eslint-disable-next-line no-undef
if (typeof window !== 'undefined') {
  window.__ELECTRON__ = true;
}
