const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDashboardData: (date) => ipcRenderer.invoke('get-dashboard-data', date),
  getSessions: (filter) => ipcRenderer.invoke('get-sessions', filter),
  getTimesheetGrid: (date) => ipcRenderer.invoke('get-timesheet-grid', date),
  updateSession: (id, updates) => ipcRenderer.invoke('update-session', { id, updates }),
  getRules: () => ipcRenderer.invoke('get-rules'),
  saveRules: (rules) => ipcRenderer.invoke('save-rules', rules),
  getDistinctApps: () => ipcRenderer.invoke('get-distinct-apps'),
  saveAppClassification: (data) => ipcRenderer.invoke('save-app-classification', data),
  fixStartupShortcut: () => ipcRenderer.invoke('fix-startup-shortcut'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getCurrentState: () => ipcRenderer.invoke('get-current-state'),
  toggleTracking: () => ipcRenderer.invoke('toggle-tracking'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  exportCsv: (filter) => ipcRenderer.invoke('export-csv', filter),

  onWatcherTick: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('watcher-tick', handler);
    return () => ipcRenderer.removeListener('watcher-tick', handler);
  },
  onWatcherStateChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('watcher-state-change', handler);
    return () => ipcRenderer.removeListener('watcher-state-change', handler);
  },
  onDataUpdated: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('data-updated', handler);
    return () => ipcRenderer.removeListener('data-updated', handler);
  },
  onSwitchTab: (callback) => {
    const handler = (event, tabId) => callback(tabId);
    ipcRenderer.on('switch-tab', handler);
    return () => ipcRenderer.removeListener('switch-tab', handler);
  }
});
