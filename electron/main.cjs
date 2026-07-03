const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs").promises;
const { unlink } = require("fs/promises");
const { spawn } = require("child_process");
const http = require("http");
const { gitStatus, gitInit, gitCommit } = require("./git.cjs");
const { readConfig, writeConfig } = require("./backup.cjs");
const { uploadBackup } = require("./backup-upload.cjs");

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

async function writeFolderProjectToPath(projectPath, payload) {
  await fs.mkdir(path.join(projectPath, "assets"), { recursive: true });
  await fs.writeFile(path.join(projectPath, "manifest.json"), payload.manifestJson, "utf8");
  await fs.writeFile(path.join(projectPath, "book.json"), payload.bookJson, "utf8");
  await fs.writeFile(
    path.join(projectPath, ".openbook-project.json"),
    payload.projectMetaJson,
    "utf8"
  );

  for (const asset of payload.assets) {
    const assetPath = path.join(projectPath, "assets", asset.filename);
    const data = Buffer.from(asset.data);
    let shouldWrite = true;
    try {
      const existing = await fs.readFile(assetPath);
      if (existing.equals(data)) shouldWrite = false;
    } catch {
      shouldWrite = true;
    }
    if (shouldWrite) await fs.writeFile(assetPath, data);
  }

  return projectPath;
}

async function readFolderProjectFromPath(projectPath) {
  const manifestJson = await fs.readFile(path.join(projectPath, "manifest.json"), "utf8");
  const bookJson = await fs.readFile(path.join(projectPath, "book.json"), "utf8");
  let projectMetaJson;
  try {
    projectMetaJson = await fs.readFile(
      path.join(projectPath, ".openbook-project.json"),
      "utf8"
    );
  } catch {
    projectMetaJson = undefined;
  }

  const book = JSON.parse(bookJson);
  const assets = [];
  for (const asset of book.assets ?? []) {
    const assetPath = path.join(projectPath, "assets", asset.filename);
    try {
      const data = await fs.readFile(assetPath);
      assets.push({
        filename: asset.filename,
        data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        mimeType: asset.mimeType,
        assetId: asset.id,
      });
    } catch {
      // asset file missing on disk
    }
  }

  return { manifestJson, bookJson, projectMetaJson, assets, projectPath };
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

  ipcMain.handle("openbook:open-folder-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Open OpenBook Folder Project",
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("openbook:create-folder-dialog", async (_event, defaultName) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose Parent Folder for New Project",
      properties: ["openDirectory", "createDirectory"],
      buttonLabel: "Create Project Here",
      message: defaultName
        ? `A new folder "${defaultName}" will be created inside the selected directory.`
        : "Select where to create the folder project.",
    });
    if (result.canceled || !result.filePaths.length) return null;
    const parent = result.filePaths[0];
    const slug = (defaultName || "my-book").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const projectPath = path.join(parent, slug);
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, "assets"), { recursive: true });
    return projectPath;
  });

  ipcMain.handle("openbook:write-folder-project", async (_event, projectPath, payload) => {
    return writeFolderProjectToPath(projectPath, payload);
  });

  ipcMain.handle("openbook:read-folder-project", async (_event, projectPath) => {
    return readFolderProjectFromPath(projectPath);
  });

  ipcMain.handle("openbook:git-status", async (_event, projectPath) => {
    return gitStatus(projectPath);
  });

  ipcMain.handle("openbook:git-init", async (_event, projectPath) => {
    return gitInit(projectPath);
  });

  ipcMain.handle("openbook:git-commit", async (_event, projectPath, message) => {
    return gitCommit(projectPath, message);
  });

  ipcMain.handle("openbook:backup-get-config", async () => readConfig());

  ipcMain.handle("openbook:backup-set-config", async (_event, config) => {
    writeConfig(config);
    return true;
  });

  ipcMain.handle("openbook:backup-upload", async (_event, payload) => {
    const config = readConfig();
    if (!config?.enabled) {
      throw new Error("Backup & Sync is not enabled");
    }
    return uploadBackup(config, payload);
  });

  ipcMain.handle("openbook:print-to-pdf", async (_event, { html, defaultName, printOptions }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save PDF",
      defaultPath: defaultName || "book.pdf",
      filters: [{ name: "PDF Document", extensions: ["pdf"] }],
    });
    if (result.canceled || !result.filePath) return null;

    let filePath = result.filePath;
    if (!filePath.toLowerCase().endsWith(".pdf")) filePath += ".pdf";

    const tempPath = path.join(os.tmpdir(), `openbook-print-${Date.now()}.html`);
    await fs.writeFile(tempPath, html, "utf8");

    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    try {
      await printWin.loadFile(tempPath);
      const pdfOptions = {
        printBackground: true,
        preferCSSPageSize: printOptions?.preferCSSPageSize ?? true,
        displayHeaderFooter: printOptions?.displayHeaderFooter ?? false,
        footerTemplate:
          printOptions?.footerTemplate ??
          '<div style="font-size:9px;width:100%;text-align:center;color:#666;"><span class="pageNumber"></span></div>',
        marginsType: printOptions?.marginsType ?? 1,
        ...(printOptions?.pageSize ? { pageSize: printOptions.pageSize } : {}),
      };
      const pdfBuffer = await printWin.webContents.printToPDF(pdfOptions);
      await fs.writeFile(filePath, pdfBuffer);
      return filePath;
    } finally {
      printWin.destroy();
      await unlink(tempPath).catch(() => {});
    }
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
          label: "Open Folder Project...",
          accelerator: "CmdOrCtrl+Shift+O",
          click: () => mainWindow?.webContents.send("openbook:menu-open-folder"),
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
