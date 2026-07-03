import type { BackupSyncConfig, BackupUploadResult } from "@/lib/backup-sync/types";

function authHeader(username: string, password: string): string {
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${token}`;
}

function joinUrl(base: string, ...parts: string[]): string {
  const trimmed = base.replace(/\/+$/, "");
  const path = parts.map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
  return `${trimmed}/${path}`;
}

export async function uploadWebDavBackup(
  config: Extract<BackupSyncConfig, { backend: "webdav" }>,
  remotePath: string,
  data: Uint8Array
): Promise<BackupUploadResult> {
  const url = joinUrl(config.url, remotePath);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: authHeader(config.username, config.password),
      "Content-Type": "application/zip",
    },
    body: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  });

  if (!res.ok) {
    throw new Error(`WebDAV upload failed (${res.status}): ${res.statusText}`);
  }

  return {
    remotePath,
    syncedAt: new Date().toISOString(),
    etag: res.headers.get("etag") ?? undefined,
  };
}

export async function testWebDavConnection(
  config: Extract<BackupSyncConfig, { backend: "webdav" }>
): Promise<boolean> {
  const url = joinUrl(config.url, config.prefix || "");
  const res = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: authHeader(config.username, config.password),
      Depth: "0",
    },
  });
  return res.ok || res.status === 404;
}
