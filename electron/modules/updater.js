const { autoUpdater } = require('electron-updater');

let mainWindowRef = null;

const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;
const FIREBASE_STORAGE_BUCKET = 'hs-jig-b2093.firebasestorage.app';
const UPDATE_BASE_URL = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/electron-releases%2F`;

function setupUpdater(app, mainWindow, preferDevServer) {
  mainWindowRef = mainWindow;
  
  if (process.env.NODE_ENV === 'development' || preferDevServer) {
    return;
  }

  if (app.isPackaged && !preferDevServer) {
    const latestYmlUrl = `${UPDATE_BASE_URL}latest.yml?alt=media`;
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: latestYmlUrl
    });
    console.log('[Updater] Firebase Storage 업데이트 서버 설정됨');
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.autoRunAppAfterInstall = true;

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] 새 버전 사용 가능:', info.version);
    if (mainWindowRef) {
      mainWindowRef.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes || '',
        releaseDate: info.releaseDate
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`[Updater] 다운로드 진행률: ${percent}%`);
    if (mainWindowRef) {
      mainWindowRef.webContents.send('update-download-progress', {
        percent: percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] 다운로드 완료:', info.version);
    if (mainWindowRef) {
      mainWindowRef.webContents.send('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes || ''
      });
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater] 오류:', error);
    if (mainWindowRef) {
      mainWindowRef.webContents.send('update-error', {
        message: error.message
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] 최신 버전입니다.');
    if (mainWindowRef) {
      mainWindowRef.webContents.send('update-not-available');
    }
  });
}

function checkForUpdates() {
  if (process.env.NODE_ENV === 'development') {
    return;
  }
  
  try {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[Updater] 업데이트 체크 실패:', error);
    });
  } catch (error) {
    console.error('[Updater] 업데이트 체크 중 오류:', error);
  }
}

function setupUpdateIpcHandlers(ipcMain) {
  ipcMain.handle('check-for-updates', async (event) => {
    checkForUpdates(true);
    return { success: true };
  });

  ipcMain.handle('download-update', async (event) => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('[Updater] 다운로드 실패:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('install-update', async (event) => {
    try {
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error) {
      console.error('[Updater] 설치 실패:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  setupUpdater,
  checkForUpdates,
  setupUpdateIpcHandlers,
  UPDATE_CHECK_INTERVAL,
};





















