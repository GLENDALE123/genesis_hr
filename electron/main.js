const { app, ipcMain } = require('electron');
const path = require('path');
const registerIpcHandlers = require('./ipc-handlers');
const { FirebaseOptimizer } = require('./firebase-optimizer');
const { setupConsoleEncoding } = require('./utils/console-encoding');

// Windows 콘솔 인코딩 설정 (한글 깨짐 방지)
// 가장 먼저 실행하여 모든 로그가 올바르게 표시되도록 함
setupConsoleEncoding();

// 모듈화된 기능들
const cacheManager = require('./modules/cache-manager');
const splashWindow = require('./modules/splash-window');
const staticServer = require('./modules/static-server');
const updater = require('./modules/updater');
const performanceMonitor = require('./modules/performance-monitor');
const windowManager = require('./modules/window-manager');
const trayManager = require('./modules/tray-manager');
const notificationHandler = require('./modules/notification-handler');
const postitWindow = require('./modules/postit-window');

// 앱 시작 시 캐시 로드
cacheManager.loadNativeCache();

// 개발 서버 사용 여부를 명시적으로 제어
// 패키지된 앱(설치본)에서는 무조건 로컬 정적 서버 사용
const DEV_SERVER_URL = process.env.ELECTRON_DEV_SERVER_URL || 'http://localhost:5173';
// 패키지된 앱이면 웹 서버 사용 안 함, 아니면 환경 변수로 제어
const preferDevServer = !app.isPackaged && process.env.ELECTRON_DEV !== 'false';
const isDev = preferDevServer; // 개발자 도구/단축키 동작 기준
const openDevToolsOnStart = process.env.ELECTRON_OPEN_DEVTOOLS === 'true';

// Electron 환경에서는 Firestore 리스너 방식 사용 (FCM 미사용)
let mainWindow;
let tray;
let hasLoggedNotificationPermission = false; // 알림 권한 로그 1회만 출력
let firebaseOptimizer = null; // Firebase 최적화 인스턴스

// 네트워크/인증 설정 (사내 프록시/인증서 검사 환경 대비)
try {
  app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
  app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
} catch {}

// 성능 최적화: Chromium 플래그 설정
try {
  // 메모리 최적화
  app.commandLine.appendSwitch('disable-background-networking'); // 백그라운드 네트워킹 비활성화
  app.commandLine.appendSwitch('disable-background-timer-throttling'); // 백그라운드 타이머 스로틀링 비활성화
  app.commandLine.appendSwitch('disable-renderer-backgrounding'); // 렌더러 백그라운딩 비활성화
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows'); // 가려진 윈도우 백그라운딩 비활성화
  
  // GPU 가속 최적화
  app.commandLine.appendSwitch('enable-gpu-rasterization'); // GPU 래스터화 활성화
  app.commandLine.appendSwitch('enable-zero-copy'); // 제로 카피 활성화 (메모리 효율)
  
  // 렌더링 최적화
  app.commandLine.appendSwitch('disable-features', 'TranslateUI'); // 번역 UI 비활성화
  app.commandLine.appendSwitch('disable-ipc-flooding-protection'); // IPC 플러딩 보호 비활성화 (성능)
  
  // 메모리 절약
  app.commandLine.appendSwitch('disable-dev-shm-usage'); // /dev/shm 사용 비활성화 (리눅스)
  app.commandLine.appendSwitch('disable-extensions'); // 확장 프로그램 비활성화 (필요시)
  
  // 네트워크 최적화
  app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess'); // 네트워크 서비스 최적화
  
  console.log('✅ [Electron Main] 성능 최적화 플래그 설정 완료');
} catch (error) {
  console.warn('⚠️ [Electron Main] 성능 플래그 설정 실패:', error.message);
}

// 폰트 렌더링 선명도 개선 설정 (Windows 하이 DPI 지원)
try {
  // Windows DPI awareness 활성화 (자동으로 처리되지만 명시적으로 설정)
  if (process.platform === 'win32') {
    app.commandLine.appendSwitch('high-dpi-support', '1');
  }
} catch {}
let staticServerInstance = null;
let staticServerPort = null;
let devServerInUse = false;


/**
 * 메인 윈도우 생성 (모듈로 이동됨)
 */
function createWindow() {
  mainWindow = windowManager.createWindow(
    app,
    splashWindow,
    firebaseOptimizer,
    preferDevServer,
    DEV_SERVER_URL,
    openDevToolsOnStart,
    (value) => { devServerInUse = value; }
  );
  
  // 알림 권한 설정
  const { session } = mainWindow.webContents;
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'notifications') {
      callback(true);
      if (!hasLoggedNotificationPermission) {
        console.log('✅ [Electron Main] 알림 권한 허용됨');
        hasLoggedNotificationPermission = true;
      }
    } else {
      callback(false);
    }
  });
  
  if (app.isPackaged && process.platform === 'win32') {
    console.log('ℹ️ [Electron Main] Windows 알림 권한 확인 - 시스템 설정에서 알림이 활성화되어 있어야 합니다.');
  }
  
  // 윈도우 닫기 이벤트
  mainWindow.on('close', (event) => {
    if (!app.isQuitting && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    } else {
      windowManager.cleanupWindowResources(mainWindow);
      mainWindow = null;
    }
  });

  mainWindow.on('closed', () => {
    if (firebaseOptimizer) {
      firebaseOptimizer.destroy();
      firebaseOptimizer = null;
    }
    mainWindow = null;
  });

  mainWindow.webContents.on('destroyed', () => {
    windowManager.cleanupWindowResources(mainWindow);
  });
  
  return mainWindow;
}

/**
 * IPC 채널 검증 (보안)
 */
function validateIpcChannel(channel) {
  const allowedChannels = [
    'show-notification',
    'check-for-updates',
    'download-update',
    'install-update',
    'get-cached-data',
    'set-cached-data',
    'delete-cached-data',
    'clear-cached-data',
    'get-cache-stats',
    'get-cached-storage-file',
    'cache-storage-file',
  ];
  return allowedChannels.includes(channel);
}

/**
 * 에러 파일 로깅
 */
function logErrorToFile(tag, error) {
  try {
    const fs = require('fs');
    const path = require('path');
    const errorLogPath = path.join(app.getPath('userData'), 'error.log');
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] [${tag}] ${error.message}\n${error.stack}\n\n`;
    fs.appendFileSync(errorLogPath, errorMessage, 'utf-8');
  } catch {
    // 에러 로깅 실패는 무시
  }
}

/**
 * 전역 에러 핸들러 설정
 */
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('❌ [Electron Main] Uncaught Exception:', error);
    logErrorToFile('uncaughtException', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [Electron Main] Unhandled Rejection:', reason);
    logErrorToFile('unhandledRejection', new Error(String(reason)));
  });
}

/**
 * 안전한 IPC 핸들러 래퍼 (보안 강화)
 */
function safeIpcHandle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    // 채널 검증
    if (!validateIpcChannel(channel)) {
      console.error(`❌ [Electron Main] 허용되지 않은 IPC 채널: ${channel}`);
      return { success: false, error: 'Unauthorized channel' };
    }
    
    // WebContents 검증 (보안)
    if (!event.sender || event.sender.isDestroyed()) {
      console.error(`❌ [Electron Main] 유효하지 않은 IPC 발신자: ${channel}`);
      return { success: false, error: 'Invalid sender' };
    }
    
    try {
      return await handler(event, ...args);
    } catch (error) {
      console.error(`❌ [Electron Main] IPC 핸들러 에러 (${channel}):`, error);
      logErrorToFile(`ipc-handler-${channel}`, error);
      return { success: false, error: error.message };
    }
  });
}

// 알림 IPC 핸들러 등록
notificationHandler.setupNotificationIpcHandlers(ipcMain, () => mainWindow, validateIpcChannel, safeIpcHandle);

// 포스트잇 창 IPC 핸들러 등록
ipcMain.handle('postit-window-show', () => {
  postitWindow.showPostItWindow(mainWindow);
  return { success: true };
});

ipcMain.handle('postit-window-hide', () => {
  postitWindow.hidePostItWindow();
  return { success: true };
});

ipcMain.handle('postit-window-close', () => {
  postitWindow.closePostItWindow();
  return { success: true };
});

ipcMain.handle('postit-window-is-open', () => {
  const isOpen = postitWindow.isPostItWindowOpen();
  // 창이 열려있고 visible한지 확인
  if (isOpen) {
    const windowInstance = postitWindow.getPostItWindow();
    if (windowInstance && !windowInstance.isVisible()) {
      return { isOpen: false };
    }
  }
  return { isOpen };
});

// 포스트잇 창 모드 변경
ipcMain.handle('postit-window-set-mode', (event, mode) => {
  postitWindow.setPostItWindowMode(mode);
  return { success: true, mode: postitWindow.getPostItWindowMode() };
});

// 포스트잇 창 모드 가져오기
ipcMain.handle('postit-window-get-mode', () => {
  return { mode: postitWindow.getPostItWindowMode() };
});

// 포스트잇 창 모드 순환
ipcMain.handle('postit-window-cycle-mode', () => {
  const newMode = postitWindow.cyclePostItWindowMode();
  return { success: true, mode: newMode };
});

// 업데이터 IPC 핸들러 등록
updater.setupUpdateIpcHandlers(ipcMain);

// 캐시 IPC 핸들러 등록
cacheManager.setupCacheIpcHandlers(ipcMain);

/**
 * Firebase Storage 캐시 IPC 핸들러
 */
// Storage 파일 캐시 가져오기
ipcMain.handle('get-cached-storage-file', async (event, url) => {
  try {
    if (firebaseOptimizer) {
      return firebaseOptimizer.getCachedStorageFile(url);
    }
    return null;
  } catch (error) {
    console.error('❌ [Electron Main] Storage 캐시 읽기 실패:', error);
    return null;
  }
});

// Storage 파일 캐시 저장
ipcMain.handle('cache-storage-file', async (event, url, filePath) => {
  try {
    if (firebaseOptimizer) {
      firebaseOptimizer.cacheStorageFile(url, filePath);
      return { success: true };
    }
    return { success: false, error: 'Firebase optimizer not initialized' };
  } catch (error) {
    console.error('❌ [Electron Main] Storage 캐시 저장 실패:', error);
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
    // 스플래시 화면 먼저 표시 (앱 시작 시 즉시)
    splashWindow.createSplashWindow(app);
    
    // 스플래시 화면이 표시된 후 초기화 진행
    setTimeout(async () => {
      // 네이티브 캐시가 이미 로드되었지만 사용자에게 표시
      splashWindow.updateSplashStatus('네이티브 캐시 로드 중...', '로컬 캐시 데이터 활성화', 5);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      splashWindow.updateSplashStatus('초기 설정을 확인하는 중...', '시스템 설정 로드', 8);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 성능 최적화: 앱 우선순위 설정 (Windows)
      if (process.platform === 'win32') {
        try {
          splashWindow.updateSplashStatus('프로세스 우선순위 설정 중...', '성능 최적화 적용', 10);
          process.setPriority(process.platform === 'win32' ? 'high' : 0);
        } catch (error) {
          console.warn('⚠️ [Electron Main] 프로세스 우선순위 설정 실패:', error.message);
        }
      }
      
      // IPC 핸들러 등록 (윈도우 컨트롤용)
      splashWindow.updateSplashStatus('IPC 핸들러 등록 중...', '통신 시스템 초기화', 12);
      registerIpcHandlers();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 전역 에러 핸들러 등록
      splashWindow.updateSplashStatus('에러 핸들러 설정 중...', '오류 처리 시스템 준비', 15);
      setupGlobalErrorHandlers();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 업데이터 설정
      splashWindow.updateSplashStatus('업데이트 시스템 설정 중...', '자동 업데이트 준비', 18);
      updater.setupUpdater(app, mainWindow, preferDevServer);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      splashWindow.updateSplashStatus('메인 윈도우 생성 중...', '애플리케이션 인터페이스 준비', 20);
      createWindow(); // createWindow 내부에서 load()가 호출되어 HTML 로드 및 창 표시
      
      // 포스트잇 창은 자동으로 생성하지 않음 (TitleBar 버튼으로만 생성)
      // 메인 윈도우가 완전히 로드된 후 초기화 완료
      
      // createTray는 백그라운드에서 실행 (사용자 경험에 큰 영향 없음)
      tray = trayManager.createTray(app, mainWindow, postitWindow);
      
      // 성능 모니터링 시작 (mainWindow 생성 후)
      performanceMonitor.startPerformanceMonitoring(mainWindow, cacheManager.evictLRUItems, cacheManager.getCache());
      
      // 캐시 정기 작업 설정
      cacheManager.setupCachePeriodicTasks(mainWindow);
    
      // 앱 시작 후 10초 뒤에 첫 업데이트 체크
      setTimeout(() => {
        updater.checkForUpdates();
      }, 10000);
      
      // 주기적으로 업데이트 체크
      setInterval(() => {
        updater.checkForUpdates();
      }, updater.UPDATE_CHECK_INTERVAL);
    }, 100); // 스플래시 화면이 먼저 표시되도록 약간의 지연
  });
}

/**
 * 모든 윈도우가 닫혔을 때
 */
app.on('window-all-closed', () => {
  // 앱이 종료 중이면 처리하지 않음
  if (app.isQuitting) {
    return;
  }
  
  // macOS를 제외하고 앱 종료
  if (process.platform !== 'darwin') {
    // 포스트잇 창이 열려있는지 확인
    const isPostItOpen = postitWindow && postitWindow.isPostItWindowOpen();
    if (!isPostItOpen) {
      // 모든 창이 닫혔고 종료 중이 아니면 앱 종료
      app.quit();
    }
    // 포스트잇 창이 열려있으면 백그라운드에서 계속 실행 (트레이에만 표시)
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
app.on('before-quit', (event) => {
  // 이미 종료 플래그가 설정되어 있지 않으면 설정
  if (!app.isQuitting) {
    app.isQuitting = true;
  }
  
  console.log('[INFO] [Electron Main] 앱 종료 준비 중...');
  
  // 포스트잇 창 닫기
  try {
    if (postitWindow && postitWindow.isPostItWindowOpen()) {
      console.log('[INFO] [Electron Main] 포스트잇 창 닫는 중...');
      postitWindow.closePostItWindow();
    }
  } catch (error) {
    console.error('[ERROR] [Electron Main] 포스트잇 창 닫기 실패:', error);
  }
  
  // 캐시 저장
  try {
    cacheManager.cleanupExpiredCache();
    cacheManager.saveNativeCache();
  } catch (error) {
    console.error('[ERROR] [Electron Main] 캐시 저장 실패:', error);
  }
  
  // Firebase 최적화 정리
  try {
    if (firebaseOptimizer) {
      firebaseOptimizer.destroy();
      firebaseOptimizer = null;
    }
  } catch (error) {
    console.error('[ERROR] [Electron Main] Firebase 정리 실패:', error);
  }
  
  // 정적 서버가 켜져있으면 종료
  try {
    if (staticServerInstance) {
      staticServerInstance.close();
      staticServerInstance = null;
      staticServerPort = null;
    }
  } catch (error) {
    console.error('[ERROR] [Electron Main] 정적 서버 종료 실패:', error);
  }
  
  console.log('[INFO] [Electron Main] 종료 준비 완료');
});

// Windows 7 호환성을 위한 추가 설정
if (process.platform === 'win32') {
  app.setAppUserModelId('com.hs.hr');
  
  // Windows 성능 최적화
  try {
    // Windows 메모리 관리 최적화
    app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor'); // 디스플레이 컴포지터 비활성화 (성능)
  } catch {}
}

// 성능 모니터링은 mainWindow가 생성된 후 시작 (아래에서 호출)

// 주기적으로 Storage 캐시 정리 (6시간마다) - 더 자주 정리하여 디스크 공간 절약
setInterval(() => {
  if (firebaseOptimizer) {
    firebaseOptimizer.cleanupStorageCache();
  }
}, 6 * 60 * 60 * 1000);
