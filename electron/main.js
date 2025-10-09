const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } = require('electron');
const path = require('path');
const registerIpcHandlers = require('./ipc-handlers');

// 개발 모드 체크
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let tray;

/**
 * 메인 윈도우 생성
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 550,        // 로그인 페이지 크기로 시작
    height: 650,       // 로그인 페이지 크기로 시작
    minWidth: 400,     // 최소 크기
    minHeight: 500,    // 최소 크기
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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

  // 개발 모드: Next.js dev 서버 연결
  // 프로덕션 모드: 정적 빌드 파일 로드
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(startUrl);

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

  console.log('✅ Electron 메인 윈도우 생성 완료');
  console.log(`📍 모드: ${isDev ? '개발 (Dev Server)' : '프로덕션 (Static Files)'}`);
  console.log(`🔗 URL: ${startUrl}`);
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

  console.log('✅ 시스템 트레이 생성 완료');
}

/**
 * 알림 표시
 */
ipcMain.handle('show-notification', async (event, options) => {
  try {
    const { title, body, icon } = options;
    
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
      }
    });

    console.log('🔔 [Electron] 알림 표시:', { title, body });
    return { success: true };
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

  console.log('🚀 Electron 앱 준비 완료');
  console.log(`📱 플랫폼: ${process.platform}`);
  console.log(`🖥️ 윈도우7 호환 모드: Electron 22`);
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

console.log('🎯 Electron 메인 프로세스 시작');
console.log(`📦 Electron 버전: ${process.versions.electron}`);
console.log(`🌐 Chrome 버전: ${process.versions.chrome}`);
console.log(`📟 Node 버전: ${process.versions.node}`);

