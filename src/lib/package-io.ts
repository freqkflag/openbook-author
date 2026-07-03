import JSZip from "jszip";
import type { Book } from "@/types/book";
import { cacheAssetBlob } from "@/lib/asset-store";

export const PACKAGE_VERSION = "1.0";

export interface PackageAsset {
  filename: string;
  data: ArrayBuffer;
  mimeType: string;
  assetId: string;
}

export interface OpenPackageResult {
  book: Book;
  assetBlobs: Map<string, Blob>;
}

function bookForJson(book: Book): Book {
  return JSON.parse(JSON.stringify(book)) as Book;
}

export async function buildPackageZip(
  book: Book,
  assetBlobs: Map<string, Blob>
): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        format: "openbook",
        version: PACKAGE_VERSION,
        generator: "OpenBook Author",
        exportedAt: new Date().toISOString(),
        title: book.metadata.title,
      },
      null,
      2
    )
  );

  zip.file("book.json", JSON.stringify(bookForJson(book), null, 2));

  const assetsFolder = zip.folder("assets");
  for (const asset of book.assets) {
    const blob = assetBlobs.get(asset.id);
    if (blob) {
      assetsFolder?.file(asset.filename, blob);
    }
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

export async function parsePackageFile(file: File | Blob): Promise<OpenPackageResult> {
  const zip = await JSZip.loadAsync(file);
  const bookRaw = await zip.file("book.json")?.async("string");
  if (!bookRaw) throw new Error("Invalid .openbook package: missing book.json");

  const book = JSON.parse(bookRaw) as Book;
  book.assets = book.assets ?? [];
  book.packagePath = book.packagePath;

  const assetBlobs = new Map<string, Blob>();
  for (const asset of book.assets) {
    const entry = zip.file(`assets/${asset.filename}`);
    if (entry) {
      const data = await entry.async("blob");
      assetBlobs.set(asset.id, data);
      cacheAssetBlob(asset.id, data);
    }
  }

  return { book, assetBlobs };
}

export function downloadPackage(blob: Blob, title: string): void {
  const slug = (title || "book").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.openbook`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readFileAsBlob(file: File): Promise<Blob> {
  return file;
}
