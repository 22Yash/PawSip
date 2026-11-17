const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let popupWindow = null;
let isQuitting = false;

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

/**
 * Resolves the application icon for BrowserWindow titlebar and taskbar.
 */
function resolveAppIcon() {
  const possiblePaths = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../dist/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../public/assets/dog/asking.png'),
    path.join(process.resourcesPath, 'assets/dog/asking.png')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

function setQuitting(val) {
  isQuitting = val;
}

function getQuitting() {
  return isQuitting;
}

function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }
  return createMainWindow();
}

function createMainWindow({ startMinimized = false } = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return showMainWindow();
  }

  mainWindow = new BrowserWindow({
    width: 960,
    height: 780,
    minWidth: 820,
    minHeight: 650,
    center: true,
    show: false,
    title: 'PawSip',
    icon: resolveAppIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (!startMinimized) {
      mainWindow.show();
    }
  });

  // Keep running when the main window is closed: hide instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Security: prevent navigation outside trusted local origins
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.protocol !== 'file:') {
        event.preventDefault();
        console.warn(`[Security] Blocked external navigation to: ${navigationUrl}`);
      }
    } catch {
      event.preventDefault();
    }
  });

  // Security: prevent opening new browser windows (popups / target="_blank")
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function isPopupOpen() {
  return Boolean(popupWindow && !popupWindow.isDestroyed());
}

function createPopupWindow() {
  if (isPopupOpen()) {
    popupWindow.showInactive();
    return popupWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: workWidth, height: workHeight, x: workX, y: workY } = primaryDisplay.workArea;

  const popupWidth = 380;
  const popupHeight = 440;
  // Position at the bottom-right corner of the primary display work area with 16px margin
  const posX = Math.round(workX + workWidth - popupWidth - 16);
  const posY = Math.round(workY + workHeight - popupHeight - 16);

  popupWindow = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false, // Does not steal keyboard focus
    resizable: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Maintain highest topmost level
  popupWindow.setAlwaysOnTop(true, 'screen-saver');

  popupWindow.once('ready-to-show', () => {
    // Show without stealing keyboard focus
    popupWindow.showInactive();
  });

  popupWindow.on('closed', () => {
    popupWindow = null;
  });

  // Security restrictions
  popupWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  popupWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const popupUrl = isDev
    ? 'http://localhost:5173/#popup'
    : `file://${path.join(__dirname, '../dist/index.html')}#popup`;

  if (isDev) {
    popupWindow.loadURL(popupUrl);
  } else {
    popupWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: 'popup'
    });
  }

  return popupWindow;
}

function closePopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
    popupWindow = null;
  }
}

module.exports = {
  createMainWindow,
  showMainWindow,
  getMainWindow,
  createPopupWindow,
  closePopupWindow,
  isPopupOpen,
  setQuitting,
  getQuitting
};
