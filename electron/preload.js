const { contextBridge, ipcRenderer } = require('electron');

/**
 * Electron Preload 스크립트
 * 
 * contextBridge를 통해 안전하게 Electron API를 웹 페이지에 노출합니다.
 * 보안을 위해 필요한 API만 제한적으로 노출합니다.
 */

console.log('🔐 [Preload] 스크립트 로드됨');

// Electron API를 window.electron 객체로 노출
contextBridge.exposeInMainWorld('electron', {
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
      console.log('🔔 [Preload] 알림 요청:', options);
      const result = await ipcRenderer.invoke('show-notification', options);
      console.log('✅ [Preload] 알림 표시 완료:', result);
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
  },

  /**
   * 알림 클릭 시 네비게이션 이벤트 수신
   * @param {Function} callback - 링크를 받아서 처리할 콜백 함수
   */
  onNavigateTo: (callback) => {
    const listener = (event, link) => {
      console.log('🔗 [Preload] navigate-to 이벤트 수신:', link);
      callback(link);
    };
    ipcRenderer.on('navigate-to', listener);
    
    // 리스너 제거 함수 반환
    return () => {
      ipcRenderer.removeListener('navigate-to', listener);
    };
  },
});

// Electron 환경임을 표시
contextBridge.exposeInMainWorld('__ELECTRON__', true);

console.log('✅ [Preload] Electron API 노출 완료');
console.log('📱 [Preload] 플랫폼:', process.platform);
console.log('🖥️ [Preload] Electron 버전:', process.versions.electron);

