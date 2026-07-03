const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { spawn } = require("child_process");
const http = require("http");

const PORT = process.env.OPENBOOK_PORT || 3847;
let mainWindow = null;
let nextProcess = null;

const isDev = !app.isPackaged;

function waitForServer(url, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) resolve();
          else retry();
        })
        .on("error", retry);
    };
    const retry = () => {
      attempts++;
      if (attempts >= maxAttempts) reject(new Error("Server failed to start"));
      else setTimeout(check, 500);
    };
    check();
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const appPath = isDev ? process.cwd() : path.join(process.resourcesPath, "app");
    const nextBin = path.join(appPath, "node_modules", "next", "dist", "bin", "next");

    nextProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
      cwd: appPath,
      env: { ...process.env, NODE_ENV: "production", PORT: String(PORT) },
      stdio: "pipe",
    });

    nextProcess.on("error", reject);
    waitForServer(`http://localhost:${PORT}`)
      .then(resolve)
      .catch(reject);
  });
}

async function writePackageToPath(filePath, payload) {
  const { buffer, assets } = payload;
  await fs.writeFile(filePath, Buffer.from(buffer));
  return { path: filePath, assets };
}

function setupIpc() {
  ipcMain.handle("openbook:save-dialog", async (_event, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save OpenBook Package",
      defaultPath: defaultName || "book.openbook",
      filters: [{ name: "OpenBook Package", extensions: ["openbook"] }],
    });
    if (result.canceled || !result.filePath) return null;
    let filePath = result.filePath;
    if (!filePath.endsWith(".openbook")) filePath += ".openbook";
    return filePath;
  });

  ipcMain.handle("openbook:open-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Open OpenBook Package",
      filters: [{ name: "OpenBook Package", extensions: ["openbook"] }],
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("openbook:write-package", async (_event, filePath, buffer) => {
    await fs.writeFile(filePath, Buffer.from(buffer));
    return filePath;
  });

  ipcMain.handle("openbook:read-package", async (_event, filePath) => {
    const data = await fs.readFile(filePath);
    return { buffer: data.buffer, filePath };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "OpenBook Author",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#05070D",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  const menu = Menu.buildFromTemplate([
    {
      label: "OpenBook Author",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "Open Book...",
          accelerator: "CmdOrCtrl+O",
          click: () => mainWindow?.webContents.send("openbook:menu-open"),
        },
        {
          label: "Save Book",
          accelerator: "CmdOrCtrl+S",
          click: () => mainWindow?.webContents.send("openbook:menu-save"),
        },
        {
          label: "Save Book As...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => mainWindow?.webContents.send("openbook:menu-save-as"),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  setupIpc();
  try {
    if (!isDev) {
      await startNextServer();
    } else {
      await waitForServer(`http://localhost:${PORT}`);
    }
    createWindow();
  } catch (err) {
    console.error("Failed to start:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextProcess) nextProcess.kill();
});
