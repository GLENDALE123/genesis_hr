const { BrowserWindow, nativeImage } = require('electron');
const path = require('path');

let previewWindow = null;

/**
 * 스크린샷 미리보기 창 생성
 */
function createScreenshotPreview(image, onCopy, onPrint) {
  return new Promise((resolve, reject) => {
    if (previewWindow && !previewWindow.isDestroyed()) {
      previewWindow.close();
    }

    // 이미지를 base64로 변환
    const dataURL = image.toDataURL();
    const imageSize = image.getSize();

    previewWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      frame: true,
      title: '스크린샷 미리보기',
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'screenshot-preview-preload.js')
      },
      autoHideMenuBar: true,
      icon: path.join(__dirname, '../public/tms-logo.png')
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: relative;
    }
    .toast {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #007acc;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toolbar {
      background: #2d2d2d;
      padding: 12px 20px;
      display: flex;
      gap: 12px;
      align-items: center;
      border-bottom: 1px solid #3d3d3d;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn svg {
      width: 16px;
      height: 16px;
    }
    .btn-primary {
      background: #007acc;
      color: white;
    }
    .btn-primary:hover {
      background: #005a9e;
    }
    .btn-secondary {
      background: #3d3d3d;
      color: white;
      border: 1px solid #4d4d4d;
    }
    .btn-secondary:hover {
      background: #4d4d4d;
    }
    .btn-danger {
      background: #d32f2f;
      color: white;
    }
    .btn-danger:hover {
      background: #b71c1c;
    }
    .print-options {
      background: #2d2d2d;
      padding: 12px 20px;
      border-top: 1px solid #3d3d3d;
      font-size: 12px;
    }
    .print-options-row {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 8px;
    }
    .print-options-row:last-child {
      margin-bottom: 0;
    }
    .print-options-label {
      color: #cccccc;
      width: 60px;
      flex-shrink: 0;
    }
    .print-options-controls {
      display: flex;
      gap: 8px;
      flex: 1;
    }
    select {
      padding: 4px 8px;
      border: 1px solid #4d4d4d;
      border-radius: 4px;
      background: #1e1e1e;
      color: white;
      font-size: 12px;
    }
    input[type="number"] {
      padding: 4px 8px;
      border: 1px solid #4d4d4d;
      border-radius: 4px;
      background: #1e1e1e;
      color: white;
      font-size: 12px;
      width: 60px;
    }
    .image-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: auto;
      background: #252526;
    }
    .image-wrapper {
      background: white;
      padding: 8px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 100%;
      max-height: 100%;
    }
    .image-wrapper img {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .status {
      padding: 8px 20px;
      background: #2d2d2d;
      color: #cccccc;
      font-size: 12px;
      border-top: 1px solid #3d3d3d;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn btn-primary" id="copyBtn">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"></path></svg>
      클립보드에 복사
    </button>
    <button class="btn btn-secondary" id="printBtn">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path><rect x="6" y="14" width="12" height="8" rx="1"></rect></svg>
      인쇄
    </button>
  </div>
  <div class="print-options" id="printOptions">
    <div class="print-options-row">
      <div class="print-options-label">용지:</div>
      <div class="print-options-controls">
        <select id="paperSize">
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
          <option value="Legal">Legal</option>
          <option value="A3">A3</option>
          <option value="A5">A5</option>
        </select>
      </div>
    </div>
    <div class="print-options-row">
      <div class="print-options-label">방향:</div>
      <div class="print-options-controls">
        <select id="orientation">
          <option value="landscape">가로</option>
          <option value="portrait">세로</option>
        </select>
      </div>
    </div>
    <div class="print-options-row">
      <div class="print-options-label">여백:</div>
      <div class="print-options-controls">
        <select id="margins">
          <option value="0">0mm</option>
          <option value="5" selected>5mm (기본)</option>
          <option value="10">10mm</option>
          <option value="15">15mm</option>
          <option value="20">20mm</option>
          <option value="25">25mm</option>
          <option value="30">30mm</option>
        </select>
      </div>
    </div>
    <div class="print-options-row">
      <div class="print-options-label">크기:</div>
      <div class="print-options-controls">
        <select id="scale">
          <option value="fit">맞춤 (최대)</option>
          <option value="fill">채우기</option>
          <option value="100">100%</option>
          <option value="75">75%</option>
          <option value="50">50%</option>
          <option value="25">25%</option>
        </select>
      </div>
    </div>
    <div class="print-options-row">
      <div class="print-options-label">배경:</div>
      <div class="print-options-controls">
        <input type="checkbox" id="printBackground" checked>
        <label for="printBackground" style="color: #cccccc; margin-left: 4px;">인쇄</label>
      </div>
    </div>
  </div>
  <div class="image-container">
    <div class="image-wrapper">
      <img src="${dataURL}" alt="Screenshot">
    </div>
  </div>
  <div class="status">
    이미지 크기: ${imageSize.width} × ${imageSize.height} px
  </div>
  <div class="toast" id="toast"></div>

  <script>
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }
    const sendToMain = (channel, data) => {
      try {
        if (window.screenshotPreview && typeof window.screenshotPreview.send === 'function') {
          window.screenshotPreview.send(channel, data);
        }
      } catch (e) {}
    };

    document.getElementById('copyBtn').addEventListener('click', () => {
      sendToMain('copy-screenshot');
      showToast('클립보드에 복사되었습니다!');
    });

    document.getElementById('printBtn').addEventListener('click', () => {
      const paperSize = document.getElementById('paperSize').value;
      const orientation = document.getElementById('orientation').value;
      const margins = document.getElementById('margins').value;
      const scale = document.getElementById('scale').value;
      const printBackground = document.getElementById('printBackground').checked;
      
      sendToMain('print-screenshot', {
        paperSize,
        orientation,
        margins,
        scale,
        printBackground
      });
      showToast('인쇄 대화상자를 여는 중...');
    });
  </script>
</body>
</html>
    `;

    previewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    const cleanup = () => {
      if (previewWindow && !previewWindow.isDestroyed()) {
        previewWindow.removeAllListeners();
        previewWindow.close();
      }
      previewWindow = null;
    };

    const ipcHandler = (event, channel, data) => {
      if (channel === 'copy-screenshot') {
        onCopy(image);
        event.reply('copy-result', { success: true });
      } else if (channel === 'print-screenshot') {
        onPrint(image, data); // 설정 데이터 전달
        event.reply('print-result', { success: true });
      } else if (channel === 'close-preview') {
        cleanup();
      }
    };

    previewWindow.webContents.on('ipc-message', ipcHandler);
    previewWindow.once('closed', cleanup);

    previewWindow.show();
    previewWindow.focus();

    resolve(previewWindow);
  });
}

module.exports = { createScreenshotPreview };

