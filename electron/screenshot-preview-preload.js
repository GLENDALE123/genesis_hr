const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenshotPreview', {
  send: (channel, data) => {
    if (['copy-screenshot', 'print-screenshot'].includes(channel)) {
      ipcRenderer.send(channel, data);
    }
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

