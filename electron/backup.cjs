const { app, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");

const CONFIG_FILE = "backup-sync-config.enc";

function configPath() {
  return path.join(app.getPath("userData"), CONFIG_FILE);
}

function readConfig() {
  const file = configPath();
  if (!fs.existsSync(file)) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  const encrypted = fs.readFileSync(file);
  const json = safeStorage.decryptString(encrypted);
  return JSON.parse(json);
}

function writeConfig(config) {
  const file = configPath();
  if (config === null) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS secure storage is not available on this system");
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(config));
  fs.writeFileSync(file, encrypted);
}

module.exports = { readConfig, writeConfig };
