const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Auto-update is dormant until package.json's build.publish.owner is a real
// GitHub username. Until then this whole block is a silent no-op — no
// network calls, no errors, nothing the user ever sees.
let mainWin = null;
const pkg = require('./package.json');
const publishCfg = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
const updatesConfigured = publishCfg.owner && publishCfg.owner !== 'REPLACE_WITH_GITHUB_USERNAME';

autoUpdater.autoDownload = false;
autoUpdater.on('update-available', (info) => {
  if (mainWin) mainWin.webContents.send('update:available', { version: info.version });
});
autoUpdater.on('update-downloaded', () => {
  if (mainWin) mainWin.webContents.send('update:ready');
});
autoUpdater.on('error', () => { /* silent — never interrupt invoicing over a failed update check */ });

ipcMain.handle('update:check', () => {
  if (!updatesConfigured) return { configured: false };
  try { autoUpdater.checkForUpdates(); } catch (e) { /* ignore */ }
  return { configured: true };
});
ipcMain.handle('update:download', () => {
  try { autoUpdater.downloadUpdate(); } catch (e) { /* ignore */ }
});
ipcMain.handle('update:install', () => {
  try { autoUpdater.quitAndInstall(); } catch (e) { /* ignore */ }
});

// ---- local database (single JSON file in the OS user-data folder) ----
const DB_PATH = path.join(app.getPath('userData'), 'lycore-db.json');
let cache = null;

function loadDB() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH);
      let text;
      if (safeStorage.isEncryptionAvailable()) {
        try { text = safeStorage.decryptString(raw); }
        catch (e) { text = raw.toString('utf8'); } // legacy plaintext fallback
      } else {
        text = raw.toString('utf8');
      }
      cache = JSON.parse(text);
    } else {
      cache = {};
    }
  } catch (e) {
    cache = {};
  }
  return cache;
}

function saveDB() {
  try {
    const text = JSON.stringify(cache);
    const out = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(text)
      : Buffer.from(text, 'utf8');
    fs.writeFileSync(DB_PATH, out);
  } catch (e) { /* non-fatal */ }
}

// ---- IPC: mirrors a simple key/value store the renderer already understands ----
ipcMain.handle('storage:get', (e, key) => {
  const db = loadDB();
  return Object.prototype.hasOwnProperty.call(db, key) ? { value: db[key] } : null;
});
ipcMain.handle('storage:set', (e, key, value) => {
  const db = loadDB(); db[key] = value; saveDB(); return true;
});
ipcMain.handle('storage:delete', (e, key) => {
  const db = loadDB(); delete db[key]; saveDB(); return true;
});
ipcMain.handle('app:openExternal', (e, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url);
});
ipcMain.handle('app:info', () => ({
  dbPath: DB_PATH,
  encrypted: safeStorage.isEncryptionAvailable()
}));

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 940,
    backgroundColor: '#F6F7F9',
    title: 'LYCORE Invoicing',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // any http(s) link opens in the real browser, never inside the app window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWin = win;
}

app.whenReady().then(() => {
  createWindow();
  if (updatesConfigured) {
    // check once, a few seconds after launch, so it never delays opening the app
    setTimeout(() => { try { autoUpdater.checkForUpdates(); } catch (e) {} }, 4000);
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
