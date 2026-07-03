import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { BackupSyncConfig, BackupUploadResult } from "@/lib/backup-sync/types";

function s3Client(config: Extract<BackupSyncConfig, { backend: "s3" }>): S3Client {
  return new S3Client({
    region: config.region || "us-east-1",
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadS3Backup(
  config: Extract<BackupSyncConfig, { backend: "s3" }>,
  remoteKey: string,
  data: Uint8Array
): Promise<BackupUploadResult> {
  const client = s3Client(config);
  const Key = [config.prefix.replace(/^\/+|\/+$/g, ""), remoteKey]
    .filter(Boolean)
    .join("/");

  const result = await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key,
      Body: data,
      ContentType: "application/zip",
    })
  );

  return {
    remotePath: Key,
    syncedAt: new Date().toISOString(),
    etag: result.ETag?.replace(/"/g, ""),
  };
}
