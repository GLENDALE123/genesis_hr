const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('areaSelector', {
  send: (channel, data) => {
    if (channel === 'area-selected' || channel === 'area-selection-cancelled') {
      ipcRenderer.send(channel, data);
    }
  }
});


