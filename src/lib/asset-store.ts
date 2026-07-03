import type { Book, BookAsset } from "@/types/book";

const blobCache = new Map<string, string>();

export function assetPath(filename: string): string {
  return `assets/${filename}`;
}

export function getAssetById(book: Book, assetId: string): BookAsset | undefined {
  return book.assets.find((a) => a.id === assetId);
}

export function getAssetByFilename(book: Book, filename: string): BookAsset | undefined {
  return book.assets.find((a) => a.filename === filename);
}

export function cacheAssetBlob(assetId: string, blob: Blob): string {
  const existing = blobCache.get(assetId);
  if (existing) URL.revokeObjectURL(existing);
  const url = URL.createObjectURL(blob);
  blobCache.set(assetId, url);
  return url;
}

export function getCachedAssetUrl(assetId: string): string | undefined {
  return blobCache.get(assetId);
}

export function clearAssetCache(): void {
  blobCache.forEach((url) => URL.revokeObjectURL(url));
  blobCache.clear();
}

export function resolveAssetUrl(
  book: Book,
  src: string,
  assetBlobs?: Map<string, Blob>
): string {
  if (!src) return src;
  if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("blob:")) {
    return src;
  }

  const match = src.match(/^assets\/(.+)$/);
  if (!match) return src;

  const filename = match[1];
  const asset = getAssetByFilename(book, filename);
  if (!asset) return src;

  const cached = getCachedAssetUrl(asset.id);
  if (cached) return cached;

  if (assetBlobs?.has(asset.id)) {
    return cacheAssetBlob(asset.id, assetBlobs.get(asset.id)!);
  }

  return src;
}

export function resolveHtmlAssets(
  book: Book,
  html: string,
  assetBlobs?: Map<string, Blob>
): string {
  return html.replace(
    /src="(assets\/[^"]+)"/g,
    (_, path: string) => `src="${resolveAssetUrl(book, path, assetBlobs)}"`
  );
}

export function isAssetReferenced(book: Book, filename: string): boolean {
  const path = assetPath(filename);
  const coverRef = book.metadata.coverImage === path || book.metadata.coverImage?.endsWith(filename);
  if (coverRef) return true;
  return book.chapters.some((ch) => ch.content.includes(path) || ch.content.includes(filename));
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

export function uniqueFilename(book: Book, originalName: string): string {
  const base = sanitizeFilename(originalName);
  const existing = new Set(book.assets.map((a) => a.filename));
  if (!existing.has(base)) return base;
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  let i = 1;
  while (existing.has(`${stem}-${i}${ext}`)) i++;
  return `${stem}-${i}${ext}`;
}
