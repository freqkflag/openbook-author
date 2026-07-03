const assetBlobStore = new Map<string, Map<string, Blob>>();

export function getBookAssetBlobs(bookId: string): Map<string, Blob> {
  if (!assetBlobStore.has(bookId)) {
    assetBlobStore.set(bookId, new Map());
  }
  return assetBlobStore.get(bookId)!;
}

export function setBookAssetBlobs(bookId: string, blobs: Map<string, Blob>): void {
  assetBlobStore.set(bookId, blobs);
}

export function setAssetBlob(bookId: string, assetId: string, blob: Blob): void {
  getBookAssetBlobs(bookId).set(assetId, blob);
}

export function removeBookAssetBlobs(bookId: string): void {
  assetBlobStore.delete(bookId);
}
