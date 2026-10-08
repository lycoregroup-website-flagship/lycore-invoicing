const { app, BrowserWindow, ipcMain, shell, safeStorage, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Auto-update readiness is checked against app-update.yml, the file electron-builder
// actually writes into the packaged app's resources folder from build.publish at
// build time, and the file electron-updater itself reads at runtime. package.json's
// own "build" field is deliberately stripped out by electron-builder when it packages
// the app, so checking pkg.build here (as an earlier version of this file did) is
// always false in any real installed build — that was the root cause of the
// "auto-update not set up" message appearing in every release, including when it
// genuinely was configured.
let mainWin = null;
let manualUpdateCheck = false;
const pkg = require('./package.json');
const updateConfigPath = app.isPackaged ? path.join(process.resourcesPath, 'app-update.yml') : null;
const updatesConfigured = !!(updateConfigPath && fs.existsSync(updateConfigPath));

autoUpdater.autoDownload = true;
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
  if (String(key).startsWith('secret:')) return null; // secrets never leave the main process
  const db = loadDB();
  return Object.prototype.hasOwnProperty.call(db, key) ? { value: db[key] } : null;
});
ipcMain.handle('storage:set', (e, key, value) => {
  if (String(key).startsWith('secret:')) return false;
  const db = loadDB(); db[key] = value; saveDB(); return true;
});
ipcMain.handle('storage:delete', (e, key) => {
  if (String(key).startsWith('secret:')) return false;
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

// ---- TOTP authenticator (Google Authenticator / Microsoft Authenticator etc.) ----
// Fully offline: the shared secret lives only in the local encrypted DB and on the
// user's phone once scanned. No email, no server, nothing to intercept in transit.
const { authenticator } = require('otplib');
let pendingTotpSecret = null; // held only during setup, until the user confirms a real code
ipcMain.handle('totp:setup', () => {
  pendingTotpSecret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri('owner', 'LYCORE Invoicing', pendingTotpSecret);
  return { secret: pendingTotpSecret, otpauthUrl };
});
ipcMain.handle('totp:confirm', (e, code) => {
  if (!pendingTotpSecret) return { success: false, error: 'Start setup again.' };
  const ok = authenticator.check(String(code || '').trim(), pendingTotpSecret);
  if (!ok) return { success: false, error: 'That code didn\'t match. Check the time on your phone is correct and try the newest code shown.' };
  const db = loadDB();
  db['lyc-totp-secret'] = pendingTotpSecret;
  saveDB();
  pendingTotpSecret = null;
  return { success: true };
});
ipcMain.handle('totp:cancelSetup', () => { pendingTotpSecret = null; return true; });
ipcMain.handle('totp:status', () => {
  const db = loadDB();
  return { configured: !!db['lyc-totp-secret'] };
});
ipcMain.handle('totp:verify', (e, code) => {
  const db = loadDB();
  const secret = db['lyc-totp-secret'];
  if (!secret) return { success: false, error: 'No authenticator is set up.' };
  const ok = authenticator.check(String(code || '').trim(), secret);
  return { success: ok };
});
ipcMain.handle('totp:remove', () => {
  const db = loadDB();
  delete db['lyc-totp-secret'];
  saveDB();
  return true;
});

// ---- backup / restore (business data only — never the passcode or recovery hash) ----
const BACKUP_KEYS = ['lyc-settings', 'lyc-invoices', 'lyc-archive', 'lyc-expenses', 'lyc-expense-archive', 'lyc-catalog', 'lyc-scripts', 'lyc-contact-registry'];
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

// ---- API keys: encrypted with safeStorage, kept in the main process, never returned to the renderer ----
const SECRET_PROVIDERS = ['gemini', 'huggingface'];
function secretSlot(p) { return SECRET_PROVIDERS.includes(p) ? 'secret:' + p : null; }
function getSecret(p) {
  const slot = secretSlot(p); if (!slot) return null;
  const v = loadDB()[slot]; if (!v || !safeStorage.isEncryptionAvailable()) return null;
  try { return safeStorage.decryptString(Buffer.from(v, 'base64')); } catch (e) { return null; }
}
ipcMain.handle('secret:set', (e, p, value) => {
  const slot = secretSlot(p), v = String(value || '').trim();
  if (!slot || v.length < 8 || /\s/.test(v)) return { success: false, error: 'That does not look like an API key.' };
  if (!safeStorage.isEncryptionAvailable()) return { success: false, error: 'Secure storage is not available on this computer, so the key was not saved.' };
  const db = loadDB(); db[slot] = safeStorage.encryptString(v).toString('base64'); saveDB();
  return { success: true, last4: v.slice(-4) };
});
ipcMain.handle('secret:status', (e, p) => {
  const v = getSecret(p); return { saved: !!v, last4: v ? v.slice(-4) : '' };
});
ipcMain.handle('secret:clear', (e, p) => {
  const slot = secretSlot(p); if (!slot) return false;
  const db = loadDB(); delete db[slot]; saveDB(); return true;
});
ipcMain.handle('secret:test', async (e, p) => {
  const v = getSecret(p); if (!v) return { ok: false, error: 'No key saved yet.' };
  const req = p === 'gemini'
    ? ['https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': v } }]
    : ['https://huggingface.co/api/whoami-v2', { headers: { Authorization: 'Bearer ' + v } }];
  try {
    const r = await fetch(req[0], Object.assign({ signal: AbortSignal.timeout(15000) }, req[1]));
    return r.ok ? { ok: true } : { ok: false, error: 'The provider rejected the key (HTTP ' + r.status + ').' };
  } catch (err) { return { ok: false, error: 'Could not reach the provider: ' + (err && err.message || err) }; }
});

// ---- AI chat: runs here so the key never reaches the page. One adapter per provider. ----
ipcMain.handle('ai:chat', async (e, opts) => {
  const o = opts || {}, provider = o.provider, model = String(o.model || '').trim();
  const key = getSecret(provider);
  if (!key) return { ok: false, error: 'No key saved for this provider. Add one in AI Settings.' };
  if (!model || model.length > 120 || /[\s/?#]/.test(model.replace(/^[^/]+\//, ''))) return { ok: false, error: 'Enter a valid model name in AI Settings.' };
  const msgs = (Array.isArray(o.messages) ? o.messages : []).slice(-60).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 12000) }));
  if (!msgs.length) return { ok: false, error: 'Nothing to send.' };
  const system = String(o.system || '').slice(0, 20000), json = !!o.json;
  try {
    if (provider === 'gemini') {
      const body = { contents: msgs.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { temperature: json ? 0.2 : 0.9 } };
      if (system) body.systemInstruction = { parts: [{ text: system }] };
      if (json) body.generationConfig.responseMimeType = 'application/json';
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const j = await r.json().catch(() => null);
      if (!r.ok) return { ok: false, error: (j && j.error && j.error.message) || ('The provider returned HTTP ' + r.status + '.') };
      const parts = (((j || {}).candidates || [])[0] || {}).content; const text = ((parts && parts.parts) || []).map((x) => x.text || '').join('');
      return text ? { ok: true, text } : { ok: false, error: 'The model returned no text (it may have been blocked).' };
    }
    if (provider === 'huggingface') {
      const body = { model, temperature: json ? 0.2 : 0.9, messages: (system ? [{ role: 'system', content: system }] : []).concat(msgs) };
      const r = await fetch('https://router.huggingface.co/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
      const j = await r.json().catch(() => null);
      if (!r.ok) return { ok: false, error: (j && (j.error && (j.error.message || j.error))) ? String(j.error.message || j.error) : ('The provider returned HTTP ' + r.status + '.') };
      const text = (((j || {}).choices || [])[0] || {}).message; return text && text.content ? { ok: true, text: String(text.content) } : { ok: false, error: 'The model returned no text.' };
    }
    return { ok: false, error: 'Unknown provider.' };
  } catch (err) { return { ok: false, error: 'Could not reach the provider: ' + (err && err.message || err) }; }
});

// ---- Live voice: mint a one-use, short-lived token so the page never holds the real key ----
ipcMain.handle('ai:liveToken', async () => {
  const key = getSecret('gemini');
  if (!key) return { ok: false, error: 'No Gemini key saved. Add one in AI Settings.' };
  const t = Date.now();
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ uses: 1, expireTime: new Date(t + 15 * 60000).toISOString(), newSessionExpireTime: new Date(t + 60000).toISOString() }), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, error: (j && j.error && j.error.message) || ('The provider returned HTTP ' + r.status + '.') };
    return j && j.name ? { ok: true, token: j.name } : { ok: false, error: 'The provider did not return a token.' };
  } catch (err) { return { ok: false, error: 'Could not reach the provider: ' + (err && err.message || err) }; }
});

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
        { role: 'reload', label: 'Reload' },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { role: 'resetZoom', label: 'Reset Zoom' }
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
