const { BrowserWindow, app, screen } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * 포스트잇 전용 독립 창 관리
 * 메인 윈도우와 독립적으로 동작하며 항상 위에 표시됨
 */

let postitWindow = null;

// 포스트잇 창 모드: 'always-on-top' (항상 위), 'desktop' (배경화면 위), 'hidden' (숨김)
let postitWindowMode = 'always-on-top';

/**
 * 리소스 경로 가져오기
 */
function getResourcePath(relativePath) {
  let finalPath;
  if (app.isPackaged) {
    finalPath = path.join(process.resourcesPath, 'app', relativePath);
  } else {
    finalPath = path.join(__dirname, '..', relativePath);
  }
  
  if (app.isPackaged && !fs.existsSync(finalPath)) {
    const altPath = path.join(process.resourcesPath, relativePath);
    if (fs.existsSync(altPath)) {
      return altPath;
    }
  }
  
  return finalPath;
}

/**
 * 메인 창 참조 저장 (desktop 모드에서 사용)
 */
let mainWindowRef = null;

/**
 * 포스트잇 창 생성
 */
function createPostItWindow(mainWindow) {
  console.log('[OK] [PostIt Window] createPostItWindow 시작');
  
  // 메인 창 참조 저장
  mainWindowRef = mainWindow;
  
  // 이미 창이 있으면 기존 창 표시
  if (postitWindow && !postitWindow.isDestroyed()) {
    console.log('[OK] [PostIt Window] 기존 창 재사용');
    postitWindow.show();
    postitWindow.focus();
    return postitWindow;
  }
  
  console.log('[OK] [PostIt Window] 새 창 생성 중...');

  // 모든 모니터 정보 가져오기
  const allDisplays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // 포스트잇 창 위치 및 크기 설정 (저장된 위치가 있으면 사용, 없으면 기본값)
  // 기본값: 주 모니터의 작업 영역 전체
  const { width: defaultWidth, height: defaultHeight } = primaryDisplay.workAreaSize;
  const defaultX = primaryDisplay.workArea.x;
  const defaultY = primaryDisplay.workArea.y;
  
  // 저장된 창 위치 가져오기
  let windowX = defaultX;
  let windowY = defaultY;
  let windowWidth = defaultWidth;
  let windowHeight = defaultHeight;
  
  try {
    const positionFilePath = path.join(app.getPath('userData'), 'postit-window-position.json');
    if (fs.existsSync(positionFilePath)) {
      const positionData = JSON.parse(fs.readFileSync(positionFilePath, 'utf-8'));
      
      // 저장된 위치가 유효한 모니터에 있는지 확인
      const isValidPosition = allDisplays.some(display => {
        const { x, y, width, height } = display.bounds;
        return positionData.x >= x && positionData.y >= y && 
               positionData.x < x + width && positionData.y < y + height;
      });
      
      if (isValidPosition && positionData.width && positionData.height) {
        windowX = positionData.x;
        windowY = positionData.y;
        windowWidth = Math.max(400, Math.min(positionData.width, defaultWidth * 2));
        windowHeight = Math.max(300, Math.min(positionData.height, defaultHeight * 2));
        console.log(`[OK] [PostIt Window] 저장된 위치 복원:`, { x: windowX, y: windowY, width: windowWidth, height: windowHeight });
      } else {
        console.log(`[OK] [PostIt Window] 저장된 위치가 유효하지 않음, 기본값 사용`);
      }
    }
  } catch (error) {
    console.error(`[ERROR] [PostIt Window] 위치 복원 실패:`, error);
  }

  console.log(`[OK] [PostIt Window] BrowserWindow 생성 - 위치: (${windowX}, ${windowY}), 크기: ${windowWidth}x${windowHeight}`);
  
  const postitWindowInstance = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    minWidth: 400,
    minHeight: 300,
    backgroundColor: 'transparent',
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true, // 작업 표시줄에 표시하지 않음
    resizable: true,
    movable: true, // 창 이동 가능 (다중 모니터에서 자유롭게 이동)
    minimizable: false,
    maximizable: false,
    closable: false, // X 버튼 없음 (포스트잇 위젯에서 제어)
    focusable: true, // 포스트잇 클릭 가능
    acceptFirstMouse: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      partition: 'persist:postit', // 메인 윈도우와 별도 세션
      enableBlinkFeatures: 'CSSFontFeatureValues',
      sandbox: false,
      spellcheck: false,
      v8CacheOptions: 'code',
      backgroundThrottling: false,
      offscreen: false,
    },
    show: false, // 준비 완료 후 표시
  });

  // 포스트잇은 클릭 가능해야 하므로 마우스 이벤트를 받아야 함
  // setIgnoreMouseEvents는 사용하지 않음
  
  // load 전에는 창을 표시하지 않음 (did-finish-load에서 표시)

  const load = async () => {
    console.log('[OK] [PostIt Window] 로드 시작');
    
    // did-start-loading 이벤트에서 즉시 배경 투명 처리 (가장 빠른 시점)
    postitWindowInstance.webContents.on('did-start-loading', () => {
      console.log('[OK] [PostIt Window] did-start-loading 이벤트 발생');
      postitWindowInstance.webContents.executeJavaScript(`
        (function() {
          // 즉시 배경 투명 처리
          if (document.documentElement) {
            document.documentElement.style.setProperty('background', 'transparent', 'important');
            document.documentElement.style.setProperty('background-color', 'transparent', 'important');
            document.documentElement.setAttribute('data-postit-mode', 'true');
          }
          if (document.body) {
            document.body.style.setProperty('background', 'transparent', 'important');
            document.body.style.setProperty('background-color', 'transparent', 'important');
            document.body.setAttribute('data-postit-mode', 'true');
          }
          const root = document.getElementById('root');
          if (root) {
            root.style.setProperty('background', 'transparent', 'important');
            root.style.setProperty('background-color', 'transparent', 'important');
          }
        })();
      `).catch(() => {});
    });
    
    // dom-ready 이벤트에서 hash 설정 및 배경 투명 재확인
    postitWindowInstance.webContents.once('dom-ready', () => {
      console.log('[OK] [PostIt Window] dom-ready 이벤트 발생');
      
      // DOM이 준비되면 즉시 hash 설정 및 배경 투명 강제 적용
      postitWindowInstance.webContents.executeJavaScript(`
        (function() {
          // hash 설정
          if (!window.location.hash.includes('mode=postit')) {
            window.location.hash = '#/?mode=postit';
          }
          
          // 배경 투명 강제 적용
          if (document.documentElement) {
            document.documentElement.style.setProperty('background', 'transparent', 'important');
            document.documentElement.style.setProperty('background-color', 'transparent', 'important');
            document.documentElement.setAttribute('data-postit-mode', 'true');
          }
          if (document.body) {
            document.body.style.setProperty('background', 'transparent', 'important');
            document.body.style.setProperty('background-color', 'transparent', 'important');
            document.body.setAttribute('data-postit-mode', 'true');
          }
          const root = document.getElementById('root');
          if (root) {
            root.style.setProperty('background', 'transparent', 'important');
            root.style.setProperty('background-color', 'transparent', 'important');
          }
        })();
      `).catch(() => {});
    });
    
    // did-finish-load 이벤트에서도 재확인
    postitWindowInstance.webContents.once('did-finish-load', () => {
      postitWindowInstance.webContents.executeJavaScript(`
        (function() {
          // 최종 배경 투명 확인
          if (document.body) {
            document.body.style.setProperty('background', 'transparent', 'important');
            document.body.style.setProperty('background-color', 'transparent', 'important');
          }
          if (document.documentElement) {
            document.documentElement.style.setProperty('background', 'transparent', 'important');
            document.documentElement.style.setProperty('background-color', 'transparent', 'important');
          }
          const root = document.getElementById('root');
          if (root) {
            root.style.setProperty('background', 'transparent', 'important');
            root.style.setProperty('background-color', 'transparent', 'important');
            // root의 모든 자식도 투명하게
            const children = root.children;
            for (let i = 0; i < children.length; i++) {
              const child = children[i] as HTMLElement;
              if (child.style) {
                child.style.setProperty('background', 'transparent', 'important');
                child.style.setProperty('background-color', 'transparent', 'important');
              }
            }
          }
        })();
      `).catch(() => {});
    });
    
    if (app.isPackaged) {
      // 프로덕션: 별도 HTML 파일 로드
      const indexPath = getResourcePath('dist/index.html');
      console.log(`[OK] [PostIt Window] 파일 직접 로드: ${indexPath}`);
      
      await postitWindowInstance.loadFile(indexPath, {
        hash: '?mode=postit'
      });
    } else {
      // 개발: Vite dev 서버 사용
      const DEV_SERVER_URL = process.env.ELECTRON_DEV_SERVER_URL || 'http://localhost:5173';
      const postitUrl = `${DEV_SERVER_URL}#/?mode=postit`;
      console.log(`[OK] [PostIt Window] 개발 서버 사용: ${postitUrl}`);
      
      try {
        await postitWindowInstance.loadURL(postitUrl);
        console.log('[OK] [PostIt Window] URL 로드 완료');
      } catch (error) {
        console.error('[ERROR] [PostIt Window] URL 로드 실패:', error);
        // 로드 실패 시에도 창은 표시 (에러 페이지라도 보이도록)
        updatePostItWindowMode(postitWindowInstance, postitWindowMode, mainWindowRef);
      }
    }
    
    // 창 모드에 따라 표시 (updatePostItWindowMode에서 show 호출)
    // React가 완전히 로드될 때까지 기다린 후 표시
    postitWindowInstance.webContents.once('did-finish-load', () => {
      console.log('[OK] [PostIt Window] did-finish-load 이벤트 발생');
      
      // React가 완전히 렌더링될 때까지 대기
      // 포스트잇 모드가 제대로 인식되고 배경이 투명해질 때까지 기다림
      setTimeout(() => {
        console.log('[OK] [PostIt Window] 창 표시 준비 중...');
        
        // 한 번 더 배경 투명 확인 및 강제 적용
        postitWindowInstance.webContents.executeJavaScript(`
          (function() {
            // 최종 배경 투명 확인 및 강제 적용
            document.documentElement.style.setProperty('background', 'transparent', 'important');
            document.documentElement.style.setProperty('background-color', 'transparent', 'important');
            document.body.style.setProperty('background', 'transparent', 'important');
            document.body.style.setProperty('background-color', 'transparent', 'important');
            const root = document.getElementById('root');
            if (root) {
              root.style.setProperty('background', 'transparent', 'important');
              root.style.setProperty('background-color', 'transparent', 'important');
            }
            // 모든 최상위 요소도 투명하게
            const allElements = document.querySelectorAll('body > *');
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement;
              if (el.id !== 'root' && el.style) {
                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
              }
            }
            console.log('[OK] [PostIt Window] 배경 투명 처리 완료');
          })();
        `).catch((err) => {
          console.error('[ERROR] [PostIt Window] JavaScript 실행 실패:', err);
        });
        
        // 그 후 창 표시
        updatePostItWindowMode(postitWindowInstance, postitWindowMode, mainWindowRef);
        console.log(`[OK] [PostIt Window] 포스트잇 창 표시 완료 (모드: ${postitWindowMode})`);
        
        // 창이 실제로 표시되는지 확인
        setTimeout(() => {
          if (postitWindowInstance && !postitWindowInstance.isDestroyed()) {
            const isVisible = postitWindowInstance.isVisible();
            const bounds = postitWindowInstance.getBounds();
            console.log(`[OK] [PostIt Window] 창 상태 확인 - visible: ${isVisible}, bounds:`, bounds);
            if (!isVisible) {
              console.warn('[WARN] [PostIt Window] 창이 표시되지 않음, 강제 표시 시도');
              postitWindowInstance.show();
            }
          }
        }, 100);
      }, 500); // React 렌더링 완료 대기 시간 증가 (개발 모드에서 더 긴 대기)
    });
  };

  load();

  // 창 위치 변경 시 저장 (debounce)
  let savePositionTimeout = null;
  const saveWindowPosition = () => {
    if (savePositionTimeout) {
      clearTimeout(savePositionTimeout);
    }
    savePositionTimeout = setTimeout(() => {
      if (!postitWindowInstance || postitWindowInstance.isDestroyed()) {
        return;
      }
      const bounds = postitWindowInstance.getBounds();
      
      // 창 위치를 파일에 저장
      const userDataPath = app.getPath('userData');
      const positionFilePath = path.join(userDataPath, 'postit-window-position.json');
      
      try {
        const positionData = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          savedAt: new Date().toISOString(),
        };
        fs.writeFileSync(positionFilePath, JSON.stringify(positionData, null, 2), 'utf-8');
        console.log(`[OK] [PostIt Window] 창 위치 저장됨:`, positionData);
      } catch (error) {
        console.error(`[ERROR] [PostIt Window] 창 위치 저장 실패:`, error);
      }
    }, 500);
  };
  
  // 창 이동 시 위치 저장
  postitWindowInstance.on('moved', () => {
    saveWindowPosition();
  });
  
  // 창 크기 변경 시 위치 및 크기 저장
  postitWindowInstance.on('resized', () => {
    saveWindowPosition();
  });
  
  // 화면 변경 감지 (모니터 추가/제거 시)
  screen.on('display-added', (event, newDisplay) => {
    console.log(`[OK] [PostIt Window] 새 모니터 추가됨:`, newDisplay);
    // 필요시 창 위치 조정
  });
  
  screen.on('display-removed', (event, oldDisplay) => {
    console.log(`[OK] [PostIt Window] 모니터 제거됨:`, oldDisplay);
    // 제거된 모니터에 창이 있으면 주 모니터로 이동
    const bounds = postitWindowInstance.getBounds();
    const allDisplays = screen.getAllDisplays();
    const isOnValidDisplay = allDisplays.some(display => {
      const { x, y, width, height } = display.bounds;
      return bounds.x >= x && bounds.y >= y && 
             bounds.x < x + width && bounds.y < y + height;
    });
    
    if (!isOnValidDisplay && !postitWindowInstance.isDestroyed()) {
      // 유효한 모니터에 없으면 주 모니터로 이동
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x, y, width, height } = primaryDisplay.workArea;
      postitWindowInstance.setBounds({
        x: x,
        y: y,
        width: Math.min(bounds.width, width),
        height: Math.min(bounds.height, height),
      });
      console.log(`[OK] [PostIt Window] 주 모니터로 이동`);
    }
  });
  
  // 창 닫힘 시 참조 정리
  postitWindowInstance.on('closed', () => {
    if (savePositionTimeout) {
      clearTimeout(savePositionTimeout);
    }
    postitWindow = null;
    console.log('[OK] [PostIt Window] 포스트잇 창 닫힘');
  });

  postitWindow = postitWindowInstance;
  console.log('[OK] [PostIt Window] 창 생성 완료, 전역 변수에 저장됨');
  
  return postitWindowInstance;
}

/**
 * 포스트잇 창 표시
 */
function showPostItWindow(mainWindow) {
  console.log('[OK] [PostIt Window] showPostItWindow 호출됨');
  
  // 메인 창 참조 업데이트
  mainWindowRef = mainWindow;
  
  if (postitWindow && !postitWindow.isDestroyed()) {
    console.log('[OK] [PostIt Window] 기존 창 발견, 모드 확인:', postitWindowMode);
    
    // 창이 있으면 현재 모드에 따라 표시/숨김 처리
    if (postitWindowMode === 'hidden') {
      // 숨김 모드면 항상 위 모드로 변경
      console.log('[OK] [PostIt Window] 숨김 모드에서 항상 위 모드로 변경');
      setPostItWindowMode('always-on-top');
    } else {
      // 다른 모드면 현재 모드 유지하며 표시
      console.log('[OK] [PostIt Window] 현재 모드 유지하며 표시:', postitWindowMode);
      updatePostItWindowMode(postitWindow, postitWindowMode, mainWindowRef);
    }
  } else if (mainWindow) {
    // 창이 없으면 새로 생성
    console.log('[OK] [PostIt Window] 새 창 생성 시작');
    createPostItWindow(mainWindow);
  } else {
    console.error('[ERROR] [PostIt Window] 메인 창이 없어 포스트잇 창을 생성할 수 없음');
  }
}

/**
 * 포스트잇 창 숨기기
 */
function hidePostItWindow() {
  if (postitWindow && !postitWindow.isDestroyed()) {
    postitWindow.hide();
  }
}

/**
 * 포스트잇 창 닫기
 */
function closePostItWindow() {
  if (postitWindow && !postitWindow.isDestroyed()) {
    postitWindow.destroy();
    postitWindow = null;
  }
}

/**
 * 포스트잇 창이 열려있고 표시 중인지 확인
 */
function isPostItWindowOpen() {
  if (!postitWindow || postitWindow.isDestroyed()) {
    return false;
  }
  // 창이 열려있고 visible한지 확인
  return postitWindow.isVisible();
}

/**
 * 포스트잇 창 인스턴스 가져오기
 */
function getPostItWindow() {
  return postitWindow && !postitWindow.isDestroyed() ? postitWindow : null;
}

/**
 * 포스트잇 창 모드 업데이트
 * @param {BrowserWindow} windowInstance - 포스트잇 창 인스턴스
 * @param {string} mode - 'always-on-top' (항상 위), 'desktop' (배경화면 위), 'hidden' (숨김)
 */
function updatePostItWindowMode(windowInstance, mode) {
  if (!windowInstance || windowInstance.isDestroyed()) {
    console.error('[ERROR] [PostIt Window] updatePostItWindowMode: 창 인스턴스가 유효하지 않음');
    return;
  }
  
  console.log(`[OK] [PostIt Window] 모드 업데이트: ${mode}`);
  postitWindowMode = mode;
  
  switch (mode) {
    case 'always-on-top':
      // 항상 위 모드: 모든 창 위에 표시
      console.log('[OK] [PostIt Window] 항상 위 모드 설정 중...');
      windowInstance.setAlwaysOnTop(true, 'screen-saver', 1);
      windowInstance.setVisibleOnAllWorkspaces(false);
      windowInstance.show();
      console.log('[OK] [PostIt Window] 항상 위 모드 설정 완료, 창 표시됨');
      break;
      
    case 'desktop':
      // 배경화면 위 모드: 메인 창 아래, 바탕화면 위
      // alwaysOnTop을 false로 설정하여 일반 창처럼 동작 (다른 창 아래 표시)
      windowInstance.setAlwaysOnTop(false);
      windowInstance.setVisibleOnAllWorkspaces(false);
      windowInstance.show();
      // Windows에서는 setAlwaysOnTop(false)만으로도 메인 창 아래에 표시됨
      // 필요시 메인 창을 다시 활성화하여 포스트잇 창을 뒤로 보냄
      if (mainWindow && !mainWindow.isDestroyed() && process.platform === 'win32') {
        // 메인 창을 활성화하여 포스트잇 창을 뒤로 보내기
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
          }
        }, 100);
      }
      break;
      
    case 'hidden':
      // 숨김 모드
      windowInstance.hide();
      break;
      
    default:
      // 기본값: 항상 위
      windowInstance.setAlwaysOnTop(true, 'screen-saver', 1);
      windowInstance.show();
  }
}

/**
 * 포스트잇 창 모드 변경
 * @param {string} mode - 'always-on-top', 'desktop', 'hidden'
 */
function setPostItWindowMode(mode) {
  postitWindowMode = mode;
  
  if (postitWindow && !postitWindow.isDestroyed()) {
    updatePostItWindowMode(postitWindow, mode, mainWindowRef);
  }
}

/**
 * 포스트잇 창 모드 가져오기
 * @returns {string} 현재 모드
 */
function getPostItWindowMode() {
  return postitWindowMode;
}

/**
 * 포스트잇 창 모드 순환 (always-on-top -> desktop -> hidden -> always-on-top)
 */
function cyclePostItWindowMode() {
  const modes = ['always-on-top', 'desktop', 'hidden'];
  const currentIndex = modes.indexOf(postitWindowMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  setPostItWindowMode(modes[nextIndex]);
  return modes[nextIndex];
}

module.exports = {
  createPostItWindow,
  showPostItWindow,
  hidePostItWindow,
  closePostItWindow,
  isPostItWindowOpen,
  getPostItWindow,
  setPostItWindowMode,
  getPostItWindowMode,
  cyclePostItWindowMode,
  updatePostItWindowMode,
};
