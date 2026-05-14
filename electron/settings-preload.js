const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chatgptFontSettings", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (patch) => ipcRenderer.invoke("settings:save", patch),
  saveSettingsSync: (patch) => ipcRenderer.sendSync("settings:save-sync", patch),
  resetSettings: () => ipcRenderer.invoke("settings:reset"),
  closeSettings: () => ipcRenderer.invoke("settings:close")
});
