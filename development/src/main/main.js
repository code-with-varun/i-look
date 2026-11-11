const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const Database = require('./database');
const { Categorizer } = require('./categorizer');
const WatcherService = require('./watcher-service');
const packageJson = require('../../package.json');

let mainWindow = null;
let tray = null;
let db = null;
let categorizer = null;
let watcher = null;
let currentTrackingState = { status: 'Online', currentTool: 'Initializing...', currentDurationFormatted: '00:00:00', isPaused: false };

function createWindow() {
  const userDataPath = app.getPath('userData');
  console.log('[i-Look] Storing user data at:', userDataPath);

  db = new Database(userDataPath);
  categorizer = new Categorizer(db.rules);
  watcher = new WatcherService(db, categorizer);

  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const os = require('os');
  const hasHiddenFlag = process.argv.some(arg => /--hidden|--minimized|-hidden|-minimized/i.test(arg));
  const isSystemBoot = os.uptime() < 360; // System booted within last 6 minutes
  const startHidden = hasHiddenFlag || (db.settings.startMinimizedToTray !== false && isSystemBoot);

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'i-Look - Screen Time & Usage Tracker (Runit Infotech)',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#090d16',
    show: !startHidden,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // If started normally (not hidden), ensure it shows when ready
  if (!startHidden) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });
  }

  // Apply Windows startup item configuration & ensure startup shortcuts are minimized
  applyStartupSetting(db.settings.launchOnStartup);
  ensureStartupShortcutHidden();

  // Start activity watcher
  watcher.start();

  // Forward state ticks to UI and System Tray
  watcher.on('state-change', (state) => {
    currentTrackingState = state;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('watcher-state-change', state);
    }
    updateTray(state);
  });

  watcher.on('tick', (state) => {
    currentTrackingState = state;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('watcher-tick', state);
    }
    updateTrayTooltip(state);
  });

  mainWindow.on('close', (event) => {
    const minimizeToTray = db.settings.minimizeToTray !== false;
    if (!app.isQuitting && minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  createTray();
  registerIpcHandlers();
}

function applyStartupSetting(enabled) {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled !== false,
      path: process.execPath,
      args: ['--hidden']
    });
    console.log(`[i-Look] Startup registration updated: openAtLogin = ${enabled !== false}`);
  } catch (err) {
    console.warn('[i-Look] Failed to set login item settings:', err.message);
  }
}

function ensureStartupShortcutHidden() {
  if (process.platform !== 'win32') return false;
  try {
    const startupFolder = process.env.APPDATA
      ? path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
      : null;
    if (!startupFolder || !fs.existsSync(startupFolder)) return false;

    const { execFile } = require('child_process');
    const script = `
      $wsh = New-Object -ComObject WScript.Shell
      Get-ChildItem -Path '${startupFolder.replace(/'/g, "''")}' -Filter '*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {
        $sc = $wsh.CreateShortcut($_.FullName)
        if ($sc.TargetPath -like '*i-Look*') {
          $changed = $false
          if ($sc.Arguments -notmatch '--hidden') {
            $sc.Arguments = '--hidden'
            $changed = $true
          }
          if ($sc.WindowStyle -ne 7) {
            $sc.WindowStyle = 7
            $changed = $true
          }
          if ($changed) {
            $sc.Save()
            Write-Host "Auto-patched $($_.Name) with --hidden"
          }
        }
      }
    `;
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], (err, stdout) => {
      if (err) {
        console.warn('[i-Look] Startup shortcut notice:', err.message);
      } else if (stdout && stdout.trim()) {
        console.log('[i-Look] Startup shortcut:', stdout.trim());
      }
    });
    return true;
  } catch (e) {
    console.warn('[i-Look] Could not patch startup shortcut:', e);
    return false;
  }
}

function createTray() {
  if (tray) return;

  const trayIconPath = path.join(__dirname, '..', 'assets', 'tray.png');
  const fallbackIconPath = path.join(__dirname, '..', 'assets', 'icon.png');

  let trayImage;
  if (fs.existsSync(trayIconPath)) {
    trayImage = nativeImage.createFromPath(trayIconPath);
  } else if (fs.existsSync(fallbackIconPath)) {
    trayImage = nativeImage.createFromPath(fallbackIconPath);
  } else {
    trayImage = nativeImage.createFromBuffer(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwnl8KwAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA0SURBVDhPY/wPBAwUACYoTTAwMDAwYFPHgGogFhkYGBgYkDQwMNAnpwaGQWPAwMDAwDAA9s4KAZn32bYAAAAASUVORK5CYII=',
        'base64'
      )
    );
  }

  tray = new Tray(trayImage);
  tray.setToolTip('i-Look Screen Time & App Tracker');

  renderTrayMenu();

  // Clicking tray icon restores or toggles window
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.focus();
      }
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function renderTrayMenu() {
  if (!tray) return;

  const isPaused = watcher ? watcher.isPaused : false;
  const statusIcon = isPaused ? '⏸️' : (currentTrackingState.isIdle ? '💤' : '🟢');
  const toolName = currentTrackingState.currentTool || 'Active';
  const duration = currentTrackingState.currentDurationFormatted || '00:00:00';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open i-Look Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: `${statusIcon} ${toolName}`,
      enabled: false
    },
    {
      label: `⏱️ Session: ${duration}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: isPaused ? '▶️ Resume Tracking' : '⏸️ Pause Tracking',
      click: () => {
        if (watcher) {
          watcher.togglePause();
          renderTrayMenu();
        }
      }
    },
    {
      label: '📥 Export Today\'s CSV',
      click: async () => {
        if (mainWindow && db) {
          mainWindow.show();
          mainWindow.focus();
          const csvContent = db.exportToCsv({});
          const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Export i-Look Sessions to CSV',
            defaultPath: `i-look-timesheet-${db.getTodayDate()}.csv`,
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
          });
          if (!canceled && filePath) {
            fs.writeFileSync(filePath, csvContent, 'utf8');
          }
        }
      }
    },
    {
      label: '⚙️ Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('switch-tab', 'tab-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ Quit i-Look',
      click: () => {
        app.isQuitting = true;
        if (watcher) watcher.stop();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function updateTray(state) {
  renderTrayMenu();
  updateTrayTooltip(state);
}

function updateTrayTooltip(state) {
  if (!tray) return;
  const isPaused = watcher ? watcher.isPaused : false;
  const statusStr = isPaused ? '⏸️ Paused' : (state.isIdle ? '💤 Idle' : '🟢 ' + (state.currentTool || 'Active'));
  tray.setToolTip(`i-Look: ${statusStr} (${state.currentDurationFormatted || '00:00:00'})`);
}

function registerIpcHandlers() {
  ipcMain.handle('get-dashboard-data', (event, date) => {
    return db.getDashboardMetrics(date);
  });

  ipcMain.handle('get-sessions', (event, filter) => {
    return db.getSessions(filter || {});
  });

  ipcMain.handle('get-timesheet-grid', (event, date) => {
    return db.getTimesheetGrid(date);
  });

  ipcMain.handle('update-session', (event, { id, updates }) => {
    return db.updateSessionCategory(id, updates);
  });

  ipcMain.handle('get-rules', () => {
    return db.rules;
  });

  ipcMain.handle('save-rules', (event, rules) => {
    const saved = db.saveRules(rules);
    categorizer.setCustomRules(saved);
    return saved;
  });

  ipcMain.handle('get-distinct-apps', () => {
    return db.getDistinctApps();
  });

  ipcMain.handle('save-app-classification', (event, payload) => {
    const result = db.saveAppClassification(payload);
    if (categorizer) {
      categorizer.setCustomRules(db.rules);
    }
    return result;
  });

  ipcMain.handle('fix-startup-shortcut', () => {
    return ensureStartupShortcutHidden();
  });

  ipcMain.handle('get-settings', () => {
    return db.settings;
  });

  ipcMain.handle('save-settings', (event, settings) => {
    const saved = db.saveSettings(settings);
    applyStartupSetting(saved.launchOnStartup);
    return saved;
  });

  ipcMain.handle('get-current-state', () => {
    return watcher ? watcher.getCurrentState() : {};
  });

  ipcMain.handle('toggle-tracking', () => {
    if (watcher) {
      const isPaused = watcher.togglePause();
      renderTrayMenu();
      return { isPaused };
    }
    return { isPaused: false };
  });

  ipcMain.handle('get-app-info', () => {
    return {
      name: packageJson.name,
      version: packageJson.version,
      displayName: packageJson.displayName || 'i-Look Screen Time & App Usage Tracker',
      description: packageJson.description,
      author: packageJson.author,
      company: packageJson.company,
      productDetails: packageJson.productDetails,
      features: packageJson.features
    };
  });

  ipcMain.handle('export-csv', async (event, filter) => {
    const csvContent = db.exportToCsv(filter);
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export i-Look Sessions to CSV',
      defaultPath: `i-look-timesheet-${db.getTodayDate()}.csv`,
      filters: [{ name: 'CSV Files (*.csv)', extensions: ['csv'] }]
    });

    if (!canceled && filePath) {
      try {
        fs.writeFileSync(filePath, csvContent, 'utf8');
        return { success: true, filePath };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, canceled: true };
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    // Keep running in tray on Windows unless user explicitly chose Quit
    const minimizeToTray = db && db.settings && db.settings.minimizeToTray !== false;
    if (process.platform !== 'darwin' && !minimizeToTray) {
      if (watcher) watcher.stop();
      app.quit();
    }
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
    if (watcher) watcher.stop();
  });
}
