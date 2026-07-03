import JSZip from "jszip";
import type { Book } from "@/types/book";
import { applyKbpToHtml, isKbpEnabled, kbpManifest, KBP_CSS } from "@/lib/kbp";
import { exportToEpub } from "@/lib/epub";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chapterHtml(book: Book, chapterIndex: number): string {
  const chapter = book.chapters[chapterIndex];
  const content = isKbpEnabled(book)
    ? applyKbpToHtml(chapter.content, book.kbpSettings)
    : chapter.content;

  return `<!DOCTYPE html>
<html lang="${book.metadata.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(chapter.title)}</title>
  <link rel="stylesheet" href="../styles/kbp.css"/>
</head>
<body>
  <section id="chapter-${chapterIndex}">
    ${content}
  </section>
</body>
</html>`;
}

export async function exportToKBP(book: Book): Promise<Blob> {
  const zip = new JSZip();
  const slug = (book.metadata.title || "book").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  zip.file("manifest.json", JSON.stringify(kbpManifest(book), null, 2));
  zip.file("metadata.json", JSON.stringify(book.metadata, null, 2));
  zip.file("kbp-settings.json", JSON.stringify(book.kbpSettings, null, 2));
  zip.file("README.txt", `OpenBook Author — KBP Export
=============================

Title: ${book.metadata.title}
Author: ${book.metadata.author}
Chapters: ${book.chapters.length}

This .kbp package is formatted for Kindle Direct Publishing (KDP).

Contents:
- export.epub     → Upload directly to KDP
- chapters/       → Individual HTML chapter files
- styles/kbp.css  → KDP-optimized stylesheet
- manifest.json   → Package metadata

KDP Upload: Use export.epub or import HTML chapters into Kindle Create.
`);

  zip.folder("styles")?.file("kbp.css", KBP_CSS);

  const chaptersFolder = zip.folder("chapters");
  book.chapters.forEach((ch, i) => {
    const filename = `${String(i + 1).padStart(2, "0")}-${ch.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "chapter"}.html`;
    chaptersFolder?.file(filename, chapterHtml(book, i));
  });

  const epubBlob = await exportToEpub({
    ...book,
    formatProfile: "kbp",
    kbpSettings: { ...book.kbpSettings, enabled: true },
  });
  zip.file("export.epub", epubBlob);

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

export function downloadKBP(book: Book): Promise<void> {
  return exportToKBP(book).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.metadata.title || "book"}.kbp`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
