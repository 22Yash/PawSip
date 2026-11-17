/**
 * Storage Service for PawSip
 * Communicates with the main process electron-store via safe preload IPC
 * with graceful localStorage fallback when running in a standalone browser.
 */

export const DEFAULT_SETTINGS = {
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
  voicePitch: 1.3,
  voiceRate: 0.95,
  voiceName: '',
  startWithWindows: false,
  startMinimized: false,
  remindersPaused: false,
  snoozeIntervalMinutes: 10,
  autoDismissSeconds: 60
};

const hasElectronStore = () => {
  return typeof window !== 'undefined' && Boolean(window.api?.store);
};

// Fallback localStorage helper
const getLocalFallback = () => {
  try {
    const raw = localStorage.getItem('pawsip_settings');
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const setLocalFallback = (key, val) => {
  try {
    const current = getLocalFallback();
    current[key] = val;
    localStorage.setItem('pawsip_settings', JSON.stringify(current));
  } catch {
    // Ignore storage quota errors in fallback
  }
};

/**
 * Get a single setting by key
 */
export async function getSetting(key) {
  if (hasElectronStore()) {
    try {
      return await window.api.store.get(key);
    } catch (err) {
      console.warn(`[storageService] Error fetching "${key}" from electron-store:`, err);
    }
  }
  return getLocalFallback()[key];
}

/**
 * Get all persisted settings
 */
export async function getAllSettings() {
  if (hasElectronStore()) {
    try {
      const data = await window.api.store.getAll();
      return { ...DEFAULT_SETTINGS, ...data };
    } catch (err) {
      console.warn('[storageService] Error fetching all settings from electron-store:', err);
    }
  }
  return getLocalFallback();
}

/**
 * Save a single setting key-value pair
 */
export async function setSetting(key, val) {
  if (hasElectronStore()) {
    try {
      await window.api.store.set(key, val);
      return { success: true, key, val };
    } catch (err) {
      console.error(`[storageService] Error setting "${key}":`, err);
      throw err;
    }
  }
  setLocalFallback(key, val);
  return { success: true, key, val };
}

/**
 * Save multiple settings at once
 */
export async function saveSettings(settingsObj) {
  const results = {};
  for (const [key, val] of Object.entries(settingsObj)) {
    results[key] = await setSetting(key, val);
  }
  return results;
}

/**
 * Reset all settings back to default values
 */
export async function resetSettings() {
  if (hasElectronStore()) {
    try {
      const res = await window.api.store.reset();
      return res.store || DEFAULT_SETTINGS;
    } catch (err) {
      console.error('[storageService] Error resetting store:', err);
    }
  }
  try {
    localStorage.removeItem('pawsip_settings');
  } catch {}
  return { ...DEFAULT_SETTINGS };
}
