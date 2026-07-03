const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

function joinUrl(base, ...parts) {
  const trimmed = base.replace(/\/+$/, "");
  const path = parts.map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
  return `${trimmed}/${path}`;
}

function buildRemotePath(prefix, bookId, slug, updatedAt) {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const iso = updatedAt.replace(/[:.]/g, "-");
  const safeSlug = slug.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "book";
  return [cleanPrefix, bookId, `${iso}-${safeSlug}.openbook`].filter(Boolean).join("/");
}

async function uploadWebDav(config, remotePath, buffer) {
  const token = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  const url = joinUrl(config.url, remotePath);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/zip",
    },
    body: buffer,
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

async function uploadS3(config, remoteKey, buffer) {
  const client = new S3Client({
    region: config.region || "us-east-1",
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const Key = [config.prefix.replace(/^\/+|\/+$/g, ""), remoteKey].filter(Boolean).join("/");
  const result = await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key,
      Body: buffer,
      ContentType: "application/zip",
    })
  );
  return {
    remotePath: Key,
    syncedAt: new Date().toISOString(),
    etag: result.ETag?.replace(/"/g, ""),
  };
}

async function uploadBackup(config, { bookId, slug, updatedAt, buffer }) {
  const remotePath = buildRemotePath(config.prefix, bookId, slug, updatedAt);
  if (config.backend === "webdav") {
    return uploadWebDav(config, remotePath, buffer);
  }
  return uploadS3(config, remotePath, buffer);
}

module.exports = { uploadBackup };
