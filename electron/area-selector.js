const { BrowserWindow, screen } = require('electron');
const path = require('path');

let selectorWindow = null;
let isSelecting = false; // 선택 중 플래그
let currentPromise = null; // 현재 Promise 참조

/**
 * 영역 선택 창 생성 및 시작
 */
function startAreaSelection(mainWindow) {
  return new Promise((resolve, reject) => {
    // 이미 선택 중이면 이전 작업 취소 및 정리
    if (isSelecting && selectorWindow) {
      selectorWindow.close();
      if (currentPromise) {
        currentPromise = null;
      }
    }

    isSelecting = true;
    currentPromise = { resolve, reject };
    
    // 현재 메인 윈도우 숨기기
    mainWindow.hide();
    
    // 200ms 딜레이로 윈도우 완전히 숨겨지도록 대기
    setTimeout(() => {
      // Promise가 이미 해결되었는지 확인 (race condition 방지)
      if (!isSelecting) {
        mainWindow.show();
        return;
      }

      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      
      selectorWindow = new BrowserWindow({
        x: 0,
        y: 0,
        width: width,
        height: height,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        resizable: false,
        movable: false,
        focusable: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'area-selector-preload.js')
        }
      });

      // HTML 내용
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: rgba(0, 0, 0, 0.6);
      cursor: crosshair;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }
    .selection {
      position: absolute;
      border: 2px solid #4a9eff;
      background: rgba(74, 158, 255, 0.1);
      pointer-events: none;
      display: none;
    }
    .info {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      background: rgba(0, 0, 0, 0.8);
      padding: 10px 20px;
      border-radius: 6px;
      z-index: 1000;
    }
    .cancel {
      margin-left: 20px;
      color: #ff6b6b;
    }
  </style>
</head>
<body>
  <div class="info">마우스를 드래그하여 영역 선택 <span class="cancel">ESC: 취소</span></div>
  <div class="selection" id="selection"></div>
</body>
<script>
  // Preload에서 노출한 안전 API 사용
  const sendToMain = (channel, data) => {
    try {
      if (window.areaSelector && typeof window.areaSelector.send === 'function') {
        window.areaSelector.send(channel, data);
      }
    } catch (e) {}
  };
  let isSelecting = false;
  let startX = 0, startY = 0;
  let selection = document.getElementById('selection');

  // 마우스 다운
  document.addEventListener('mousedown', (e) => {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    selection.style.left = startX + 'px';
    selection.style.top = startY + 'px';
    selection.style.width = '0px';
    selection.style.height = '0px';
    selection.style.display = 'block';
  });

  // 마우스 이동
  document.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    const width = e.clientX - startX;
    const height = e.clientY - startY;
    
    if (width < 0) {
      selection.style.left = e.clientX + 'px';
      selection.style.width = Math.abs(width) + 'px';
    } else {
      selection.style.left = startX + 'px';
      selection.style.width = width + 'px';
    }
    
    if (height < 0) {
      selection.style.top = e.clientY + 'px';
      selection.style.height = Math.abs(height) + 'px';
    } else {
      selection.style.top = startY + 'px';
      selection.style.height = height + 'px';
    }
  });

  // 마우스 업
  document.addEventListener('mouseup', (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    
    const width = selection.offsetWidth;
    const height = selection.offsetHeight;
    
    if (width < 10 || height < 10) {
      selection.style.display = 'none';
      return;
    }
    
    const finalX = Math.min(startX, e.clientX);
    const finalY = Math.min(startY, e.clientY);
    
    // 선택 영역 데이터 전송
    sendToMain('area-selected', {
      x: finalX,
      y: finalY,
      width: width,
      height: height
    });
  });

  // ESC 키로 취소
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      sendToMain('area-selection-cancelled');
    }
  });

  // 우클릭으로 취소
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    sendToMain('area-selection-cancelled');
  });
</script>
</html>
      `;

      selectorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // 리소스 정리를 위한 헬퍼 함수
      const cleanup = () => {
        if (selectorWindow && !selectorWindow.isDestroyed()) {
          selectorWindow.removeAllListeners();
          selectorWindow.close();
        }
        selectorWindow = null;
        isSelecting = false;
        currentPromise = null;
        mainWindow.show();
        mainWindow.focus();
      };

      // 이벤트 리스너 (한 번만 실행)
      const ipcHandler = (event, channel, data) => {
        if (!isSelecting || !currentPromise) return;
        
        if (channel === 'area-selected') {
          currentPromise.resolve(data);
          cleanup();
        } else if (channel === 'area-selection-cancelled') {
          currentPromise.reject(new Error('Selection cancelled'));
          cleanup();
        }
      };

      const closeHandler = () => {
        cleanup();
      };

      // IPC 메시지 리스너 등록
      selectorWindow.webContents.once('ipc-message', ipcHandler);

      // 윈도우 닫힘 이벤트 리스너 등록
      selectorWindow.once('closed', closeHandler);

      // 에러 처리
      selectorWindow.webContents.once('did-fail-load', () => {
        if (currentPromise) {
          currentPromise.reject(new Error('Failed to load selector window'));
          cleanup();
        }
      });

      selectorWindow.show();
      selectorWindow.focus();
    }, 200);
  });
}

/**
 * 강제로 선택 창 종료 (메모리 누수 방지용)
 */
function forceCleanup() {
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    selectorWindow.removeAllListeners();
    selectorWindow.close();
  }
  selectorWindow = null;
  isSelecting = false;
  currentPromise = null;
}

module.exports = { startAreaSelection, forceCleanup };