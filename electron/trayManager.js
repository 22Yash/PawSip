const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let windowManagerInstance = null;
let reminderManagerInstance = null;
let storeInstance = null;

/**
 * Resolve the puppy icon for the Windows system tray.
 * Checks development assets and built production assets.
 */
function resolveTrayIcon() {
  const possiblePaths = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../dist/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../public/assets/dog/asking.png'),
    path.join(__dirname, '../dist/assets/dog/asking.png'),
    path.join(process.resourcesPath, 'assets/dog/asking.png'),
    path.join(process.resourcesPath, 'build/icon.ico')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          // 16x16 is the standard crisp icon size for the Windows taskbar tray
          return img.resize({ width: 16, height: 16 });
        }
      } catch (err) {
        console.warn('[TrayManager] Failed to load icon from', p, err.message);
      }
    }
  }

  // Fallback to empty nativeImage if no asset found
  return nativeImage.createEmpty();
}

/**
 * Updates the context menu for the system tray icon
 */
function updateTrayMenu() {
  if (!tray) return;

  const isPaused = reminderManagerInstance ? reminderManagerInstance.getIsPaused() : false;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open PawSip',
      click: () => {
        if (windowManagerInstance) {
          windowManagerInstance.showMainWindow();
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        if (windowManagerInstance) {
          const win = windowManagerInstance.showMainWindow();
          if (win && win.webContents) {
            win.webContents.send('app:navigate', 'settings');
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Pause reminders',
      enabled: !isPaused,
      click: () => {
        if (reminderManagerInstance) {
          reminderManagerInstance.pauseReminders();
        }
        updateTrayMenu();
      }
    },
    {
      label: 'Resume reminders',
      enabled: isPaused,
      click: () => {
        if (reminderManagerInstance) {
          reminderManagerInstance.resumeReminders();
        }
        updateTrayMenu();
      }
    },
    {
      label: 'Remind me now',
      click: () => {
        if (reminderManagerInstance) {
          reminderManagerInstance.triggerReminderNow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit PawSip',
      click: () => {
        if (windowManagerInstance) {
          windowManagerInstance.setQuitting(true);
        }
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Initializes the system tray icon and attaches listeners
 */
function createTray(windowManager, reminderManager, store) {
  windowManagerInstance = windowManager;
  reminderManagerInstance = reminderManager;
  storeInstance = store;

  if (tray) {
    updateTrayMenu();
    return tray;
  }

  const icon = resolveTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('PawSip - Offline Hydration Buddy');

  updateTrayMenu();

  // Left click / double click restores and focuses the main window
  tray.on('click', () => {
    if (windowManagerInstance) {
      windowManagerInstance.showMainWindow();
    }
  });

  tray.on('double-click', () => {
    if (windowManagerInstance) {
      windowManagerInstance.showMainWindow();
    }
  });

  return tray;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = {
  createTray,
  updateTrayMenu,
  destroyTray
};
