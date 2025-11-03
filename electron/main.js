const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const registerIpcHandlers = require('./ipc-handlers');
const notificationWindow = require('./notification-window');

// 개발 서버 사용 여부를 명시적으로 제어 (패키지 여부와 무관)
const DEV_SERVER_URL = process.env.ELECTRON_DEV_SERVER_URL || 'https://hs-jig-b2093.web.app';
// 기본값: dev 서버 우선 연결. 명시적으로 ELECTRON_DEV=false 설정 시 비활성화
const preferDevServer = process.env.ELECTRON_DEV !== 'false';
const isDev = preferDevServer; // 개발자 도구/단축키 동작 기준
const openDevToolsOnStart = process.env.ELECTRON_OPEN_DEVTOOLS === 'true';

// 개발 모드에서는 autoUpdater 비활성화
if (process.env.NODE_ENV === 'development' || preferDevServer) {
  autoUpdater.updateConfigPath = null; // 개발 환경에서는 업데이트 체크 안 함
}

// autoUpdater 설정
autoUpdater.autoDownload = false; // 자동 다운로드 비활성화 (사용자 승인 필요)
autoUpdater.autoInstallOnAppQuit = true; // 앱 종료 시 자동 설치

// 업데이트 체크 간격 (30분마다)
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;

// Electron 환경에서는 Firestore 리스너 방식 사용 (FCM 미사용)
let mainWindow;
let tray;
let hasLoggedNotificationPermission = false; // 알림 권한 로그 1회만 출력

// 네트워크/인증 설정 (사내 프록시/인증서 검사 환경 대비)
try {
  app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
  app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
} catch {}

// 폰트 렌더링 선명도 개선 설정 (Windows 하이 DPI 지원)
try {
  // Windows DPI awareness 활성화 (자동으로 처리되지만 명시적으로 설정)
  if (process.platform === 'win32') {
    app.commandLine.appendSwitch('high-dpi-support', '1');
  }
} catch {}
let staticServer = null;
let staticServerPort = null;
let devServerInUse = false;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.ico') return 'image/x-icon';
  if (ext === '.woff2') return 'font/woff2';
  if (ext === '.map') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function ensureInside(baseDir, targetPath) {
  const rel = path.relative(baseDir, targetPath);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function startStaticOutServer() {
  return new Promise((resolve) => {
    const outDir = path.join(__dirname, '../electron-out');
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        let pathname = decodeURIComponent(url.pathname);
        if (pathname === '/') pathname = '/index.html';
        // 디렉토리 요청은 index.html 제공
        if (pathname.endsWith('/')) pathname = pathname + 'index.html';
        let filePath = path.join(outDir, pathname);
        if (!ensureInside(outDir, filePath)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        fs.stat(filePath, (err, stat) => {
          const serveFile = (finalPath) => {
            fs.readFile(finalPath, (readErr, data) => {
              if (readErr) {
                res.statusCode = 404;
                res.end('Not Found');
                return;
              }
              res.setHeader('Content-Type', getContentType(finalPath));
              res.end(data);
            });
          };

          if (!err) {
            if (stat.isFile()) {
              return serveFile(filePath);
            }
            if (stat.isDirectory()) {
              const indexPath = path.join(filePath, 'index.html');
              return serveFile(indexPath);
            }
          }

          // 파일이 아니고, 디렉토리인지 알 수 없을 때 디렉토리 인덱스 시도
          const possibleDirIndex = path.join(filePath, 'index.html');
          fs.stat(possibleDirIndex, (dirErr, dirStat) => {
            if (!dirErr && dirStat.isFile()) {
              return serveFile(possibleDirIndex);
            }
            // 최종 폴백: 루트 index.html (SPA 라우팅)
            const rootIndex = path.join(outDir, 'index.html');
            return serveFile(rootIndex);
          });
        });
      } catch (e) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      staticServer = server;
      staticServerPort = addr.port;
      resolve(staticServerPort);
    });
  });
}

function isUrlReachable(targetUrl) {
  return new Promise((resolve) => {
    try {
      const u = new URL(targetUrl);
      const proto = u.protocol === 'https:' ? require('https') : require('http');
      const req = proto.request({
        method: 'HEAD',
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: '/',
        timeout: 1200,
      }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { try { req.destroy(); } catch {} resolve(false); });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

/**
 * 메인 윈도우 생성
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,       // 기본 크기
    height: 800,       // 기본 크기
    minWidth: 400,     // 최소 크기
    minHeight: 500,    // 최소 크기
    backgroundColor: '#ffffff', // 배경색 설정 (렌더링 깜빡임 방지 및 선명도 개선)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Service Worker 및 알림 활성화
      enableRemoteModule: false,
      // 보안 기본값 유지 (필요시 개별 리소스에서 허용)
      webSecurity: true,
      allowRunningInsecureContent: false,
      // localStorage 영구 저장 설정
      partition: 'persist:main',
      // 폰트 렌더링 선명도 개선
      enableBlinkFeatures: 'CSSFontFeatureValues',
    },
    icon: path.join(__dirname, '../public/tms-logo.png'),
    show: false, // 로딩 완료 후 표시
    frame: false, // 타이틀바 제거 (커스텀 타이틀바 사용)
    titleBarStyle: 'hidden', // macOS용 타이틀바 스타일
    transparent: false,
    center: true,      // 화면 중앙에 표시
  });

  // 메뉴바 완전 제거
  Menu.setApplicationMenu(null);

  // 생성 직후 바로 최대화
  mainWindow.maximize();

  // 줌 레벨을 1.0으로 고정 (흐린 텍스트 방지)
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1.0);
  });

  // 개발: dev 서버가 살아있으면 우선 연결, 아니면 내장 정적 서버로 폴백
  const load = async () => {
    const useDev = preferDevServer && await isUrlReachable(DEV_SERVER_URL);
    devServerInUse = useDev;
    const startUrl = useDev
      ? DEV_SERVER_URL
      : `http://127.0.0.1:${await startStaticOutServer()}`;
    if (useDev) {
      await mainWindow.webContents.session.clearCache();
    }
    await mainWindow.loadURL(startUrl);
  };
  load();

  // 알림 권한 자동 허용
  const { session } = mainWindow.webContents;
  // 시스템 프록시 사용 (회사망 프록시 환경 호환)
  try {
    session.setProxy({ mode: 'system' });
  } catch {}

  // webRequest 훅 중복 등록 방지
  if (!session.__hs_hooks_registered) {
    try {
      // Dev 상대경로 리라이트는 Dev 서버 사용시에만
      session.webRequest.onBeforeRequest((details, callback) => {
        try {
          if (!devServerInUse) return callback({});
          const u = new URL(details.url);
          const origin = `${u.protocol}//${u.host}`;
          if (origin !== new URL(DEV_SERVER_URL).origin) return callback({});
          const m = u.pathname.match(/^\/(.+?)\/_next\/(.*)$/);
          if (m) {
            const redirectURL = `${origin}/_next/${m[2]}`;
            return callback({ redirectURL });
          }
        } catch {}
        callback({});
      });
    } catch {}

    try {
      // 네트워크 에러 로깅 (디버깅 용도)
      session.webRequest.onErrorOccurred((details) => {
        try {
          console.error('[NetworkError]', details.error, details.url);
        } catch {}
      });
    } catch {}

    // 플래그 설정
    Object.defineProperty(session, '__hs_hooks_registered', { value: true, enumerable: false, configurable: false });
  }

  session.setPermissionRequestHandler((webContents, permission, callback) => {
    // 알림 권한 자동 허용 (Firestore 리스너 방식)
    if (permission === 'notifications') {
      callback(true);
      if (isDev && !hasLoggedNotificationPermission) {
        hasLoggedNotificationPermission = true;
      }
    } else {
      callback(false);
    }
  });

  // 개발/프로덕션 공통 단축키 등록 (DevTools/새로고침)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F5, Ctrl+R, Cmd+R로 새로고침
    if (input.key === 'F5' || (input.control && input.key === 'r') || (input.meta && input.key === 'r')) {
      event.preventDefault();
      mainWindow.reload();
    }
    // F12 또는 Ctrl+Shift+I로 개발자 도구 토글
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'i')) {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    }
    // Ctrl+Shift+R로 캐시 클리어 후 새로고침
    if (input.control && input.shift && input.key === 'r') {
      event.preventDefault();
      mainWindow.webContents.session.clearCache().then(() => {
        mainWindow.reload();
      });
    }
  });

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 명시적으로 요청한 경우에만 DevTools 자동 열기
    if (openDevToolsOnStart) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 윈도우 닫기 이벤트
  mainWindow.on('close', (event) => {
    // 실제 종료하려는 경우가 아니면 트레이로 최소화
    if (!app.isQuitting && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    } else {
      // 실제 종료
      mainWindow = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 시스템 트레이 생성
 */
function createTray() {
  // 트레이 아이콘 (16x16 또는 32x32 권장)
  const iconPath = path.join(__dirname, '../public/tms-logo.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '앱 보이기',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '앱 숨기기',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('TMS 통합관리시스템');
  tray.setContextMenu(contextMenu);

  // 트레이 아이콘 클릭 시 윈도우 토글
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

/**
 * Windows 시스템 알림 소리 재생
 */
function playSystemNotificationSound() {
  try {
    if (process.platform === 'win32') {
      // PowerShell을 사용하여 Windows 시스템 알림 소리 재생
      const command = `powershell -c "(New-Object Media.SoundPlayer 'C:\\Windows\\Media\\Windows Notify System Generic.wav').PlaySync();"`;
      
      exec(command, (error) => {
        if (error) {
          console.error('❌ [Electron Main] 시스템 소리 재생 실패:', error);
        } else {
        }
      });
    }
  } catch (error) {
    console.error('❌ [Electron Main] 시스템 소리 재생 오류:', error);
  }
}

/**
 * 커스텀 알림 표시
 */
ipcMain.handle('show-notification', async (event, options) => {
  try {
    const { title, subtitle, body, icon, senderName, senderAvatar, timestamp, centerInfo, link, useCustom = true, soundEnabled = true } = options;
    // 🔔 작업 표시줄 깜빡임 (메인 윈도우가 포커스되지 않았을 때)
    if (mainWindow && !mainWindow.isFocused()) {
      mainWindow.flashFrame(true); // 깜빡임 시작
      // 윈도우가 포커스되면 깜빡임 중지
      mainWindow.once('focus', () => {
        if (mainWindow) {
          mainWindow.flashFrame(false);
        }
      });
    }
    
    // 🔊 Windows 시스템 알림 소리 재생 (설정 확인)
    if (soundEnabled) {
      playSystemNotificationSound();
    } else {
    }
    
    // 커스텀 알림 사용
    if (useCustom) {
      try {
        notificationWindow.createNotification({
          title: title || 'TMS 통합관리시스템',
          subtitle: subtitle,  // ✅ 서브타이틀 추가
          body: body || '',
          icon: icon || path.join(__dirname, '../public/tms-logo.png'),
          senderName: senderName,
          senderAvatar: senderAvatar,
          timestamp: timestamp,
          centerInfo: centerInfo,  // ✅ 중앙 정보 추가
          soundEnabled: soundEnabled,  // ✅ 소리 설정 추가
          onClick: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
              
              // ✅ 알림 클릭 시 링크로 이동
              if (link) {
                mainWindow.webContents.send('navigate-to', link);
              }
            }
          }
        });
        return { success: true, type: 'custom' };
      } catch (customError) {
        console.error('❌ [Electron Main] 커스텀 알림 생성 실패, 네이티브 알림으로 폴백:', customError);
        // 폴백으로 네이티브 알림 사용
      }
    }
    
    // 네이티브 알림 사용 (폴백)
    const notification = new Notification({
      title: title || 'TMS 통합관리시스템',
      body: body || '',
      icon: icon || path.join(__dirname, '../public/tms-logo.png'),
      silent: false
    });

    notification.show();

    // 알림 클릭 이벤트
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        
        // ✅ 네이티브 알림도 링크 이동 지원
        if (link) {
          mainWindow.webContents.send('navigate-to', link);
        }
      }
    });
    return { success: true, type: 'native' };
  } catch (error) {
    console.error('❌ [Electron] 알림 표시 실패:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 업데이트 확인 및 다운로드
 */
function checkForUpdates(showNotification = false) {
  if (process.env.NODE_ENV === 'development' || preferDevServer) {
    console.log('[Updater] 개발 모드에서는 업데이트 체크를 건너뜁니다.');
    return;
  }

  console.log('[Updater] 업데이트 확인 중...');
  autoUpdater.checkForUpdates().catch(err => {
    console.error('[Updater] 업데이트 확인 실패:', err);
  });
}

/**
 * 업데이트 이벤트 핸들러 등록
 */
function setupUpdater() {
  if (process.env.NODE_ENV === 'development' || preferDevServer) {
    return;
  }

  // 업데이트 사용 가능할 때
  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] 새 버전 사용 가능:', info.version);
    
    // 메인 윈도우에 알림 전송
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes || '',
        releaseDate: info.releaseDate
      });
    }
  });

  // 업데이트 다운로드 진행률
  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`[Updater] 다운로드 진행률: ${percent}%`);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', {
        percent: percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  // 업데이트 다운로드 완료
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] 다운로드 완료:', info.version);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes || ''
      });
    }
  });

  // 업데이트 확인 중 에러
  autoUpdater.on('error', (error) => {
    console.error('[Updater] 오류:', error);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-error', {
        message: error.message
      });
    }
  });

  // 업데이트 없음
  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] 최신 버전입니다.');
    
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available');
    }
  });
}

// IPC 핸들러: 업데이트 체크 요청 (프론트엔드에서 호출)
ipcMain.handle('check-for-updates', async (event) => {
  checkForUpdates(true);
  return { success: true };
});

// IPC 핸들러: 업데이트 다운로드 시작
ipcMain.handle('download-update', async (event) => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('[Updater] 다운로드 실패:', error);
    return { success: false, error: error.message };
  }
});

// IPC 핸들러: 업데이트 설치 및 재시작
ipcMain.handle('install-update', async (event) => {
  try {
    autoUpdater.quitAndInstall(false, true); // 앱 즉시 종료 후 설치
    return { success: true };
  } catch (error) {
    console.error('[Updater] 설치 실패:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 단일 인스턴스 잠금 요청
 * 이미 실행 중인 인스턴스가 있으면 false 반환
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 이미 다른 인스턴스가 실행 중이면 종료
  app.quit();
} else {
  /**
   * 두 번째 인스턴스가 실행되려고 할 때 호출
   */
  app.on('second-instance', () => {
    // 기존 윈도우가 있으면 포커스
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  /**
   * 앱 준비 완료 이벤트
   */
  app.on('ready', () => {
    // IPC 핸들러 등록 (윈도우 컨트롤용)
    registerIpcHandlers();
    
    // 업데ater 설정
    setupUpdater();
    
    createWindow();
    createTray();
    
    // 앱 시작 후 10초 뒤에 첫 업데이트 체크
    setTimeout(() => {
      checkForUpdates();
    }, 10000);
    
    // 주기적으로 업데이트 체크
    setInterval(() => {
      checkForUpdates();
    }, UPDATE_CHECK_INTERVAL);
  });
}

/**
 * 모든 윈도우가 닫혔을 때
 */
app.on('window-all-closed', () => {
  // macOS를 제외하고 앱 종료
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 앱 활성화 (macOS)
 */
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * 앱 종료 전
 */
app.on('before-quit', () => {
  app.isQuitting = true;
  // 정적 서버가 켜져있으면 종료
  try {
    if (staticServer) {
      staticServer.close();
      staticServer = null;
      staticServerPort = null;
    }
  } catch {}
});

// Windows 7 호환성을 위한 추가 설정
if (process.platform === 'win32') {
  app.setAppUserModelId('com.hs.hr');
}
