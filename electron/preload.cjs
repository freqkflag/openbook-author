const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("openBook", {
  platform: process.platform,
  isElectron: true,
});
