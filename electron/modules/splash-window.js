const { BrowserWindow } = require('electron');
const path = require('path');

let splashWindow = null;

function getResourcePath(relativePath, app) {
  let finalPath;
  if (app.isPackaged) {
    finalPath = path.join(process.resourcesPath, 'app', relativePath);
  } else {
    finalPath = path.join(__dirname, '..', relativePath);
  }
  return finalPath;
}

function createSplashWindow(app) {
  const splashPath = getResourcePath('electron/splash.html', app);
  
  const SPLASH_WIDTH = 400;
  const SPLASH_HEIGHT = 500;
  
  splashWindow = new BrowserWindow({
    width: SPLASH_WIDTH,
    height: SPLASH_HEIGHT,
    minWidth: SPLASH_WIDTH,
    maxWidth: SPLASH_WIDTH,
    minHeight: SPLASH_HEIGHT,
    maxHeight: SPLASH_HEIGHT,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    closable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  });
  
  splashWindow.on('resize', () => {
    if (splashWindow) {
      const [width, height] = splashWindow.getSize();
      if (width !== SPLASH_WIDTH || height !== SPLASH_HEIGHT) {
        splashWindow.setSize(SPLASH_WIDTH, SPLASH_HEIGHT);
      }
    }
  });
  
  splashWindow.loadFile(splashPath).then(() => {
    splashWindow.show();
    console.log('✅ [Splash Window] 스플래시 화면 표시');
    
    const logoPath = getResourcePath('public/tms-logo.png', app);
    splashWindow.webContents.executeJavaScript(`
      const logo = document.querySelector('.logo');
      if (logo) {
        logo.src = '${logoPath.replace(/\\/g, '/')}';
      }
    `).catch(() => {});
  }).catch((error) => {
    console.warn('⚠️ [Splash Window] 스플래시 화면 로드 실패:', error.message);
  });
  
  return splashWindow;
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.setOpacity(0);
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
        console.log('✅ [Splash Window] 스플래시 화면 닫기 완료');
      }
    }, 150);
  }
}

function updateSplashStatus(message, detail = '', progress = null) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    const safeMessage = message.replace(/'/g, "\\'");
    const safeDetail = detail.replace(/'/g, "\\'");
    
    let jsCode = `
      const statusText = document.getElementById('status-text');
      const detailText = document.getElementById('detail-text');
      if (statusText) {
        statusText.textContent = '${safeMessage}';
      }
      if (detailText) {
        detailText.textContent = '${safeDetail}';
      }
    `;
    
    if (progress !== null && typeof progress === 'number') {
      jsCode += `
      if (window.updateProgress) {
        window.updateProgress(${Math.min(100, Math.max(0, progress))});
      }
      `;
    }
    
    splashWindow.webContents.executeJavaScript(jsCode).catch(() => {});
  }
}

function getSplashWindow() {
  return splashWindow;
}

module.exports = {
  createSplashWindow,
  closeSplashWindow,
  updateSplashStatus,
  getSplashWindow,
};
