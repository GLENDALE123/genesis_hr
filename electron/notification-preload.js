const { contextBridge, ipcRenderer } = require('electron');

/**
 * 알림 윈도우용 Preload 스크립트
 */

contextBridge.exposeInMainWorld('electronNotification', {
  clicked: () => {
    ipcRenderer.send('notification-clicked');
  }
});
