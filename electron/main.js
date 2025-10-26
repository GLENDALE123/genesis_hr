const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const registerIpcHandlers = require('./ipc-handlers');
const notificationWindow = require('./notification-window');

// 개발 모드 체크
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Electron 환경에서는 Firestore 리스너 방식 사용 (FCM 미사용)
let mainWindow;
let tray;
let hasLoggedNotificationPermission = false; // 알림 권한 로그 1회만 출력

/**
 * 메인 윈도우 생성
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,       // 기본 크기
    height: 800,       // 기본 크기
    minWidth: 400,     // 최소 크기
    minHeight: 500,    // 최소 크기
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Service Worker 및 알림 활성화
      enableRemoteModule: false,
      webSecurity: false, // Firebase API 호출을 위해 비활성화
      allowRunningInsecureContent: true, // Firebase API 호출을 위해 허용
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
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

  // 개발 모드: Next.js dev 서버 연결
  // 프로덕션 모드: 정적 빌드 파일 로드
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  // 개발 모드에서 캐시 클리어 후 로드
  if (isDev) {
    mainWindow.webContents.session.clearCache().then(() => {
      mainWindow.loadURL(startUrl);
    });
  } else {
    mainWindow.loadURL(startUrl);
  }

  // 알림 권한 자동 허용
  const { session } = mainWindow.webContents;
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

  // 개발 모드에서 새로고침 단축키 등록
  if (isDev) {
    // F5, Ctrl+R, Cmd+R로 새로고침
    mainWindow.webContents.on('before-input-event', (event, input) => {
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
  }

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 개발 모드에서만 DevTools 자동 열기
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 윈도우 닫기 이벤트
  mainWindow.on('close', (event) => {
    // Windows/Linux: 시스템 트레이로 최소화
    if (process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow.hide();
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
  const iconPath = path.join(__dirname, '../public/favicon.ico');
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

  tray.setToolTip('HS 인사관리 시스템');
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
          title: title || 'HS 인사관리 시스템',
          subtitle: subtitle,  // ✅ 서브타이틀 추가
          body: body || '',
          icon: icon || path.join(__dirname, '../public/favicon.ico'),
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
      title: title || 'HS 인사관리 시스템',
      body: body || '',
      icon: icon || path.join(__dirname, '../public/favicon.ico'),
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
 * 앱 준비 완료 이벤트
 */
app.on('ready', () => {
  // IPC 핸들러 등록 (윈도우 컨트롤용)
  registerIpcHandlers();
  
  createWindow();
  createTray();
});

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
});

// Windows 7 호환성을 위한 추가 설정
if (process.platform === 'win32') {
  app.setAppUserModelId('com.hs.hr');
}
