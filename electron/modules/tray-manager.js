const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * 시스템 트레이 생성 및 관리
 */
function getResourcePath(relativePath, app) {
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

function createTray(app, mainWindow, postitWindowModule) {
  try {
    let iconPath = null;
    let trayIcon = null;
    
    const iconPaths = [
      'public/tms-logo.ico',
      'public/icon.ico',
      'public/tms-logo.png',
    ];
    
    for (const relativePath of iconPaths) {
      const fullPath = getResourcePath(relativePath, app);
      if (fs.existsSync(fullPath)) {
        iconPath = fullPath;
        console.log(`[OK] [Tray Manager] 시스템 트레이 아이콘 사용: ${fullPath}`);
        break;
      }
    }
    
    if (!iconPath) {
      console.error('[ERROR] [Tray Manager] 시스템 트레이 아이콘 파일을 찾을 수 없습니다.');
      console.error('   시도한 경로:', iconPaths.map(p => getResourcePath(p, app)));
      trayIcon = nativeImage.createEmpty();
    } else {
      // 아이콘 파일 로드
      try {
        trayIcon = nativeImage.createFromPath(iconPath);
        const size = trayIcon.getSize();
        
        // 아이콘이 제대로 로드되었는지 확인
        if (size.width === 0 || size.height === 0 || trayIcon.isEmpty()) {
          console.warn('[WARN] [Tray Manager] 아이콘 파일이 비어있거나 손상되었습니다:', iconPath);
          // 대체 경로 시도
          for (const altPath of iconPaths) {
            if (altPath === iconPaths[iconPaths.indexOf(iconPath)]) continue;
            const altFullPath = getResourcePath(altPath, app);
            if (fs.existsSync(altFullPath)) {
              const altIcon = nativeImage.createFromPath(altFullPath);
              if (!altIcon.isEmpty() && altIcon.getSize().width > 0) {
                trayIcon = altIcon;
                console.log('[OK] [Tray Manager] 대체 아이콘 사용:', altFullPath);
                break;
              }
            }
          }
          
          // 여전히 실패하면 빈 이미지
          if (trayIcon.isEmpty() || trayIcon.getSize().width === 0) {
            console.error('[ERROR] [Tray Manager] 모든 아이콘 로드 실패, 빈 이미지 사용');
            trayIcon = nativeImage.createEmpty();
          }
        }
      } catch (error) {
        console.error('[ERROR] [Tray Manager] 아이콘 로드 중 오류:', error);
        trayIcon = nativeImage.createEmpty();
      }
      
      // Windows에서 트레이 아이콘 크기 조정 (16x16 권장)
      if (process.platform === 'win32' && !trayIcon.isEmpty()) {
        const systemIconSize = 16;
        const currentSize = trayIcon.getSize();
        
        if (currentSize.width > 0 && currentSize.height > 0) {
          // 크기가 다르면 리사이즈
          if (currentSize.width !== systemIconSize || currentSize.height !== systemIconSize) {
            trayIcon = trayIcon.resize({ width: systemIconSize, height: systemIconSize });
          }
        }
      }
    }
    
    const tray = new Tray(trayIcon);
    
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
          console.log('[INFO] [Tray Manager] 종료 요청 받음');
          
          // 종료 플래그 설정
          app.isQuitting = true;
          
          // 포스트잇 창 닫기
          try {
            if (postitWindowModule && postitWindowModule.isPostItWindowOpen) {
              if (postitWindowModule.isPostItWindowOpen()) {
                console.log('[INFO] [Tray Manager] 포스트잇 창 닫는 중...');
                if (postitWindowModule.closePostItWindow) {
                  postitWindowModule.closePostItWindow();
                }
              }
            }
          } catch (error) {
            console.error('[ERROR] [Tray Manager] 포스트잇 창 닫기 실패:', error);
          }
          
          // 메인 윈도우 닫기
          if (mainWindow && !mainWindow.isDestroyed()) {
            console.log('[INFO] [Tray Manager] 메인 윈도우 닫는 중...');
            mainWindow.destroy();
          }
          
          // 짧은 지연 후 강제 종료
          setTimeout(() => {
            console.log('[INFO] [Tray Manager] 앱 종료 중...');
            app.exit(0);
          }, 300);
        }
      }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.setToolTip('TMS 통합관리시스템');
    
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
    
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    
    console.log('[OK] [Tray Manager] 시스템 트레이 생성 완료');
    return tray;
  } catch (error) {
    console.error('❌ [Tray Manager] 시스템 트레이 생성 실패:', error);
    return null;
  }
}

module.exports = {
  createTray,
  getResourcePath,
};
