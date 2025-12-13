const { Notification } = require('electron');
const notificationWindow = require('../notification-window');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * 알림 IPC 핸들러 설정
 */
function setupNotificationIpcHandlers(ipcMain, getMainWindow, validateIpcChannel, safeIpcHandle) {
  safeIpcHandle('show-notification', async (event, options) => {
    try {
      const mainWindow = getMainWindow();
      const { 
        title, 
        subtitle, 
        body, 
        icon, 
        senderName, 
        senderAvatar, 
        timestamp, 
        centerInfo, 
        link, 
        useCustom = true, 
        soundEnabled = true 
      } = options;
      
      if (mainWindow && !mainWindow.isFocused()) {
        mainWindow.flashFrame(true);
        mainWindow.once('focus', () => {
          if (mainWindow) {
            mainWindow.flashFrame(false);
          }
        });
      }
      
      if (soundEnabled) {
        playSystemNotificationSound();
      }
      
      const defaultIcon = icon || getResourcePath('public/tms-logo.png');
      
      if (useCustom && process.platform === 'win32') {
        try {
          notificationWindow.createNotification({
            title: title || 'TMS 통합관리시스템',
            subtitle,
            body: body || '',
            icon: defaultIcon,
            senderName,
            senderAvatar,
            timestamp,
            centerInfo,
            link,
            soundEnabled,
            onClick: () => {
              if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
                if (link) {
                  mainWindow.webContents.send('navigate-to', link);
                }
              }
            }
          });
          return { success: true, type: 'custom' };
        } catch (customError) {
          console.error('❌ [Notification Handler] 커스텀 알림 실패, 네이티브 알림으로 폴백:', customError);
        }
      }
      
      return showNativeNotification(title, body, defaultIcon, mainWindow, link);
    } catch (error) {
      console.error('❌ [Notification Handler] 알림 표시 실패:', error);
      return { success: false, error: error.message };
    }
  });
}

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

function playSystemNotificationSound() {
  try {
    if (process.platform === 'win32') {
      const command = `powershell -c "(New-Object Media.SoundPlayer 'C:\\Windows\\Media\\Windows Notify System Generic.wav').PlaySync();"`;
      exec(command, (error) => {
        if (error) {
          console.error('❌ [Notification Handler] 시스템 소리 재생 실패:', error);
        }
      });
    }
  } catch (error) {
    console.error('❌ [Notification Handler] 시스템 소리 재생 오류:', error);
  }
}

function showNativeNotification(title, body, icon, mainWindow, link) {
  try {
    if (!Notification.isSupported()) {
      console.warn('⚠️ [Notification Handler] 알림이 지원되지 않는 환경입니다.');
      if (mainWindow) {
        mainWindow.flashFrame(true);
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.flashFrame(false);
          }
        }, 3000);
      }
      return { success: false, error: 'Notifications not supported', type: 'fallback' };
    }
    
    let iconToUse = icon;
    if (icon && !fs.existsSync(icon)) {
      console.warn('⚠️ [Notification Handler] 아이콘 파일을 찾을 수 없습니다:', icon);
      iconToUse = undefined;
    }
    
    const notification = new Notification({
      title: title || 'TMS 통합관리시스템',
      body: body || '',
      icon: iconToUse,
      silent: false
    });

    notification.show();

    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        if (link) {
          mainWindow.webContents.send('navigate-to', link);
        }
      }
    });

    notification.on('error', (error) => {
      console.error('❌ [Notification Handler] 알림 표시 오류:', error);
    });

    return { success: true, type: 'native' };
  } catch (notifError) {
    console.error('❌ [Notification Handler] 네이티브 알림 생성 실패:', notifError);
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
}

module.exports = {
  setupNotificationIpcHandlers,
};





















