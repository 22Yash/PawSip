const { powerMonitor } = require('electron');

let storeInstance = null;
let windowManagerInstance = null;
let tickTimer = null;
let isPausedState = false;

function pauseReminders() {
  isPausedState = true;
  if (storeInstance) {
    storeInstance.set('remindersPaused', true);
  }
  console.log('[ReminderManager] Reminders paused');
}

function resumeReminders() {
  isPausedState = false;
  if (storeInstance) {
    storeInstance.set('remindersPaused', false);
  }
  scheduleNextReminder();
  console.log('[ReminderManager] Reminders resumed');
}

function getIsPaused() {
  if (storeInstance) {
    const val = storeInstance.get('remindersPaused');
    if (typeof val === 'boolean') return val;
  }
  return isPausedState;
}

function isWithinActiveHours(wakeTimeStr = '08:00', sleepTimeStr = '22:00', date = new Date()) {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  const [wH, wM] = (wakeTimeStr || '08:00').split(':').map(Number);
  const wakeMinutes = wH * 60 + (wM || 0);

  const [sH, sM] = (sleepTimeStr || '22:00').split(':').map(Number);
  const sleepMinutes = sH * 60 + (sM || 0);

  if (wakeMinutes <= sleepMinutes) {
    return currentMinutes >= wakeMinutes && currentMinutes <= sleepMinutes;
  } else {
    // Overnight schedule spanning midnight
    return currentMinutes >= wakeMinutes || currentMinutes <= sleepMinutes;
  }
}

function getNextWakeTimestamp(wakeTimeStr = '08:00') {
  const now = new Date();
  const [wH, wM] = (wakeTimeStr || '08:00').split(':').map(Number);
  const wakeDate = new Date(now);
  wakeDate.setHours(wH, wM || 0, 0, 0);

  if (wakeDate.getTime() <= now.getTime()) {
    // Move to tomorrow morning
    wakeDate.setDate(wakeDate.getDate() + 1);
  }
  return wakeDate.getTime();
}

/**
 * Compute and persist next reminder timestamp
 */
function scheduleNextReminder(explicitMinutes = null) {
  if (!storeInstance) return;

  const isFast = Boolean(storeInstance.get('devFastInterval'));
  let minutes = explicitMinutes;

  if (minutes == null) {
    minutes = isFast ? 1 : Number(storeInstance.get('intervalMinutes') || 60);
  }

  const nextTimestamp = Date.now() + minutes * 60 * 1000;
  storeInstance.set('nextReminderAt', nextTimestamp);
  return nextTimestamp;
}

/**
 * Snooze reminder for designated minutes (default 10)
 */
function snoozeReminder(minutes = 10) {
  return scheduleNextReminder(minutes);
}

/**
 * Immediate test trigger for dev button
 */
function triggerReminderNow() {
  if (!windowManagerInstance) return false;

  // Never create duplicate popups
  if (windowManagerInstance.isPopupOpen()) {
    return false;
  }

  windowManagerInstance.createPopupWindow();
  return true;
}

/**
 * Periodic evaluation using timestamps, preventing interval drift
 */
function checkSchedule() {
  if (!storeInstance || !windowManagerInstance) return;

  // Do not fire if reminders are paused
  if (getIsPaused()) return;

  // Only check if onboarding is complete
  if (!storeInstance.get('onboardingComplete')) return;

  // Do not fire if a popup is already active
  if (windowManagerInstance.isPopupOpen()) return;

  const now = Date.now();
  let nextReminderAt = Number(storeInstance.get('nextReminderAt'));

  // If no timestamp stored yet, schedule initial one
  if (!nextReminderAt) {
    scheduleNextReminder();
    return;
  }

  // Check if timestamp is reached
  if (now >= nextReminderAt) {
    const isFast = Boolean(storeInstance.get('devFastInterval'));
    const wakeTime = storeInstance.get('wakeTime') || '08:00';
    const sleepTime = storeInstance.get('sleepTime') || '22:00';

    // Verify active waking hours (fast interval bypasses for easy testing)
    const active = isFast || isWithinActiveHours(wakeTime, sleepTime);

    if (active) {
      windowManagerInstance.createPopupWindow();
      // Set a temporary fallback snooze so it doesn't repeatedly trigger while open
      scheduleNextReminder(10);
    } else {
      // Outside active hours: align next reminder to tomorrow wake time
      const nextWake = getNextWakeTimestamp(wakeTime);
      storeInstance.set('nextReminderAt', nextWake);
    }
  }
}

/**
 * Re-align after system wake or unlock
 */
function handleSystemResume() {
  console.log('[ReminderManager] System resumed/unlocked - rechecking timestamp schedule');
  checkSchedule();
}

function initReminderManager(store, windowManager) {
  storeInstance = store;
  windowManagerInstance = windowManager;

  // Initialize timestamp if missing
  const existingNext = store.get('nextReminderAt');
  if (!existingNext) {
    scheduleNextReminder();
  }

  // Check immediately on startup
  checkSchedule();

  // Polling loop checking timestamps every 5 seconds (not relying on a drifting interval)
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(checkSchedule, 5000);

  // Monitor laptop waking from sleep
  try {
    powerMonitor.on('resume', handleSystemResume);
    powerMonitor.on('unlock-screen', handleSystemResume);
  } catch (err) {
    console.warn('[ReminderManager] powerMonitor hooks unavailable:', err.message);
  }
}

function getStatus() {
  if (!storeInstance) return {};

  const wakeTime = storeInstance.get('wakeTime') || '08:00';
  const sleepTime = storeInstance.get('sleepTime') || '22:00';
  const isFast = Boolean(storeInstance.get('devFastInterval'));
  const intervalMinutes = isFast ? 1 : Number(storeInstance.get('intervalMinutes') || 60);

  return {
    nextReminderAt: storeInstance.get('nextReminderAt'),
    intervalMinutes,
    devFastInterval: isFast,
    isWithinActiveHours: isWithinActiveHours(wakeTime, sleepTime),
    isPopupOpen: windowManagerInstance ? windowManagerInstance.isPopupOpen() : false,
    isPaused: getIsPaused()
  };
}

module.exports = {
  initReminderManager,
  scheduleNextReminder,
  snoozeReminder,
  triggerReminderNow,
  checkSchedule,
  getStatus,
  isWithinActiveHours,
  pauseReminders,
  resumeReminders,
  getIsPaused
};
