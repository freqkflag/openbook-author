import type { BackupSyncConfig, BackupUploadResult } from "@/lib/backup-sync/types";
import { uploadS3Backup } from "@/lib/backup-sync/s3";
import { uploadWebDavBackup } from "@/lib/backup-sync/webdav";

export function buildBackupRemotePath(
  prefix: string,
  bookId: string,
  slug: string,
  updatedAt: string
): string {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const iso = updatedAt.replace(/[:.]/g, "-");
  const safeSlug = slug.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "book";
  const parts = [cleanPrefix, bookId, `${iso}-${safeSlug}.openbook`].filter(Boolean);
  return parts.join("/");
}

export async function uploadBackup(
  config: BackupSyncConfig,
  bookId: string,
  slug: string,
  updatedAt: string,
  data: Uint8Array
): Promise<BackupUploadResult> {
  const remotePath = buildBackupRemotePath(config.prefix, bookId, slug, updatedAt);

  if (config.backend === "webdav") {
    return uploadWebDavBackup(config, remotePath, data);
  }
  return uploadS3Backup(config, remotePath, data);
}
