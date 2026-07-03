import type { Book } from "@/types/book";
import { normalizeBookMetadata } from "@/types/book";
import type { OpenBookProjectMeta } from "@/types/folder-project";
import { DEFAULT_PROJECT_META } from "@/types/folder-project";
import { cacheAssetBlob } from "@/lib/asset-store";
import { PACKAGE_VERSION, type OpenPackageResult } from "@/lib/package-io";

export const PROJECT_META_FILENAME = ".openbook-project.json";

export interface FolderAssetFile {
  filename: string;
  data: ArrayBuffer;
  mimeType: string;
  assetId: string;
}

export interface FolderWritePayload {
  manifestJson: string;
  bookJson: string;
  projectMetaJson: string;
  assets: FolderAssetFile[];
}

export interface FolderReadPayload {
  manifestJson: string;
  bookJson: string;
  projectMetaJson?: string;
  assets: FolderAssetFile[];
  projectPath: string;
}

function bookForJson(book: Book): Book {
  const copy = JSON.parse(JSON.stringify(book)) as Book;
  delete copy.packagePath;
  delete copy.projectPath;
  delete copy.storageMode;
  return copy;
}

export function buildManifestJson(book: Book): string {
  return JSON.stringify(
    {
      format: "openbook",
      version: PACKAGE_VERSION,
      generator: "OpenBook Author",
      exportedAt: new Date().toISOString(),
      title: book.metadata.title,
    },
    null,
    2
  );
}

export function buildBookJson(book: Book): string {
  return JSON.stringify(bookForJson(book), null, 2);
}

export function buildProjectMetaJson(meta: OpenBookProjectMeta): string {
  return JSON.stringify(meta, null, 2);
}

export async function buildFolderWritePayload(
  book: Book,
  assetBlobs: Map<string, Blob>,
  projectMeta: OpenBookProjectMeta = DEFAULT_PROJECT_META
): Promise<FolderWritePayload> {
  const assets: FolderAssetFile[] = [];

  for (const asset of book.assets) {
    const blob = assetBlobs.get(asset.id);
    if (blob) {
      assets.push({
        filename: asset.filename,
        data: await blob.arrayBuffer(),
        mimeType: asset.mimeType,
        assetId: asset.id,
      });
    }
  }

  assets.sort((a, b) => a.filename.localeCompare(b.filename));

  return {
    manifestJson: buildManifestJson(book),
    bookJson: buildBookJson(book),
    projectMetaJson: buildProjectMetaJson(projectMeta),
    assets,
  };
}

export function parseFolderContents(payload: FolderReadPayload): OpenPackageResult & {
  projectMeta?: OpenBookProjectMeta;
} {
  if (!payload.manifestJson.trim()) {
    throw new Error("Invalid folder project: missing manifest.json");
  }
  if (!payload.bookJson.trim()) {
    throw new Error("Invalid folder project: missing book.json");
  }

  const book = JSON.parse(payload.bookJson) as Book;
  book.metadata = normalizeBookMetadata(book.metadata);
  book.assets = book.assets ?? [];
  book.storageMode = "folder";
  book.projectPath = payload.projectPath;
  book.packagePath = undefined;

  let projectMeta: OpenBookProjectMeta | undefined;
  if (payload.projectMetaJson?.trim()) {
    projectMeta = JSON.parse(payload.projectMetaJson) as OpenBookProjectMeta;
  }

  const assetBlobs = new Map<string, Blob>();
  for (const assetFile of payload.assets) {
    const blob = new Blob([assetFile.data], { type: assetFile.mimeType });
    assetBlobs.set(assetFile.assetId, blob);
    cacheAssetBlob(assetFile.assetId, blob);
  }

  for (const asset of book.assets) {
    if (!assetBlobs.has(asset.id)) {
      const match = payload.assets.find((a) => a.filename === asset.filename);
      if (match) {
        const blob = new Blob([match.data], { type: match.mimeType });
        assetBlobs.set(asset.id, blob);
        cacheAssetBlob(asset.id, blob);
      }
    }
  }

  return { book, assetBlobs, projectMeta };
}

export function validateFolderProject(payload: Pick<FolderReadPayload, "manifestJson" | "bookJson">): void {
  if (!payload.manifestJson?.trim() || !payload.bookJson?.trim()) {
    throw new Error("Not a valid OpenBook folder project (manifest.json and book.json required)");
  }
  const manifest = JSON.parse(payload.manifestJson) as { format?: string };
  if (manifest.format !== "openbook") {
    throw new Error("Not a valid OpenBook folder project (manifest.format must be openbook)");
  }
}
