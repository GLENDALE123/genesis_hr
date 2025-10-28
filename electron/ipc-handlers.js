const { ipcMain, BrowserWindow, clipboard, desktopCapturer, screen } = require('electron');

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
        // 영역 선택 모드 - 사용자가 영역 선택 창 열기
        // 이 모드는 별도 UI로 처리되어야 하므로 임시로 전체 화면 캡처
        return { success: false, error: 'Please use area selection UI' };
      } else if (mode === 'select') {
        // 전체 화면 캡처
        // 현재 윈도우 숨기기
        window.hide();
        
        // 잠시 대기 (윈도우가 완전히 숨겨지도록)
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 전체 화면 캡처를 위한 임시 윈도우 생성
        const { size } = screen.getPrimaryDisplay();
        const tempWindow = new BrowserWindow({
          width: size.width,
          height: size.height,
          frame: false,
          transparent: true,
          skipTaskbar: true,
          focusable: false
        });
        
        // 화면 전체 영역 설정
        tempWindow.setBounds({ x: 0, y: 0, width: size.width, height: size.height });
        
        // 캡처
        await new Promise(resolve => setTimeout(resolve, 100));
        image = await tempWindow.capturePage();
        
        // 임시 윈도우 닫기
        tempWindow.close();
        
        // 원래 윈도우 다시 표시
        await new Promise(resolve => setTimeout(resolve, 100));
        window.show();
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

