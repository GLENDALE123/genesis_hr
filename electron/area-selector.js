const { BrowserWindow, screen } = require('electron');
const path = require('path');

let selectorWindow = null;
let isSelecting = false;

function startAreaSelection(mainWindow) {
  return new Promise((resolve, reject) => {
    if (isSelecting && selectorWindow) {
      selectorWindow.close();
    }

    isSelecting = true;
    
    // 메인 창은 그대로 유지 (항상 위에 있지 않음)
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    
    setTimeout(() => {
      if (!isSelecting) {
        return;
      }

      // 메인 창의 크기와 위치 가져오기
      const mainBounds = mainWindow.getBounds();
      const { x, y, width, height } = mainBounds;
      
      selectorWindow = new BrowserWindow({
        x: x,
        y: y,
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
    
    sendToMain('area-selected', {
      x: finalX,
      y: finalY,
      width: width,
      height: height
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      sendToMain('area-selection-cancelled');
    }
  });

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    sendToMain('area-selection-cancelled');
  });
</script>
</html>
      `;

      selectorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      const cleanup = () => {
        if (selectorWindow && !selectorWindow.isDestroyed()) {
          selectorWindow.removeAllListeners();
          selectorWindow.close();
        }
        selectorWindow = null;
        isSelecting = false;
        // 메인 창 포커스
        mainWindow.focus();
      };

      const ipcHandler = (event, channel, data) => {
        if (!isSelecting) return;
        
        if (channel === 'area-selected') {
          resolve(data);
          cleanup();
        } else if (channel === 'area-selection-cancelled') {
          reject(new Error('Selection cancelled'));
          cleanup();
        }
      };

      const closeHandler = () => {
        cleanup();
      };

      selectorWindow.webContents.once('ipc-message', ipcHandler);
      selectorWindow.once('closed', closeHandler);

      selectorWindow.webContents.once('did-fail-load', () => {
        reject(new Error('Failed to load selector window'));
        cleanup();
      });

        selectorWindow.show();
        selectorWindow.focus();
      }, 200);
    });
  }

module.exports = { startAreaSelection };


