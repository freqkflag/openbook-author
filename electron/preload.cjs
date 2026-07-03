const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("openBook", {
  platform: process.platform,
  isElectron: true,
  saveDialog: (defaultName) => ipcRenderer.invoke("openbook:save-dialog", defaultName),
  openDialog: () => ipcRenderer.invoke("openbook:open-dialog"),
  writePackage: (filePath, buffer) => ipcRenderer.invoke("openbook:write-package", filePath, buffer),
  readPackage: (filePath) => ipcRenderer.invoke("openbook:read-package", filePath),
  openFolderDialog: () => ipcRenderer.invoke("openbook:open-folder-dialog"),
  createFolderDialog: (defaultName) =>
    ipcRenderer.invoke("openbook:create-folder-dialog", defaultName),
  writeFolderProject: (projectPath, payload) =>
    ipcRenderer.invoke("openbook:write-folder-project", projectPath, payload),
  readFolderProject: (projectPath) => ipcRenderer.invoke("openbook:read-folder-project", projectPath),
  gitStatus: (projectPath) => ipcRenderer.invoke("openbook:git-status", projectPath),
  gitInit: (projectPath) => ipcRenderer.invoke("openbook:git-init", projectPath),
  gitCommit: (projectPath, message) => ipcRenderer.invoke("openbook:git-commit", projectPath, message),
  backupGetConfig: () => ipcRenderer.invoke("openbook:backup-get-config"),
  backupSetConfig: (config) => ipcRenderer.invoke("openbook:backup-set-config", config),
  backupUpload: (payload) => ipcRenderer.invoke("openbook:backup-upload", payload),
  printToPdf: (html, defaultName, printOptions) =>
    ipcRenderer.invoke("openbook:print-to-pdf", { html, defaultName, printOptions }),
  onMenuOpen: (cb) => {
    ipcRenderer.on("openbook:menu-open", cb);
    return () => ipcRenderer.removeListener("openbook:menu-open", cb);
  },
  onMenuOpenFolder: (cb) => {
    ipcRenderer.on("openbook:menu-open-folder", cb);
    return () => ipcRenderer.removeListener("openbook:menu-open-folder", cb);
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
