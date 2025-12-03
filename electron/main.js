const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const registerIpcHandlers = require('./ipc-handlers');
const notificationWindow = require('./notification-window');
const { FirebaseOptimizer } = require('./firebase-optimizer');

/**
 * 네이티브 파일 시스템 캐시 관리 (메모리 누수 방지 및 자동 정리)
 * 앱 데이터 디렉토리에 JSON 파일로 캐시 저장 (네이티브처럼 빠른 접근)
 */
const CACHE_DIR = path.join(app.getPath('userData'), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'data-cache.json');
const CACHE_STATS_FILE = path.join(CACHE_DIR, 'cache-stats.json');

// 캐시 설정
const CACHE_CONFIG = {
  MAX_SIZE: 1000,                    // 최대 캐시 항목 수
  MAX_MEMORY_MB: 50,                 // 최대 메모리 사용량 (MB)
  DEFAULT_TTL: 7 * 24 * 60 * 60 * 1000, // 기본 TTL: 7일
  CLEANUP_INTERVAL: 60 * 60 * 1000,  // 정리 주기: 1시간
  SAVE_INTERVAL: 5 * 60 * 1000,      // 저장 주기: 5분
};

// 캐시 항목 구조: { data: any, timestamp: number, accessCount: number, lastAccess: number }
let nativeCache = new Map();
let cacheStats = {
  totalItems: 0,
  totalSize: 0,
  hitCount: 0,
  missCount: 0,
  evictionCount: 0,
  lastCleanup: Date.now(),
};

// 캐시 디렉토리 생성
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// 캐시 항목 크기 추정 (바이트)
function estimateCacheItemSize(key, value) {
  try {
    const keySize = Buffer.byteLength(key, 'utf-8');
    const valueSize = Buffer.byteLength(JSON.stringify(value), 'utf-8');
    return keySize + valueSize + 100; // 메타데이터 오버헤드 포함
  } catch {
    return 1024; // 기본값: 1KB
  }
}

// 캐시 통계 로드
function loadCacheStats() {
  try {
    if (fs.existsSync(CACHE_STATS_FILE)) {
      const data = fs.readFileSync(CACHE_STATS_FILE, 'utf-8');
      cacheStats = { ...cacheStats, ...JSON.parse(data) };
    }
  } catch (error) {
    console.warn('⚠️ [Electron Main] 캐시 통계 로드 실패:', error.message);
  }
}

// 캐시 통계 저장
function saveCacheStats() {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_STATS_FILE, JSON.stringify(cacheStats, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ [Electron Main] 캐시 통계 저장 실패:', error);
  }
}

// 캐시 파일에서 데이터 로드
function loadNativeCache() {
  try {
    ensureCacheDir();
    loadCacheStats();
    
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const now = Date.now();
      let loadedCount = 0;
      let expiredCount = 0;
      
      // 캐시 로드 및 만료된 항목 필터링
      for (const [key, item] of Object.entries(parsed)) {
        if (item && typeof item === 'object' && item.timestamp) {
          // TTL 확인
          const age = now - item.timestamp;
          const ttl = item.ttl || CACHE_CONFIG.DEFAULT_TTL;
          
          if (age < ttl) {
            nativeCache.set(key, item);
            loadedCount++;
          } else {
            expiredCount++;
          }
        } else {
          // 구버전 형식 호환 (타임스탬프 없음)
          nativeCache.set(key, {
            data: item,
            timestamp: now,
            accessCount: 0,
            lastAccess: now,
            ttl: CACHE_CONFIG.DEFAULT_TTL,
          });
          loadedCount++;
        }
      }
      
      cacheStats.totalItems = nativeCache.size;
      console.log(`✅ [Electron Main] 네이티브 캐시 로드 완료: ${loadedCount}개 항목 (만료: ${expiredCount}개)`);
      
      // 만료된 항목이 있으면 즉시 저장
      if (expiredCount > 0) {
        saveNativeCache();
      }
    }
  } catch (error) {
    console.warn('⚠️ [Electron Main] 캐시 로드 실패 (무시 가능):', error.message);
    nativeCache = new Map();
  }
}

// 캐시 파일에 데이터 저장
function saveNativeCache() {
  try {
    ensureCacheDir();
    const data = {};
    let totalSize = 0;
    
    for (const [key, item] of nativeCache.entries()) {
      data[key] = item;
      totalSize += estimateCacheItemSize(key, item);
    }
    
    cacheStats.totalSize = totalSize;
    cacheStats.totalItems = nativeCache.size;
    
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    saveCacheStats();
  } catch (error) {
    console.error('❌ [Electron Main] 캐시 저장 실패:', error);
  }
}

// LRU 기반 캐시 정리 (가장 오래 사용하지 않은 항목 제거)
function evictLRUItems(count = 10) {
  const items = Array.from(nativeCache.entries())
    .map(([key, item]) => ({
      key,
      lastAccess: item.lastAccess || item.timestamp || 0,
      accessCount: item.accessCount || 0,
    }))
    .sort((a, b) => {
      // 먼저 접근 횟수로 정렬, 같으면 마지막 접근 시간으로 정렬
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      return a.lastAccess - b.lastAccess;
    });
  
  let evicted = 0;
  for (let i = 0; i < Math.min(count, items.length); i++) {
    nativeCache.delete(items[i].key);
    evicted++;
  }
  
  cacheStats.evictionCount += evicted;
  return evicted;
}

// 오래된 캐시 정리 (TTL 기반)
function cleanupExpiredCache() {
  const now = Date.now();
  let expiredCount = 0;
  
  for (const [key, item] of nativeCache.entries()) {
    if (item && item.timestamp) {
      const age = now - item.timestamp;
      const ttl = item.ttl || CACHE_CONFIG.DEFAULT_TTL;
      
      if (age >= ttl) {
        nativeCache.delete(key);
        expiredCount++;
      }
    }
  }
  
  if (expiredCount > 0) {
    console.log(`🧹 [Electron Main] 만료된 캐시 ${expiredCount}개 정리 완료`);
  }
  
  // 캐시 크기가 최대치를 넘으면 LRU로 정리
  if (nativeCache.size > CACHE_CONFIG.MAX_SIZE) {
    const excess = nativeCache.size - CACHE_CONFIG.MAX_SIZE;
    const evicted = evictLRUItems(excess);
    console.log(`🧹 [Electron Main] LRU 캐시 ${evicted}개 정리 완료 (최대 크기 초과)`);
  }
  
  cacheStats.lastCleanup = now;
  saveNativeCache();
}

// 메모리 사용량 확인 및 정리
function checkMemoryUsage() {
  try {
    const stats = process.memoryUsage();
    const heapUsedMB = stats.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > CACHE_CONFIG.MAX_MEMORY_MB) {
      console.warn(`⚠️ [Electron Main] 메모리 사용량 높음: ${heapUsedMB.toFixed(2)}MB`);
      // 캐시의 20% 제거
      const evictCount = Math.ceil(nativeCache.size * 0.2);
      evictLRUItems(evictCount);
      console.log(`🧹 [Electron Main] 메모리 압박으로 캐시 ${evictCount}개 정리`);
    }
  } catch (error) {
    // 메모리 체크 실패는 무시
  }
}

// 앱 시작 시 캐시 로드
loadNativeCache();

// 앱 종료 시 캐시 저장
app.on('before-quit', () => {
  cleanupExpiredCache();
  saveNativeCache();
  saveCacheStats();
  
  // Firebase 최적화 정리
  if (firebaseOptimizer) {
    firebaseOptimizer.destroy();
    firebaseOptimizer = null;
  }
});

// 주기적으로 캐시 저장 (5분마다)
setInterval(() => {
  saveNativeCache();
}, CACHE_CONFIG.SAVE_INTERVAL);

// 주기적으로 캐시 정리 (1시간마다)
setInterval(() => {
  cleanupExpiredCache();
  checkMemoryUsage();
}, CACHE_CONFIG.CLEANUP_INTERVAL);

// 개발 서버 사용 여부를 명시적으로 제어
// 패키지된 앱(설치본)에서는 무조건 로컬 정적 서버 사용
const DEV_SERVER_URL = process.env.ELECTRON_DEV_SERVER_URL || 'http://localhost:5173';
// 패키지된 앱이면 웹 서버 사용 안 함, 아니면 환경 변수로 제어
const preferDevServer = !app.isPackaged && process.env.ELECTRON_DEV !== 'false';
const isDev = preferDevServer; // 개발자 도구/단축키 동작 기준
const openDevToolsOnStart = process.env.ELECTRON_OPEN_DEVTOOLS === 'true';

// 개발 모드에서는 autoUpdater 비활성화
if (process.env.NODE_ENV === 'development' || preferDevServer) {
  autoUpdater.updateConfigPath = null; // 개발 환경에서는 업데이트 체크 안 함
}

// autoUpdater 설정
autoUpdater.autoDownload = false; // 자동 다운로드 비활성화 (사용자 승인 필요)
autoUpdater.autoInstallOnAppQuit = true; // 앱 종료 시 자동 설치
autoUpdater.allowPrerelease = false; // 프리릴리스 비활성화
// delta 업데이트: electron-updater가 자동으로 latest.yml을 확인하여
// blockmap을 사용한 delta 업데이트를 지원 (변경된 부분만 다운로드)

// 업데이트 체크 간격 (30분마다)
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;

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
    const outDir = path.join(__dirname, '../dist');
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        let pathname = decodeURIComponent(url.pathname);
        
        // Windows 경로 구분자 처리: URL 경로를 파일 시스템 경로로 변환
        pathname = pathname.replace(/\//g, path.sep);
        // 선행 구분자 제거 (Windows 경로는 절대 경로가 아니므로)
        if (pathname.startsWith(path.sep)) {
          pathname = pathname.substring(1);
        }
        
        if (pathname === '' || pathname === 'index.html') {
          pathname = 'index.html';
        }
        // 디렉토리 요청은 index.html 제공
        if (pathname.endsWith(path.sep)) {
          pathname = pathname + 'index.html';
        }
        
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

          if (!err && stat.isFile()) {
            // 파일이 존재하면 바로 서빙
            return serveFile(filePath);
          }

          if (!err && stat.isDirectory()) {
            // 디렉토리인 경우 index.html 시도
            const indexPath = path.join(filePath, 'index.html');
            return serveFile(indexPath);
          }

          // 파일이 없는 경우
          // 원본 URL pathname 사용 (Windows 경로 변환 전)
          const originalPathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
          const ext = path.extname(originalPathname).toLowerCase();
          const isStaticResource = ['.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map'].includes(ext);
          
          if (isStaticResource) {
            // 정적 리소스는 404 반환 (폴백 없음)
            res.statusCode = 404;
            res.end('Not Found');
            return;
          }

          // HTML 파일이나 경로인 경우에만 index.html 폴백 (SPA 라우팅)
          // 최종 폴백: 루트 index.html (SPA 라우팅)
          const rootIndex = path.join(outDir, 'index.html');
          fs.stat(rootIndex, (rootErr, rootStat) => {
            if (!rootErr && rootStat.isFile()) {
              return serveFile(rootIndex);
            }
            res.statusCode = 404;
            res.end('Not Found');
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
      // 추가 보안 설정
      sandbox: false, // preload 사용 시 false (필수)
      spellcheck: false, // 맞춤법 검사 비활성화 (성능)
      // 리소스 제한 및 성능 최적화
      v8CacheOptions: 'code', // V8 캐시 최적화
      // 성능 최적화: 백그라운드 스로틀링 비활성화 (백그라운드에서도 동작)
      backgroundThrottling: false, // 백그라운드에서도 성능 유지
      // 메모리 최적화
      offscreen: false, // 오프스크린 렌더링 비활성화 (메모리 절약)
    },
    icon: getResourcePath('public/tms-logo.png'),
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
    
    // 성능 최적화: 불필요한 기능 비활성화
    mainWindow.webContents.executeJavaScript(`
      // 불필요한 이벤트 리스너 최소화
      if (window.chrome && window.chrome.runtime) {
        // Chrome 확장 프로그램 관련 비활성화
      }
      
      // 성능 모니터링 API 비활성화 (프로덕션)
      if (typeof PerformanceObserver !== 'undefined') {
        // 필요한 경우에만 활성화
      }
    `).catch(() => {});
    
    // CSP (Content Security Policy) 헤더 추가 (보안 강화)
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
  
  // 메모리 최적화: 페이지가 보이지 않을 때 리소스 정리
  mainWindow.on('hide', () => {
    // 윈도우가 숨겨지면 일부 리소스 정리 (선택적)
    if (app.isPackaged) {
      mainWindow.webContents.session.clearCache().catch(() => {});
    }
  });
  
  // 메모리 압박 시 자동 정리
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    if (details.reason === 'clean-exit') {
      // 정상 종료 시 리소스 정리
      cleanupWindowResources();
    }
  });

  // 외부 네비게이션 제한 (보안)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!shouldAllowNavigation(navigationUrl)) {
      console.warn(`⚠️ [Electron Main] 외부 URL 로드 차단: ${navigationUrl}`);
      event.preventDefault();
    }
  });

  // 새 윈도우 열기 제한 (보안)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!shouldAllowNavigation(url)) {
      console.warn(`⚠️ [Electron Main] 새 윈도우 열기 차단: ${url}`);
      return { action: 'deny' };
    }
    // 허용된 URL은 기본 브라우저에서 열기
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 패키지된 앱이면 파일 직접 로드 (네이티브처럼 빠름), 개발 모드면 개발 서버 사용
  const load = async () => {
    await mainWindow.webContents.session.clearCache();
    
    if (app.isPackaged) {
      // 프로덕션 빌드: 파일 시스템에서 직접 로드 (HTTP 서버 없이, 네이티브처럼 빠름)
      const indexPath = getResourcePath('dist/index.html');
      console.log(`✅ [Electron Main] 파일 직접 로드: ${indexPath}`);
      await mainWindow.loadFile(indexPath);
    } else {
      // 개발 모드: 개발 서버 사용
      devServerInUse = true;
      console.log(`✅ [Electron Main] 개발 서버 사용: ${DEV_SERVER_URL}`);
      await mainWindow.loadURL(DEV_SERVER_URL);
    }
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
      if (!hasLoggedNotificationPermission) {
        console.log('✅ [Electron Main] 알림 권한 허용됨');
        hasLoggedNotificationPermission = true;
      }
    } else {
      callback(false);
    }
  });
  
  // Windows 알림 권한 확인 (프로덕션 빌드)
  if (app.isPackaged && process.platform === 'win32') {
    // Windows 10/11에서 알림이 작동하려면 시스템 알림 설정이 활성화되어 있어야 함
    // 이는 사용자가 시스템 설정에서 허용해야 함
    console.log('ℹ️ [Electron Main] Windows 알림 권한 확인 - 시스템 설정에서 알림이 활성화되어 있어야 합니다.');
  }

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
    
    // Firebase 최적화 시작
    if (!firebaseOptimizer) {
      firebaseOptimizer = new FirebaseOptimizer(mainWindow);
    }
  });

  // 윈도우 닫기 이벤트
  mainWindow.on('close', (event) => {
    // 실제 종료하려는 경우가 아니면 트레이로 최소화
    if (!app.isQuitting && process.platform !== 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    } else {
      // 실제 종료 전 리소스 정리
      cleanupWindowResources();
      mainWindow = null;
    }
  });

  mainWindow.on('closed', () => {
    // Firebase 최적화 정리
    if (firebaseOptimizer) {
      firebaseOptimizer.destroy();
      firebaseOptimizer = null;
    }
    mainWindow = null;
  });

  // 메모리 누수 방지: 윈도우가 닫힐 때 리소스 정리
  mainWindow.webContents.on('destroyed', () => {
    cleanupWindowResources();
  });
}

/**
 * 시스템 트레이 생성
 */
function createTray() {
  // 트레이 아이콘 (16x16 또는 32x32 권장)
  const iconPath = getResourcePath('public/tms-logo.png');
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
 * 윈도우 리소스 정리 (메모리 누수 방지)
 */
function cleanupWindowResources() {
  try {
    // 세션 캐시 정리 (선택적)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.session.clearCache().catch(() => {});
    }
  } catch (error) {
    console.warn('⚠️ [Electron Main] 리소스 정리 실패:', error.message);
  }
}

/**
 * 외부 URL 로드 제한 (보안 강화)
 */
function shouldAllowNavigation(url) {
  try {
    const parsedUrl = new URL(url);
    
    // 로컬 파일 허용
    if (parsedUrl.protocol === 'file:') {
      return true;
    }
    
    // 개발 서버 허용
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
      return true;
    }
    
    // 프로덕션 빌드에서는 외부 URL 차단
    if (app.isPackaged) {
      // Firebase 등 허용된 도메인만 허용
      const allowedDomains = [
        'firebase.googleapis.com',
        'firebaseapp.com',
        'googleapis.com',
      ];
      
      return allowedDomains.some(domain => parsedUrl.hostname.includes(domain));
    }
    
    return true; // 개발 모드에서는 모두 허용
  } catch {
    return false;
  }
}

/**
 * 프로덕션/개발 환경에 따른 리소스 경로 가져오기
 */
function getResourcePath(relativePath) {
  let finalPath;
  if (app.isPackaged) {
    // 프로덕션 빌드: resources 디렉토리 기준
    finalPath = path.join(process.resourcesPath, 'app', relativePath);
  } else {
    // 개발 환경: __dirname 기준
    finalPath = path.join(__dirname, relativePath);
  }
  
  // 디버깅: 프로덕션 빌드에서 경로 확인
  if (app.isPackaged && !fs.existsSync(finalPath)) {
    console.warn(`⚠️ [Electron Main] 리소스 경로를 찾을 수 없습니다: ${finalPath}`);
    // 대안 경로 시도
    const altPath = path.join(process.resourcesPath, relativePath);
    if (fs.existsSync(altPath)) {
      console.log(`✅ [Electron Main] 대안 경로 사용: ${altPath}`);
      return altPath;
    }
  }
  
  return finalPath;
}

/**
 * 커스텀 알림 표시
 */
ipcMain.handle('show-notification', async (event, options) => {
  // IPC 채널 검증
  if (!validateIpcChannel('show-notification')) {
    return { success: false, error: 'Unauthorized' };
  }
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
    
    // 프로덕션 빌드에서 아이콘 경로 설정
    const defaultIcon = icon || getResourcePath('public/tms-logo.png');
    
    // 커스텀 알림 사용
    if (useCustom) {
      try {
        notificationWindow.createNotification({
          title: title || 'TMS 통합관리시스템',
          subtitle: subtitle,  // ✅ 서브타이틀 추가
          body: body || '',
          icon: defaultIcon,
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
    try {
      // 아이콘 파일 존재 여부 확인
      let iconToUse = defaultIcon;
      if (!fs.existsSync(iconToUse)) {
        console.warn('⚠️ [Electron Main] 아이콘 파일을 찾을 수 없습니다:', iconToUse);
        // 아이콘 없이 알림 표시 시도
        iconToUse = undefined;
      }
      
      const notification = new Notification({
        title: title || 'TMS 통합관리시스템',
        body: body || '',
        icon: iconToUse,
        silent: false
      });

      notification.show();
      
      console.log('✅ [Electron Main] 네이티브 알림 표시됨:', { title, body });

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
      
      notification.on('show', () => {
        console.log('✅ [Electron Main] 알림이 화면에 표시되었습니다.');
      });
      
      notification.on('error', (error) => {
        console.error('❌ [Electron Main] 알림 표시 오류:', error);
      });
      
      return { success: true, type: 'native' };
    } catch (notifError) {
      console.error('❌ [Electron Main] 네이티브 알림 생성 실패:', notifError);
      // 최종 폴백: 작업 표시줄 깜빡임만 사용
      if (mainWindow) {
        mainWindow.flashFrame(true);
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.flashFrame(false);
          }
        }, 3000);
      }
      return { success: false, error: notifError.message, type: 'fallback' };
    }
  } catch (error) {
    console.error('❌ [Electron] 알림 표시 실패:', error);
    console.error('❌ [Electron] Error stack:', error.stack);
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

// IPC 핸들러: 업데이트 체크 요청 (프론트엔드에서 호출)
safeIpcHandle('check-for-updates', async (event) => {
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
    // quitAndInstall의 첫 번째 인자:
    // - false: 설치 프로그램 창 표시 안 함 (조용히 설치)
    // - true: 설치 프로그램 창 표시
    // 두 번째 인자:
    // - true: 설치 후 자동 재시작
    // 이렇게 하면 백그라운드에서 조용히 설치되고 별도 창이 뜨지 않음
    autoUpdater.quitAndInstall(false, true); 
    return { success: true };
  } catch (error) {
    console.error('[Updater] 설치 실패:', error);
    return { success: false, error: error.message };
  }
});

/**
 * 네이티브 파일 시스템 캐시 IPC 핸들러 (메모리 누수 방지 포함)
 */
// 네이티브 캐시에서 데이터 가져오기
ipcMain.handle('get-cached-data', async (event, key) => {
  try {
    if (key) {
      // 특정 키 조회
      const item = nativeCache.get(key);
      if (!item) {
        cacheStats.missCount++;
        return null;
      }
      
      // TTL 확인
      const now = Date.now();
      const age = now - item.timestamp;
      const ttl = item.ttl || CACHE_CONFIG.DEFAULT_TTL;
      
      if (age >= ttl) {
        // 만료된 항목 삭제
        nativeCache.delete(key);
        cacheStats.missCount++;
        return null;
      }
      
      // 접근 정보 업데이트
      item.lastAccess = now;
      item.accessCount = (item.accessCount || 0) + 1;
      nativeCache.set(key, item);
      
      cacheStats.hitCount++;
      return item.data;
    } else {
      // 전체 캐시 반환 (데이터만)
      const result = {};
      for (const [k, item] of nativeCache.entries()) {
        result[k] = item.data;
      }
      return result;
    }
  } catch (error) {
    console.error('❌ [Electron Main] 캐시 읽기 실패:', error);
    cacheStats.missCount++;
    return null;
  }
});

// 네이티브 캐시에 데이터 저장
ipcMain.handle('set-cached-data', async (event, key, data, options = {}) => {
  try {
    // 캐시 크기 확인 및 정리
    if (nativeCache.size >= CACHE_CONFIG.MAX_SIZE) {
      evictLRUItems(10); // 10개 제거
    }
    
    const now = Date.now();
    const item = {
      data,
      timestamp: now,
      lastAccess: now,
      accessCount: 0,
      ttl: options.ttl || CACHE_CONFIG.DEFAULT_TTL,
    };
    
    nativeCache.set(key, item);
    
    // 비동기로 저장 (블로킹 안 함)
    setImmediate(() => {
      saveNativeCache();
    });
    
    return { success: true };
  } catch (error) {
    console.error('❌ [Electron Main] 캐시 저장 실패:', error);
    return { success: false, error: error.message };
  }
});

// 네이티브 캐시에서 데이터 삭제
ipcMain.handle('delete-cached-data', async (event, key) => {
  try {
    const deleted = nativeCache.delete(key);
    if (deleted) {
      setImmediate(() => {
        saveNativeCache();
      });
    }
    return { success: true, deleted };
  } catch (error) {
    console.error('❌ [Electron Main] 캐시 삭제 실패:', error);
    return { success: false, error: error.message };
  }
});

// 네이티브 캐시 전체 삭제
ipcMain.handle('clear-cached-data', async (event) => {
  try {
    nativeCache.clear();
    cacheStats.totalItems = 0;
    cacheStats.totalSize = 0;
    
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
    if (fs.existsSync(CACHE_STATS_FILE)) {
      fs.unlinkSync(CACHE_STATS_FILE);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ [Electron Main] 캐시 전체 삭제 실패:', error);
    return { success: false, error: error.message };
  }
});

// 캐시 통계 조회
ipcMain.handle('get-cache-stats', async (event) => {
  try {
    const stats = process.memoryUsage();
    return {
      ...cacheStats,
      cacheSize: nativeCache.size,
      memoryUsage: {
        heapUsed: Math.round(stats.heapUsed / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(stats.heapTotal / 1024 / 1024 * 100) / 100, // MB
        rss: Math.round(stats.rss / 1024 / 1024 * 100) / 100, // MB
      },
      hitRate: cacheStats.hitCount + cacheStats.missCount > 0
        ? Math.round((cacheStats.hitCount / (cacheStats.hitCount + cacheStats.missCount)) * 100 * 100) / 100
        : 0,
    };
  } catch (error) {
    console.error('❌ [Electron Main] 캐시 통계 조회 실패:', error);
    return null;
  }
});

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
    // 성능 최적화: 앱 우선순위 설정 (Windows)
    if (process.platform === 'win32') {
      try {
        // 높은 우선순위로 설정 (성능 향상)
        process.setPriority(process.platform === 'win32' ? 'high' : 0);
      } catch (error) {
        console.warn('⚠️ [Electron Main] 프로세스 우선순위 설정 실패:', error.message);
      }
    }
    
    // IPC 핸들러 등록 (윈도우 컨트롤용)
    registerIpcHandlers();
    
    // 전역 에러 핸들러 등록
    setupGlobalErrorHandlers();
    
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
  
  // Windows 성능 최적화
  try {
    // Windows 메모리 관리 최적화
    app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor'); // 디스플레이 컴포지터 비활성화 (성능)
  } catch {}
}

/**
 * 앱 성능 모니터링 및 자동 최적화
 */
function startPerformanceMonitoring() {
  let consecutiveHighMemoryCount = 0;
  
  setInterval(() => {
    try {
      const stats = process.memoryUsage();
      const heapUsedMB = stats.heapUsed / 1024 / 1024;
      const heapTotalMB = stats.heapTotal / 1024 / 1024;
      const rssMB = stats.rss / 1024 / 1024;
      
      // 메모리 사용량이 높으면 경고 및 자동 정리
      if (heapUsedMB > 200) {
        consecutiveHighMemoryCount++;
        console.warn(`⚠️ [Electron Main] 메모리 사용량 높음: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (RSS: ${rssMB.toFixed(2)}MB)`);
        
        // 연속으로 메모리 사용량이 높으면 강제 정리
        if (consecutiveHighMemoryCount >= 3) {
          console.log('🧹 [Electron Main] 메모리 압박 감지, 강제 정리 시작...');
          
          // 캐시 정리
          if (nativeCache.size > 0) {
            const evictCount = Math.ceil(nativeCache.size * 0.3);
            evictLRUItems(evictCount);
          }
          
          // 세션 캐시 정리
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.session.clearCache().catch(() => {});
          }
          
          // 가비지 컬렉션 힌트 (V8)
          if (global.gc) {
            global.gc();
          }
          
          consecutiveHighMemoryCount = 0;
        }
      } else {
        consecutiveHighMemoryCount = 0;
      }
      
      // 메인 윈도우에 성능 메트릭 전송 (선택적)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('performance-metrics', {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          rss: rssMB,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      // 성능 모니터링 실패는 무시
    }
  }, 5 * 60 * 1000); // 5분마다 체크
}

// 성능 모니터링 시작
startPerformanceMonitoring();

// 주기적으로 Storage 캐시 정리 (1일마다)
setInterval(() => {
  if (firebaseOptimizer) {
    firebaseOptimizer.cleanupStorageCache();
  }
}, 24 * 60 * 60 * 1000);
