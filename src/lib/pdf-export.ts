import type { Book } from "@/types/book";
import { getPreviewHtml, getPreviewMode } from "@/lib/preview";
import { resolveAssetUrl, resolveHtmlAssets } from "@/lib/asset-store";
import { GUIDEBOOK_EXPORT_CSS } from "@/lib/epub";

/** Print-oriented CSS aligned with globals.css print-preview rules */
const PRINT_BASE_CSS = `
@page { margin: 0.75in; }
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0;
  font-family: Georgia, "Times New Roman", serif;
  color: #1a1a1a;
  background: #fff;
}
.print-page {
  page-break-after: always;
  padding: 0.5in 0.65in;
}
.print-page:last-child { page-break-after: auto; }
.print-masthead {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e5e5;
}
.print-publisher {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #888;
  margin: 0 0 0.35rem;
}
.print-book-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111;
  margin: 0;
}
.print-author {
  font-size: 0.85rem;
  color: #555;
  margin: 0.35rem 0 0;
  font-style: italic;
}
.print-body {
  font-size: 11pt;
  line-height: 1.65;
}
.print-body h1, .print-body .preview-chapter-title {
  font-size: 1.6em;
  font-weight: bold;
  text-align: center;
  margin: 0 0 1em;
}
.print-body h2 { font-size: 1.3em; margin: 1.4em 0 0.6em; }
.print-body h3 { font-size: 1.1em; margin: 1.1em 0 0.5em; }
.print-body p { margin: 0 0 0.75em; }
.print-body blockquote {
  border-left: 3px solid #444;
  padding-left: 1em;
  margin: 1em 0;
  color: #444;
  font-style: italic;
}
.print-body img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
.print-body ul, .print-body ol { margin: 0.8em 0; padding-left: 1.5em; }
.print-body .kbp-tip {
  margin: 1.25em 1em;
  padding: 0.75em 1em;
  border-left: 4px solid #00a86b;
  background: #f0faf5;
}
.print-body .kbp-warning {
  margin: 1.25em 1em;
  padding: 0.75em 1em;
  border-left: 4px solid #e67e22;
  background: #fef9f0;
}
.print-body details.popup-widget {
  margin: 1.25em 0;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.print-body details.popup-widget summary {
  padding: 0.6em 1em;
  background: #f5f5f5;
  font-weight: 600;
  list-style: none;
}
.print-body details.popup-widget > div { padding: 0.75em 1em; }
.print-kbp .print-body p { margin: 0; text-indent: 1.5em; }
.print-kbp .print-body p.no-indent,
.print-kbp .print-body h1 + p,
.print-kbp .print-body h2 + p,
.print-kbp .print-body .preview-chapter-title + p { text-indent: 0; }
.cover-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 9in;
  padding: 0;
}
.cover-page img {
  max-width: 100%;
  max-height: 9in;
  object-fit: contain;
}
${GUIDEBOOK_EXPORT_CSS.replace(/\.guidebook/g, ".print-body .guidebook")}
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPrintDocument(book: Book, assetBlobs?: Map<string, Blob>): string {
  const mode = getPreviewMode(book);
  const kbpClass = mode === "kbp" ? "print-kbp" : "";
  const coverSrc = book.metadata.coverImage
    ? resolveAssetUrl(book, book.metadata.coverImage, assetBlobs)
    : null;

  const chapters = [...book.chapters]
    .sort((a, b) => a.order - b.order)
    .map((chapter) => ({
      html: resolveHtmlAssets(
        book,
        getPreviewHtml(book, chapter.content, chapter.title),
        assetBlobs
      ),
    }));

  const coverPage = coverSrc
    ? `<section class="print-page cover-page"><img src="${coverSrc}" alt="${escapeHtml(book.metadata.title)}"/></section>`
    : "";

  const chapterPages = chapters
    .map((chapter, idx) => {
      const masthead =
        !coverSrc && idx === 0
          ? `<header class="print-masthead">
              <p class="print-publisher">${escapeHtml(book.metadata.publisher || "OpenBook Author")}</p>
              <h2 class="print-book-title">${escapeHtml(book.metadata.title)}</h2>
              ${book.metadata.author ? `<p class="print-author">by ${escapeHtml(book.metadata.author)}</p>` : ""}
            </header>`
          : "";
      return `<section class="print-page ${kbpClass}">${masthead}<div class="print-body">${chapter.html}</div></section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${escapeHtml(book.metadata.language || "en")}">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(book.metadata.title)}</title>
  <style>${PRINT_BASE_CSS}</style>
</head>
<body>
  ${coverPage}
  ${chapterPages}
</body>
</html>`;
}

/** Opens the browser print dialog for a PDF-friendly export of the full book. */
export function downloadPdf(book: Book, assetBlobs?: Map<string, Blob>): void {
  const html = buildPrintDocument(book, assetBlobs);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Pop-up blocked. Allow pop-ups to export PDF.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
  // Fallback if onload already fired
  setTimeout(() => {
    if (!printWindow.closed) printWindow.print();
  }, 500);
}
