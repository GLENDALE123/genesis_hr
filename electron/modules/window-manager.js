const { BrowserWindow, shell, Menu, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

/**
 * 메인 윈도우 생성 및 관리
 */
function getResourcePath(relativePath, app) {
  let finalPath;
  if (app.isPackaged) {
    finalPath = path.join(process.resourcesPath, 'app', relativePath);
  } else {
    finalPath = path.join(__dirname, '..', relativePath);
  }
  
  if (app.isPackaged && !fs.existsSync(finalPath)) {
    console.warn(`⚠️ [Window Manager] 리소스 경로를 찾을 수 없습니다: ${finalPath}`);
    const altPath = path.join(process.resourcesPath, relativePath);
    if (fs.existsSync(altPath)) {
      console.log(`✅ [Window Manager] 대안 경로 사용: ${altPath}`);
      return altPath;
    }
  }
  
  return finalPath;
}

function shouldAllowNavigation(url, app) {
  try {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.protocol === 'file:') {
      return true;
    }
    
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      return true;
    }
    
    if (app.isPackaged) {
      const allowedDomains = [
        'firebase.googleapis.com',
        'firebaseapp.com',
        'googleapis.com',
      ];
      return allowedDomains.some(domain => parsedUrl.hostname.includes(domain));
    }
    
    return true;
  } catch {
    return false;
  }
}

function createWindow(app, splashWindow, firebaseOptimizer, preferDevServer, DEV_SERVER_URL, openDevToolsOnStart, setDevServerInUse) {
  const { Menu } = require('electron');
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 500,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      partition: 'persist:main',
      enableBlinkFeatures: 'CSSFontFeatureValues',
      sandbox: false,
      spellcheck: false,
      v8CacheOptions: 'code',
      backgroundThrottling: false,
      offscreen: false,
    },
    icon: (() => {
      const iconPaths = [
        'public/tms-logo.ico',
        'public/icon.ico',
        'public/tms-logo.png'
      ];
      for (const iconPath of iconPaths) {
        const fullPath = getResourcePath(iconPath, app);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
      return getResourcePath('public/tms-logo.png', app);
    })(),
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: false,
    center: true,
  });

  Menu.setApplicationMenu(null);
  mainWindow.maximize();

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1.0);
    
    mainWindow.webContents.executeJavaScript(`
      if (window.chrome && window.chrome.runtime) {
        // Chrome 확장 프로그램 관련 비활성화
      }
      
      if (typeof PerformanceObserver !== 'undefined') {
        // 필요한 경우에만 활성화
      }
    `).catch(() => {});
    
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; " +
            "img-src 'self' data: blob: https: http:; " +
            "font-src 'self' data: blob:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "connect-src 'self' https: wss: ws:;"
          ]
        }
      });
    });
  });
  
  mainWindow.on('hide', () => {
    if (app.isPackaged) {
      mainWindow.webContents.session.clearCache().catch(() => {});
    }
  });
  
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    if (details.reason === 'clean-exit') {
      // 정상 종료 시 리소스 정리
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.session.clearCache().catch(() => {});
      }
    }
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!shouldAllowNavigation(navigationUrl, app)) {
      console.warn(`⚠️ [Window Manager] 외부 URL 로드 차단: ${navigationUrl}`);
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!shouldAllowNavigation(url, app)) {
      console.warn(`⚠️ [Window Manager] 새 윈도우 열기 차단: ${url}`);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const load = async () => {
    splashWindow.updateSplashStatus('세션 캐시 정리 중...', '이전 세션 데이터 초기화', 25);
    mainWindow.webContents.session.clearCache().catch(() => {});
    
    if (app.isPackaged) {
      splashWindow.updateSplashStatus('애플리케이션 파일 로드 중...', '로컬 파일 시스템에서 읽기', 30);
      const indexPath = getResourcePath('dist/index.html', app);
      console.log(`✅ [Window Manager] 파일 직접 로드: ${indexPath}`);
      await mainWindow.loadFile(indexPath);
    } else {
      splashWindow.updateSplashStatus('개발 서버 연결 중...', 'Vite 개발 서버에 연결', 30);
      if (setDevServerInUse) {
        setDevServerInUse(true);
      }
      console.log(`✅ [Window Manager] 개발 서버 사용: ${DEV_SERVER_URL}`);
      await mainWindow.loadURL(DEV_SERVER_URL);
    }
    
    splashWindow.updateSplashStatus('UI 준비 완료', '애플리케이션 인터페이스 로드됨', 50);
    mainWindow.show();
    
    setTimeout(() => {
      splashWindow.closeSplashWindow();
    }, 200);
    
    console.log('✅ [Window Manager] 메인 윈도우 표시 완료 (Firebase 초기화는 백그라운드에서 진행)');
  };
  load();

  const { session } = mainWindow.webContents;
  try {
    session.setProxy({ mode: 'system' });
  } catch {}

  if (!session.__hs_hooks_registered) {
    try {
      session.webRequest.onErrorOccurred((details) => {
        try {
          console.error('[NetworkError]', details.error, details.url);
        } catch {}
      });
    } catch {}
    Object.defineProperty(session, '__hs_hooks_registered', { value: true, enumerable: false, configurable: false });
  }

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F5' || (input.control && input.key === 'r') || (input.meta && input.key === 'r')) {
      event.preventDefault();
      mainWindow.reload();
    }
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'i')) {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    }
    if (input.control && input.shift && input.key === 'r') {
      event.preventDefault();
      mainWindow.webContents.session.clearCache().then(() => {
        mainWindow.reload();
      });
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (openDevToolsOnStart) {
      mainWindow.webContents.openDevTools();
    }
    
    // Firebase 최적화는 main.js에서 관리하므로 여기서는 생성하지 않음
  });

  return mainWindow;
}

function cleanupWindowResources(mainWindow) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.session.clearCache().catch(() => {});
    }
  } catch (error) {
    console.warn('⚠️ [Window Manager] 리소스 정리 실패:', error.message);
  }
}

module.exports = {
  createWindow,
  cleanupWindowResources,
  getResourcePath,
  shouldAllowNavigation,
};
