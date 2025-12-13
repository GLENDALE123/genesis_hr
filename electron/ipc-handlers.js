const { ipcMain, BrowserWindow, clipboard, desktopCapturer, screen, nativeImage, webContents, app } = require('electron');
const { startAreaSelection } = require('./area-selector');
const { createScreenshotPreview } = require('./screenshot-preview');
const path = require('path');
const fs = require('fs');

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

  // 특정 요소 캡처
  ipcMain.handle('capture-element', async (event, elementSelector) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        return { success: false, error: 'Window not found' };
      }

      // 렌더러 프로세스에서 요소의 bounds 가져오기
      const bounds = await window.webContents.executeJavaScript(`
        (function() {
          const element = document.querySelector('${elementSelector}');
          if (!element) return null;
          
          const rect = element.getBoundingClientRect();
          const scrollX = window.scrollX || window.pageXOffset;
          const scrollY = window.scrollY || window.pageYOffset;
          
          return {
            x: Math.round(rect.left + scrollX),
            y: Math.round(rect.top + scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        })();
      `);

      if (!bounds) {
        return { success: false, error: 'Element not found' };
      }

      // 전체 창 캡처
      const fullWindowImage = await window.capturePage();

      if (!fullWindowImage) {
        return { success: false, error: 'Failed to capture window' };
      }

      // 요소 영역만 잘라내기
      const image = fullWindowImage.crop({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });

      // 미리보기 창 표시
      await createScreenshotPreview(
        image,
        (img) => {
          clipboard.writeImage(img);
          console.log('요소가 클립보드에 복사되었습니다.');
        },
        (img, printOptions = {}) => {
          // 설정값 가져오기 (기본값 설정)
          const paperSize = printOptions.paperSize || 'A4';
          const orientation = printOptions.orientation || 'landscape';
          const margins = parseInt(printOptions.margins || '0');
          const scale = printOptions.scale || 'fit';
          const printBackground = printOptions.printBackground !== undefined ? printOptions.printBackground : true;

          // 인쇄용 임시 윈도우 생성
          const { BrowserWindow } = require('electron');
          const printWindow = new BrowserWindow({
            show: false,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true
            }
          });

          const dataURL = img.toDataURL();
          const pageSize = `${paperSize} ${orientation}`;
          const imageWidth = scale === 'fit' || scale === 'fill' ? '100%' : scale + '%';
          const imageHeight = scale === 'fit' || scale === 'fill' ? '100%' : scale + '%';

          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @media print {
      @page {
        size: ${pageSize};
        margin: ${margins}mm;
      }
      body {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img {
        width: ${imageWidth};
        height: ${imageHeight};
        object-fit: ${scale === 'fill' ? 'cover' : 'contain'};
      }
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <img src="${dataURL}" alt="Print">
</body>
</html>
          `;

          printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

          printWindow.webContents.once('did-finish-load', () => {
            printWindow.webContents.print({
              silent: false,
              printBackground: printBackground
            }, (success) => {
              if (success) {
                console.log('인쇄 성공');
              } else {
                console.error('인쇄 실패');
              }
              if (printWindow && !printWindow.isDestroyed()) {
                printWindow.close();
              }
            });
          });
        }
      );

      return { success: true };
    } catch (error) {
      console.error('요소 캡처 오류:', error);
      return { success: false, error: error.message };
    }
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
        // 영역 선택 모드 - 사용자가 영역 선택
        try {
          // 사용자가 영역 선택
          const bounds = await startAreaSelection(window);

          // 선택한 영역 캡처 (좌표는 메인 창 기준)
          const { x, y, width, height } = bounds;

          // 메인 창 전체를 캡처
          const fullWindowImage = await window.capturePage();

          if (!fullWindowImage) {
            return { success: false, error: 'Failed to capture window' };
          }

          // 선택한 영역만 잘라내기 (메인 창 내부 좌표)
          image = fullWindowImage.crop({
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height)
          });
        } catch (error) {
          // 선택 취소
          if (error.message === 'Selection cancelled') {
            return { success: false, canceled: true };
          }
          return { success: false, error: error.message };
        }
      } else {
        // 기본값: 현재 윈도우
        image = await window.capturePage();
      }

      // 미리보기 창 표시
      if (image) {
        await createScreenshotPreview(
          image,
          // 클립보드 복사 콜백
          (img) => {
            clipboard.writeImage(img);
            console.log('이미지가 클립보드에 복사되었습니다.');
          },
          // 인쇄 콜백
          (img, printOptions = {}) => {
            // 설정값 가져오기 (기본값 설정)
            const paperSize = printOptions.paperSize || 'A4';
            const orientation = printOptions.orientation || 'landscape';
            const margins = parseInt(printOptions.margins || '0');
            const scale = printOptions.scale || 'fit';
            const printBackground = printOptions.printBackground !== undefined ? printOptions.printBackground : true;

            // 인쇄용 임시 윈도우 생성
            const printWindow = new BrowserWindow({
              show: false,
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
              }
            });

            const dataURL = img.toDataURL();
            const pageSize = `${paperSize} ${orientation}`;
            const imageWidth = scale === 'fit' || scale === 'fill' ? '100%' : scale + '%';
            const imageHeight = scale === 'fit' || scale === 'fill' ? '100%' : scale + '%';

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @media print {
      @page {
        size: ${pageSize};
        margin: ${margins}mm;
      }
      body {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img {
        width: ${imageWidth};
        height: ${imageHeight};
        object-fit: ${scale === 'fill' ? 'cover' : 'contain'};
      }
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <img src="${dataURL}" alt="Print">
</body>
</html>
            `;

            printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

            printWindow.webContents.once('did-finish-load', () => {
              printWindow.webContents.print({
                silent: false,
                printBackground: printBackground
              }, (success) => {
                if (success) {
                  console.log('인쇄 성공');
                } else {
                  console.error('인쇄 실패');
                }
                if (printWindow && !printWindow.isDestroyed()) {
                  printWindow.close();
                }
              });
            });
          }
        );
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

