import JSZip from "jszip";
import type { Book } from "@/types/book";
import { kbpManifest } from "@/lib/kbp";
import { buildExportCss, exportToEpub, hasTitlePage, prepareChapterContent } from "@/lib/epub";
import { getAssetByFilename } from "@/lib/asset-store";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rewriteAssetPaths(html: string): string {
  return html.replace(/src="assets\/([^"]+)"/g, 'src="../assets/$1"');
}

function chapterHtml(book: Book, chapterIndex: number): string {
  const chapter = book.chapters[chapterIndex];
  const content = rewriteAssetPaths(prepareChapterContent(book, chapter.content));

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

function coverHtml(book: Book, coverFilename: string): string {
  return `<!DOCTYPE html>
<html lang="${book.metadata.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(book.metadata.title)} — Cover</title>
  <link rel="stylesheet" href="../styles/kbp.css"/>
  <style>
    body { margin: 0; text-align: center; }
    .cover-wrap { position: relative; max-width: 600px; margin: 0 auto; }
    .cover-wrap img { width: 100%; height: auto; }
    .cover-text {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 2em; background: linear-gradient(transparent, rgba(0,0,0,0.75));
      color: white;
    }
  </style>
</head>
<body>
  <div class="cover-wrap">
    <img src="../assets/${coverFilename}" alt="${escapeHtml(book.metadata.title)}"/>
    <div class="cover-text">
      <h1>${escapeHtml(book.metadata.title)}</h1>
      ${book.metadata.subtitle ? `<p>${escapeHtml(book.metadata.subtitle)}</p>` : ""}
      ${book.metadata.author ? `<p><em>by ${escapeHtml(book.metadata.author)}</em></p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

function titleHtml(book: Book): string {
  const { title, subtitle, author, publisher } = book.metadata;
  return `<!DOCTYPE html>
<html lang="${book.metadata.language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(title || "Title Page")}</title>
  <link rel="stylesheet" href="../styles/kbp.css"/>
  <style>
    body {
      margin: 0;
      padding: 3em 2em;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
    }
    .title-publisher {
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #888;
      margin-bottom: 2em;
    }
    h1 { font-size: 2em; margin: 0; }
    .subtitle { font-size: 1.1em; color: #444; margin-top: 0.75em; font-style: italic; }
    .author { font-size: 1em; color: #555; margin-top: 2em; font-style: italic; }
  </style>
</head>
<body>
  ${publisher ? `<p class="title-publisher">${escapeHtml(publisher)}</p>` : ""}
  ${title ? `<h1>${escapeHtml(title)}</h1>` : ""}
  ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
  ${author ? `<p class="author">by ${escapeHtml(author)}</p>` : ""}
</body>
</html>`;
}

export async function exportToKBP(
  book: Book,
  assetBlobs?: Map<string, Blob>
): Promise<Blob> {
  const zip = new JSZip();

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
- cover.html      → Cover page (if set)
- title.html      → Title page (if metadata set)
- assets/         → Book images
- chapters/       → Individual HTML chapter files
- styles/kbp.css  → KDP-optimized stylesheet
- manifest.json   → Package metadata

KDP Upload: Use export.epub or import HTML chapters into Kindle Create.
`);

  zip.folder("styles")?.file("kbp.css", buildExportCss(true, book.exportTheme));

  const assetsFolder = zip.folder("assets");
  for (const asset of book.assets) {
    const blob = assetBlobs?.get(asset.id);
    if (blob) assetsFolder?.file(asset.filename, blob);
  }

  const coverFilename = book.metadata.coverImage?.startsWith("assets/")
    ? book.metadata.coverImage.replace("assets/", "")
    : null;
  if (coverFilename && getAssetByFilename(book, coverFilename)) {
    zip.file("cover.html", coverHtml(book, coverFilename));
  }

  if (hasTitlePage(book)) {
    zip.file("title.html", titleHtml(book));
  }

  const chaptersFolder = zip.folder("chapters");
  book.chapters.forEach((ch, i) => {
    const filename = `${String(i + 1).padStart(2, "0")}-${ch.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "chapter"}.html`;
    chaptersFolder?.file(filename, chapterHtml(book, i));
  });

  const epubBlob = await exportToEpub(
    {
      ...book,
      formatProfile: "kbp",
      kbpSettings: { ...book.kbpSettings, enabled: true },
    },
    assetBlobs
  );
  zip.file("export.epub", epubBlob);

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

export function downloadKBP(book: Book, assetBlobs?: Map<string, Blob>): Promise<void> {
  return exportToKBP(book, assetBlobs).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.metadata.title || "book"}.kbp`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
