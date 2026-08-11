const { app, BrowserWindow, ipcMain, shell, safeStorage, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Auto-update is dormant until package.json's build.publish.owner is a real
// GitHub username. Until then this whole block is a silent no-op — no
// network calls, no errors, nothing the user ever sees.
let mainWin = null;
let manualUpdateCheck = false;
const pkg = require('./package.json');
const publishCfg = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
const updatesConfigured = publishCfg.owner && publishCfg.owner !== 'REPLACE_WITH_GITHUB_USERNAME';

autoUpdater.autoDownload = false;
autoUpdater.on('update-available', (info) => {
  if (mainWin) mainWin.webContents.send('update:available', { version: info.version });
  manualUpdateCheck = false;
});
autoUpdater.on('update-not-available', () => {
  if (manualUpdateCheck && mainWin) {
    dialog.showMessageBox(mainWin, {
      type: 'info', title: 'LYCORE Invoicing',
      message: `You're on the latest version (v${app.getVersion()}).`
    });
  }
  manualUpdateCheck = false;
});
autoUpdater.on('update-downloaded', () => {
  if (mainWin) mainWin.webContents.send('update:ready');
});
autoUpdater.on('error', (err) => {
  if (manualUpdateCheck && mainWin) {
    dialog.showMessageBox(mainWin, {
      type: 'warning', title: 'LYCORE Invoicing',
      message: 'Could not check for updates right now. Check your internet connection and try again later.'
    });
  }
  manualUpdateCheck = false;
});

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
ipcMain.handle('app:version', () => app.getVersion());

// ---- backup / restore (business data only — never the passcode or recovery hash) ----
const BACKUP_KEYS = ['lyc-settings', 'lyc-invoices', 'lyc-archive', 'lyc-expenses', 'lyc-expense-archive', 'lyc-catalog'];
async function doBackupExport() {
  if (!mainWin) return { success: false };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWin, {
    title: 'Back up LYCORE Invoicing data',
    defaultPath: `lycore-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'LYCORE Backup', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { success: false, canceled: true };
  const db = loadDB();
  const out = { app: 'LYCORE Invoicing', version: app.getVersion(), exportedAt: new Date().toISOString(), data: {} };
  BACKUP_KEYS.forEach(k => { if (db[k] !== undefined) out.data[k] = db[k]; });
  try {
    fs.writeFileSync(filePath, JSON.stringify(out, null, 2));
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
async function doBackupImport() {
  if (!mainWin) return { success: false };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWin, {
    title: 'Restore LYCORE Invoicing data',
    filters: [{ name: 'LYCORE Backup', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return { success: false, canceled: true };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (!parsed.data) return { success: false, error: 'This file does not look like a LYCORE Invoicing backup.' };
    const db = loadDB();
    BACKUP_KEYS.forEach(k => { if (parsed.data[k] !== undefined) db[k] = parsed.data[k]; });
    saveDB();
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
ipcMain.handle('backup:export', () => doBackupExport());
ipcMain.handle('backup:import', () => doBackupImport());

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Invoice', accelerator: 'CmdOrCtrl+N', click: () => mainWin && mainWin.webContents.send('menu:new-invoice') },
        { label: 'Print / Save PDF', accelerator: 'CmdOrCtrl+P', click: () => mainWin && mainWin.webContents.send('menu:print') },
        { type: 'separator' },
        { label: 'Back Up Data\u2026', click: async () => {
            const r = await doBackupExport();
            if (mainWin && r && r.success) mainWin.webContents.send('menu:toast', 'Backup saved to ' + r.path);
          } },
        { label: 'Restore from Backup\u2026', click: async () => {
            const r = await doBackupImport();
            if (mainWin && r) {
              if (r.success) mainWin.webContents.send('menu:restored');
              else if (!r.canceled) dialog.showMessageBox(mainWin, { type: 'error', title: 'Restore failed', message: r.error || 'Could not read that file.' });
            }
          } },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Dark Mode', click: () => mainWin && mainWin.webContents.send('menu:toggle-dark') },
        { role: 'reload', label: 'Reload' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Check for Updates Now', click: () => {
            if (!updatesConfigured) {
              dialog.showMessageBox(mainWin, { type: 'info', title: 'LYCORE Invoicing', message: 'Auto-update is not set up yet.' });
              return;
            }
            manualUpdateCheck = true;
            try { autoUpdater.checkForUpdates(); } catch (e) { manualUpdateCheck = false; }
          } },
        { label: 'About LYCORE Invoicing', click: () => {
            dialog.showMessageBox(mainWin, {
              type: 'info', title: 'About',
              message: 'LYCORE Invoicing',
              detail: `Version ${app.getVersion()}\nLYCORE GROUP LLC`
            });
          } }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

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
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // any http(s) link opens in the real browser, never inside the app window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWin = win;
  buildMenu();
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
