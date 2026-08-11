const { contextBridge, ipcRenderer } = require('electron');

// The renderer talks to the local database only through these safe channels.
contextBridge.exposeInMainWorld('storage', {
  get: (key) => ipcRenderer.invoke('storage:get', key),
  set: (key, value) => ipcRenderer.invoke('storage:set', key, value),
  delete: (key) => ipcRenderer.invoke('storage:delete', key)
});

contextBridge.exposeInMainWorld('api', {
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  info: () => ipcRenderer.invoke('app:info'),
  version: () => ipcRenderer.invoke('app:version')
});

contextBridge.exposeInMainWorld('updater', {
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  onAvailable: (cb) => ipcRenderer.on('update:available', (e, info) => cb(info)),
  onReady: (cb) => ipcRenderer.on('update:ready', () => cb())
});

contextBridge.exposeInMainWorld('menuBridge', {
  onNewInvoice: (cb) => ipcRenderer.on('menu:new-invoice', () => cb()),
  onPrint: (cb) => ipcRenderer.on('menu:print', () => cb()),
  onToggleDark: (cb) => ipcRenderer.on('menu:toggle-dark', () => cb()),
  onToast: (cb) => ipcRenderer.on('menu:toast', (e, msg) => cb(msg)),
  onRestored: (cb) => ipcRenderer.on('menu:restored', () => cb())
});
