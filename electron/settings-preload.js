const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chatgptFontSettings", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (patch) => ipcRenderer.invoke("settings:save", patch),
  resetSettings: () => ipcRenderer.invoke("settings:reset"),
  openChatGPT: () => ipcRenderer.invoke("settings:open-chatgpt")
});
