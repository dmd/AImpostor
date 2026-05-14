const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chatgptFontSettings", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (patch) => ipcRenderer.invoke("settings:save", patch),
  saveSettingsSync: (patch) => ipcRenderer.sendSync("settings:save-sync", patch),
  resetSettings: () => ipcRenderer.invoke("settings:reset"),
  getRuntimeStatus: () => ipcRenderer.invoke("runtime:get-status"),
  onRuntimeStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("runtime:status", listener);
    return () => ipcRenderer.removeListener("runtime:status", listener);
  },
  closeSettings: () => ipcRenderer.invoke("settings:close")
});
