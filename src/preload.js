const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chat: (messages) => ipcRenderer.invoke('chat', messages),
  ocr: (imagePath) => ipcRenderer.invoke('ocr', imagePath),
  saveImageBase64: (dataUrl, filename) => ipcRenderer.invoke('saveImageBase64', dataUrl, filename),
  openModelFolder: () => ipcRenderer.invoke('openModelFolder'),
});
