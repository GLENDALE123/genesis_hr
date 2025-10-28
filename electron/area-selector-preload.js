const { contextBridge, ipcRenderer } = require('electron');

// 영역 선택 창 전용 안전 브리지
contextBridge.exposeInMainWorld('areaSelector', {
  send: (channel, data) => {
    if (channel === 'area-selected' || channel === 'area-selection-cancelled') {
      ipcRenderer.send(channel, data);
    }
  }
});



