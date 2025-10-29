const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenshotPreview', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  onCopyResult: (callback) => {
    ipcRenderer.on('copy-result', (event, data) => {
      callback(data);
    });
  },
  onPrintResult: (callback) => {
    ipcRenderer.on('print-result', (event, data) => {
      callback(data);
    });
  },
});

