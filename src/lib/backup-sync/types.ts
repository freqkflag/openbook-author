export type BackupBackend = "webdav" | "s3";

export interface WebDavConfig {
  backend: "webdav";
  url: string;
  username: string;
  password: string;
  prefix: string;
}

export interface S3Config {
  backend: "s3";
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  forcePathStyle?: boolean;
}

export type BackupSyncConfig = (WebDavConfig | S3Config) & {
  enabled: boolean;
};

export interface SyncState {
  bookId: string;
  remoteEtag?: string;
  remoteUpdatedAt?: string;
  lastSyncedAt?: string;
  lastLocalUpdatedAt?: string;
}

export interface BackupUploadResult {
  remotePath: string;
  syncedAt: string;
  etag?: string;
}

export interface BackupConflict {
  localUpdatedAt: string;
  remoteUpdatedAt: string;
  remotePath: string;
}
