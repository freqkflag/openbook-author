"use client";

import { useEffect, useState } from "react";
import { CloudUpload, Loader2, Save } from "lucide-react";
import type { BackupSyncConfig } from "@/lib/backup-sync/types";

interface BackupSyncPanelProps {
  bookId: string;
  onBackupNow: () => Promise<string | null>;
}

const emptyWebDav: BackupSyncConfig = {
  enabled: false,
  backend: "webdav",
  url: "",
  username: "",
  password: "",
  prefix: "openbook-backups",
};

export default function BackupSyncPanel({ bookId, onBackupNow }: BackupSyncPanelProps) {
  const [config, setConfig] = useState<BackupSyncConfig>(emptyWebDav);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.openBook?.backupGetConfig) return;
    void window.openBook.backupGetConfig().then((stored) => {
      if (stored) setConfig(stored);
    });
  }, []);

  if (!window.openBook?.isElectron) {
    return (
      <p className="text-xs text-slate-500">
        Self-hosted backup is available in the Electron desktop app (WebDAV or S3-compatible).
      </p>
    );
  }

  const saveConfig = async () => {
    if (!window.openBook?.backupSetConfig) return;
    setLoading(true);
    setError(null);
    try {
      await window.openBook.backupSetConfig(config.enabled ? config : null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save backup settings");
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    setError(null);
    try {
      const path = await onBackupNow();
      if (path) setLastBackup(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5 text-[#FF00AA]">
        <CloudUpload size={14} />
        Backup &amp; Sync
      </h3>
      <p className="text-xs text-slate-500">
        Opt-in backup to your WebDAV or S3-compatible storage. Uploads timestamped `.openbook` archives.
      </p>

      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
          className="rounded border-white/20"
        />
        Enable backup
      </label>

      <label className="block text-xs text-slate-400">
        Backend
        <select
          value={config.backend}
          onChange={(e) => {
            const backend = e.target.value as "webdav" | "s3";
            setConfig(
              backend === "s3"
                ? {
                    enabled: config.enabled,
                    backend: "s3",
                    endpoint: "",
                    region: "us-east-1",
                    bucket: "",
                    accessKeyId: "",
                    secretAccessKey: "",
                    prefix: "openbook-backups",
                    forcePathStyle: true,
                  }
                : { ...emptyWebDav, enabled: config.enabled }
            );
          }}
          className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="webdav">WebDAV</option>
          <option value="s3">S3-compatible</option>
        </select>
      </label>

      {config.backend === "webdav" ? (
        <>
          <label className="block text-xs text-slate-400">
            WebDAV URL
            <input
              type="url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://cloud.example.com/remote.php/dav/files/user"
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Username
            <input
              type="text"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Password
            <input
              type="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
        </>
      ) : (
        <>
          <label className="block text-xs text-slate-400">
            Endpoint
            <input
              type="url"
              value={config.endpoint}
              onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
              placeholder="https://minio.example.com"
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Bucket
            <input
              type="text"
              value={config.bucket}
              onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Access key
            <input
              type="text"
              value={config.accessKeyId}
              onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Secret key
            <input
              type="password"
              value={config.secretAccessKey}
              onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
        </>
      )}

      <label className="block text-xs text-slate-400">
        Remote prefix
        <input
          type="text"
          value={config.prefix}
          onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
          className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        />
      </label>

      {error && (
        <p className="text-xs text-red-400 border border-red-500/30 rounded-lg px-2 py-1.5">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void saveConfig()}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "Saved" : "Save settings"}
        </button>
        <button
          type="button"
          onClick={() => void handleBackup()}
          disabled={loading || !config.enabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200 hover:bg-fuchsia-500/25 disabled:opacity-50"
        >
          <CloudUpload size={14} />
          Backup now
        </button>
      </div>

      {lastBackup && (
        <p className="text-xs text-green-400/90 truncate" title={lastBackup}>
          Backed up to {lastBackup}
        </p>
      )}
      <p className="text-[10px] text-slate-600">Book ID: {bookId}</p>
    </div>
  );
}
