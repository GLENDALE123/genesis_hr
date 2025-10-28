const { ipcMain, BrowserWindow, clipboard, desktopCapturer, screen, nativeImage } = require('electron');

/**
 * IPC 핸들러 등록
 * 렌더러 프로세스에서 메인 프로세스 기능 호출
 */

module.exports = function registerIpcHandlers() {
  // 윈도우 최소화
  ipcMain.on('window-minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.minimize();
    }
  });

  // 윈도우 최대화/복원 토글
  ipcMain.on('window-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  // 윈도우 닫기
  ipcMain.on('window-close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.close();
    }
  });

  // 윈도우 상태 확인
  ipcMain.handle('window-is-maximized', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMaximized() : false;
  });

  // 윈도우 크기 조정 (로그인 페이지용)
  ipcMain.handle('window-resize', (event, { width, height, center = true }) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.setSize(width, height, true);
      if (center) {
        window.center();
      }
      return { success: true };
    }
    return { success: false };
  });

  // 윈도우 크기 가져오기
  ipcMain.handle('window-get-size', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      const [width, height] = window.getSize();
      return { width, height };
    }
    return null;
  });

  // 스크린샷 캡처 (클립보드에 복사)
  ipcMain.handle('capture-screenshot', async (event, mode = 'window') => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found' };
      }

      let image;
      
      if (mode === 'window') {
        // 현재 윈도우만 캡처
        image = await window.capturePage();
      } else if (mode === 'area') {
        // 영역 선택 모드 - 렌더러에서 캡처 후 base64 데이터를 받아서 처리
        return new Promise((resolve) => {
          // 렌더러에서 캡처 요청
          window.webContents.send('request-region-screenshot');
          
          // 렌더러로부터 캡처 결과를 받을 핸들러 등록
          const handler = (event, data) => {
            if (event.sender === window.webContents) {
              ipcMain.removeListener('region-screenshot-result', handler);
              
              if (data && data.base64) {
                try {
                  const image = nativeImage.createFromDataURL(`data:image/png;base64,${data.base64}`);
                  clipboard.writeImage(image);
                  resolve({ success: true });
                } catch (error) {
                  resolve({ success: false, error: error.message });
                }
              } else if (data && data.canceled) {
                resolve({ success: false, canceled: true });
              } else {
                resolve({ success: false, error: 'Failed to capture region' });
              }
            }
          };
          
          ipcMain.on('region-screenshot-result', handler);
          
          // 타임아웃 처리 (5초 후 자동 취소)
          setTimeout(() => {
            ipcMain.removeListener('region-screenshot-result', handler);
            resolve({ success: false, canceled: true });
          }, 5000);
        });
      } else {
        // 기본값: 현재 윈도우
        image = await window.capturePage();
      }

      // 클립보드에 이미지 복사
      if (image) {
        clipboard.writeImage(image);
      } else {
        return { success: false, error: 'Failed to capture image' };
      }

      return { success: true };
    } catch (error) {
      console.error('스크린샷 캡처 오류:', error);
      return { success: false, error: error.message };
    }
  });
};

