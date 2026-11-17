const { app, ipcMain } = require('electron');
const path = require('path');
const windowManager = require('./windowManager');
const reminderManager = require('./reminderManager');
const trayManager = require('./trayManager');

// Single-instance lock: launching a second copy focuses the existing window
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance of PawSip is already running. Quitting duplicate.');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[Main] Second instance launched. Focusing existing window.');
    windowManager.showMainWindow();
  });
}

let store = null;

// Validation rules for persistence
const ALLOWED_SCHEMA = {
  userName: (v) => typeof v === 'string' && v.trim().length <= 50,
  puppyName: (v) => typeof v === 'string' && v.trim().length <= 50,
  dailyGoalMl: (v) => typeof v === 'number' && v >= 100 && v <= 20000,
  intervalMinutes: (v) => typeof v === 'number' && v >= 1 && v <= 1440,
  wakeTime: (v) => typeof v === 'string' && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
  sleepTime: (v) => typeof v === 'string' && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
  voiceEnabled: (v) => typeof v === 'boolean',
  animationEnabled: (v) => typeof v === 'boolean',
  soundEnabled: (v) => typeof v === 'boolean',
  onboardingComplete: (v) => typeof v === 'boolean',
  nextReminderAt: (v) => typeof v === 'number',
  todayMl: (v) => typeof v === 'number' && v >= 0,
  lastDrankAt: (v) => typeof v === 'number',
  devFastInterval: (v) => typeof v === 'boolean',
  snoozeIntervalMinutes: (v) => typeof v === 'number' && v >= 1 && v <= 120,
  voicePitch: (v) => typeof v === 'number' && v >= 0.5 && v <= 2.0,
  voiceRate: (v) => typeof v === 'number' && v >= 0.5 && v <= 2.0,
  voiceName: (v) => typeof v === 'string' && v.length <= 150,
  startWithWindows: (v) => typeof v === 'boolean',
  startMinimized: (v) => typeof v === 'boolean',
  remindersPaused: (v) => typeof v === 'boolean',
  autoDismissSeconds: (v) => typeof v === 'number' && v >= 5 && v <= 600
};

const DEFAULT_SETTINGS = {
  userName: '',
  puppyName: 'Coco',
  dailyGoalMl: 2000,
  intervalMinutes: 60,
  wakeTime: '08:00',
  sleepTime: '22:00',
  voiceEnabled: true,
  animationEnabled: true,
  soundEnabled: true,
  onboardingComplete: false,
  nextReminderAt: 0,
  todayMl: 0,
  lastDrankAt: 0,
  devFastInterval: false,
  snoozeIntervalMinutes: 10,
  autoDismissSeconds: 60,
  voicePitch: 1.3,
  voiceRate: 0.95,
  voiceName: '',
  startWithWindows: false,
  startMinimized: false,
  remindersPaused: false
};

function applyLoginSettings(openAtLogin, startMinimized) {
  try {
    const args = [];
    if (!app.isPackaged) {
      args.push(path.resolve('.'));
    }
    if (startMinimized) {
      args.push('--minimized');
    }

    app.setLoginItemSettings({
      openAtLogin: Boolean(openAtLogin),
      openAsHidden: Boolean(startMinimized),
      path: process.execPath,
      args
    });
    console.log(`[Main] LoginItemSettings updated: openAtLogin=${openAtLogin}, startMinimized=${startMinimized}`);
  } catch (err) {
    console.warn('[Main] Failed to update login item settings:', err.message);
  }
}

async function initStore() {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      name: 'pawsip-settings',
      defaults: DEFAULT_SETTINGS
    });
  } catch (err) {
    console.error('[Store] Failed to initialize electron-store:', err);
  }
}

// Security-validated IPC Handlers
ipcMain.handle('app:getInfo', () => {
  return {
    name: 'PawSip',
    version: app.getVersion(),
    platform: process.platform,
    isDev: process.argv.includes('--dev') || process.env.NODE_ENV === 'development'
  };
});

ipcMain.on('app:ping', (event) => {
  event.sender.send('app:pong', 'pong');
});

ipcMain.on('window:minimize', () => {
  const win = windowManager.getMainWindow();
  if (win) win.minimize();
});

ipcMain.on('window:close', () => {
  const win = windowManager.getMainWindow();
  if (win) win.close();
});

// Storage IPC Handlers with input validation
ipcMain.handle('store:get', (event, key) => {
  if (!store) return null;
  if (!key) return store.store;
  if (!(key in ALLOWED_SCHEMA)) {
    throw new Error(`Unauthorized store key: ${key}`);
  }
  return store.get(key);
});

ipcMain.handle('store:getAll', () => {
  if (!store) return DEFAULT_SETTINGS;
  return store.store;
});

ipcMain.handle('store:set', (event, payload) => {
  if (!store) throw new Error('Store is not initialized');
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object with { key, val }');
  }
  const { key, val } = payload;
  if (!(key in ALLOWED_SCHEMA)) {
    throw new Error(`Unauthorized store key: ${key}`);
  }
  const validator = ALLOWED_SCHEMA[key];
  if (!validator(val)) {
    throw new Error(`Validation failed for store key "${key}" with value: ${JSON.stringify(val)}`);
  }

  store.set(key, val);

  // If reminder-relevant keys change, reschedule
  if (key === 'intervalMinutes' || key === 'devFastInterval' || key === 'wakeTime' || key === 'sleepTime') {
    reminderManager.scheduleNextReminder();
  }

  // If startWithWindows or startMinimized changes, sync with OS login settings
  if (key === 'startWithWindows' || key === 'startMinimized') {
    applyLoginSettings(Boolean(store.get('startWithWindows')), Boolean(store.get('startMinimized')));
  }

  // When onboarding finishes, default startWithWindows and startMinimized to true
  if (key === 'onboardingComplete' && val === true) {
    const currentStart = store.get('startWithWindows');
    if (currentStart === undefined || currentStart === false) {
      store.set('startWithWindows', true);
      store.set('startMinimized', true);
      applyLoginSettings(true, true);
    }
  }

  return { success: true, key, val };
});

ipcMain.handle('store:reset', () => {
  if (!store) throw new Error('Store is not initialized');
  store.clear();
  store.set(DEFAULT_SETTINGS);
  applyLoginSettings(false, false);
  reminderManager.scheduleNextReminder();
  trayManager.updateTrayMenu();
  return { success: true, store: store.store };
});

// Login item & Windows startup settings IPC
ipcMain.handle('app:getLoginSettings', () => {
  const openAtLogin = store ? Boolean(store.get('startWithWindows')) : false;
  const startMinimized = store ? Boolean(store.get('startMinimized')) : false;
  return { openAtLogin, startMinimized };
});

ipcMain.handle('app:setLoginSettings', (event, { openAtLogin, startMinimized }) => {
  if (!store) return { success: false };
  if (typeof openAtLogin === 'boolean') store.set('startWithWindows', openAtLogin);
  if (typeof startMinimized === 'boolean') store.set('startMinimized', startMinimized);
  applyLoginSettings(Boolean(store.get('startWithWindows')), Boolean(store.get('startMinimized')));
  return {
    success: true,
    openAtLogin: Boolean(store.get('startWithWindows')),
    startMinimized: Boolean(store.get('startMinimized'))
  };
});

// Reminder IPC Handlers
ipcMain.handle('reminder:triggerNow', () => {
  return reminderManager.triggerReminderNow();
});

ipcMain.handle('reminder:pause', () => {
  reminderManager.pauseReminders();
  trayManager.updateTrayMenu();
  return { success: true, isPaused: true };
});

ipcMain.handle('reminder:resume', () => {
  reminderManager.resumeReminders();
  trayManager.updateTrayMenu();
  return { success: true, isPaused: false };
});

ipcMain.handle('reminder:getStatus', () => {
  return reminderManager.getStatus();
});

ipcMain.handle('reminder:toggleFastInterval', () => {
  if (!store) return false;
  const current = Boolean(store.get('devFastInterval'));
  const next = !current;
  store.set('devFastInterval', next);
  reminderManager.scheduleNextReminder();
  return next;
});

// Popup Action IPC Handlers
ipcMain.on('popup:close', () => {
  windowManager.closePopupWindow();
});

ipcMain.handle('popup:logWater', (event, amount = 250) => {
  if (!store) return { success: false };
  const current = Number(store.get('todayMl') || 0);
  const next = current + amount;
  store.set('todayMl', next);
  store.set('lastDrankAt', Date.now());

  // Reschedule for normal interval
  reminderManager.scheduleNextReminder();

  return { success: true, todayMl: next };
});

ipcMain.handle('popup:snooze', (event, minutes = 10) => {
  const snoozeTime = Number(store?.get('snoozeIntervalMinutes') || minutes);
  reminderManager.snoozeReminder(snoozeTime);
  return { success: true, snoozeMinutes: snoozeTime };
});

ipcMain.handle('popup:reschedule', () => {
  reminderManager.scheduleNextReminder();
  return { success: true };
});

// App Lifecycle
app.whenReady().then(async () => {
  await initStore();

  const shouldStartMinimized = process.argv.includes('--minimized') || process.argv.includes('--hidden');
  windowManager.createMainWindow({ startMinimized: shouldStartMinimized });
  reminderManager.initReminderManager(store, windowManager);
  trayManager.createTray(windowManager, reminderManager, store);

  // Sync login item settings if onboarding was already complete
  if (store.get('onboardingComplete') && store.get('startWithWindows')) {
    applyLoginSettings(true, Boolean(store.get('startMinimized')));
  }

  app.on('activate', () => {
    windowManager.showMainWindow();
  });
});

app.on('before-quit', () => {
  windowManager.setQuitting(true);
  trayManager.destroyTray();
});

app.on('window-all-closed', () => {
  // Keep running in the background when the main window is closed on Windows
  // The reminder scheduler continues to run and will display the popup when due.
});
