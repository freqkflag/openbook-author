const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openBook", {
  platform: process.platform,
  isElectron: true,
  saveDialog: (defaultName) => ipcRenderer.invoke("openbook:save-dialog", defaultName),
  openDialog: () => ipcRenderer.invoke("openbook:open-dialog"),
  writePackage: (filePath, buffer) => ipcRenderer.invoke("openbook:write-package", filePath, buffer),
  readPackage: (filePath) => ipcRenderer.invoke("openbook:read-package", filePath),
  printToPdf: (html, defaultName, printOptions) =>
    ipcRenderer.invoke("openbook:print-to-pdf", { html, defaultName, printOptions }),
  onMenuOpen: (cb) => {
    ipcRenderer.on("openbook:menu-open", cb);
    return () => ipcRenderer.removeListener("openbook:menu-open", cb);
  },
  onMenuSave: (cb) => {
    ipcRenderer.on("openbook:menu-save", cb);
    return () => ipcRenderer.removeListener("openbook:menu-save", cb);
  },
  onMenuSaveAs: (cb) => {
    ipcRenderer.on("openbook:menu-save-as", cb);
    return () => ipcRenderer.removeListener("openbook:menu-save-as", cb);
  },
});
