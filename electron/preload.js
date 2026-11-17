const { contextBridge, ipcRenderer } = require('electron');

// List of allowed IPC channels for security validation
const ALLOWED_SEND_CHANNELS = [
  'app:ping',
  'window:minimize',
  'window:close',
  'popup:close'
];

const ALLOWED_INVOKE_CHANNELS = [
  'app:getInfo',
  'app:getLoginSettings',
  'app:setLoginSettings',
  'store:get',
  'store:getAll',
  'store:set',
  'store:reset',
  'reminder:triggerNow',
  'reminder:getStatus',
  'reminder:toggleFastInterval',
  'reminder:pause',
  'reminder:resume',
  'popup:logWater',
  'popup:snooze',
  'popup:reschedule'
];

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  getInfo: async () => ipcRenderer.invoke('app:getInfo'),
  getLoginSettings: async () => ipcRenderer.invoke('app:getLoginSettings'),
  setLoginSettings: async (settings) => ipcRenderer.invoke('app:setLoginSettings', settings),
  onNavigate: (callback) => {
    const handler = (event, targetView) => {
      if (typeof callback === 'function') {
        callback(targetView);
      }
    };
    ipcRenderer.on('app:navigate', handler);
    return () => {
      ipcRenderer.removeListener('app:navigate', handler);
    };
  },
  send: (channel, data) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`[Security] Blocked unauthorized IPC send on channel: ${channel}`);
    }
  },
  invoke: async (channel, data) => {
    if (ALLOWED_INVOKE_CHANNELS.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    } else {
      console.warn(`[Security] Blocked unauthorized IPC invoke on channel: ${channel}`);
      throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
  },
  store: {
    get: async (key) => ipcRenderer.invoke('store:get', key),
    getAll: async () => ipcRenderer.invoke('store:getAll'),
    set: async (key, val) => ipcRenderer.invoke('store:set', { key, val }),
    reset: async () => ipcRenderer.invoke('store:reset')
  },
  reminder: {
    triggerNow: async () => ipcRenderer.invoke('reminder:triggerNow'),
    getStatus: async () => ipcRenderer.invoke('reminder:getStatus'),
    toggleFastInterval: async () => ipcRenderer.invoke('reminder:toggleFastInterval'),
    pause: async () => ipcRenderer.invoke('reminder:pause'),
    resume: async () => ipcRenderer.invoke('reminder:resume')
  },
  popup: {
    close: () => ipcRenderer.send('popup:close'),
    logWater: async (amount) => ipcRenderer.invoke('popup:logWater', amount),
    snooze: async (minutes) => ipcRenderer.invoke('popup:snooze', minutes),
    reschedule: async () => ipcRenderer.invoke('popup:reschedule')
  }
});
