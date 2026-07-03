import type { Book, Chapter } from "@/types/book";
import { getPreviewHtml, getPreviewMode } from "@/lib/preview";
import { resolveAssetUrl, resolveHtmlAssets } from "@/lib/asset-store";
import { GUIDEBOOK_EXPORT_CSS } from "@/lib/epub";
import { buildPrintBodyThemeCss } from "@/lib/export-themes";
import {
  type PrintPdfOptions,
  buildPrintPresetCss,
  resolvePrintPreset,
  toElectronPrintOptions,
} from "@/lib/print-presets";

export type { PrintPdfOptions, PrintPresetId, PrintMargins } from "@/lib/print-presets";
export {
  DEFAULT_PRINT_PDF_OPTIONS,
  PRINT_PRESETS,
  listPrintPresets,
  toElectronPrintOptions,
} from "@/lib/print-presets";

/** Section page print styles aligned with globals.css print-preview section rules */
const SECTION_PRINT_CSS = `
.print-body .section-copyright {
  padding: 2em 1.5em;
  font-size: 0.9em;
  color: #444;
  text-align: center;
}
.print-body .section-copyright p { margin: 0.75em 0; }
.print-body .section-dedication {
  text-align: center;
  padding: 4em 2em;
  font-style: italic;
}
.print-body .section-dedication p { margin: 0; font-size: 1.1em; }
.print-body .section-indented {
  margin: 1.25em 2em;
  padding: 1em 1.25em;
  border-left: 3px solid #888;
  background: #f8f8f8;
  font-style: italic;
}
.print-body .section-journal {
  padding: 1em;
  border: 1px dashed #aaa;
  background: #fafafa;
}
.print-body .journal-date { margin-bottom: 1em; }
.print-body .journal-prompt {
  background: #f0f0f0;
  padding: 0.75em;
  border-radius: 4px;
  margin: 1em 0;
}
.print-body .journal-lines {
  border-bottom: 1px solid #ccc;
  min-height: 1.5em;
  margin: 0.75em 0;
}
.print-body .section-workbook {
  padding: 1em;
  border: 2px solid #333;
  background: #fff;
}
.print-body .workbook-instructions {
  background: #eee;
  padding: 0.75em;
  margin-bottom: 1em;
}
.print-body .workbook-blank {
  border-bottom: 1px solid #999;
  min-height: 1.4em;
  margin: 0.5em 0;
  color: #666;
}
.print-body .section-checklist .checklist-items {
  list-style: none;
  padding-left: 0;
}
.print-body .section-checklist li {
  padding: 0.4em 0;
  border-bottom: 1px dotted #ddd;
}
.print-body .section-reflection ol { margin: 1em 0; }
.print-body .section-quote {
  text-align: center;
  padding: 2em 1.5em;
}
.print-body .section-quote blockquote {
  font-size: 1.25em;
  border: none;
  margin: 0;
  padding: 0;
}
.print-body .quote-attribution {
  margin-top: 1em;
  font-size: 0.9em;
  color: #555;
}
.print-body .section-photo-spread figure {
  margin: 1.5em 0;
  text-align: center;
}
.print-body .photo-placeholder {
  background: #f0f0f0;
  border: 2px dashed #ccc;
  padding: 2em;
  color: #888;
}
.print-body .section-timeline .timeline-entry {
  border-left: 3px solid #333;
  padding-left: 1.25em;
  margin: 1.25em 0;
}
.print-body .timeline-date { margin-bottom: 0.25em; }
.print-body .section-glossary dt {
  margin-top: 0.75em;
  font-weight: bold;
}
.print-body .section-glossary dd {
  margin-left: 1em;
  margin-bottom: 0.5em;
  color: #444;
}
.print-body .section-interview .qa-block {
  margin: 1.25em 0;
  padding-bottom: 1em;
  border-bottom: 1px solid #eee;
}
.print-body .qa-question { margin-bottom: 0.5em; color: #333; }
.print-body .qa-answer { color: #555; }
.print-body .section-takeaways {
  background: #f9f9f9;
  padding: 1.25em;
  border: 1px solid #ddd;
}
.print-body .section-resources {
  padding: 1.25em;
  border: 1px solid #ddd;
  background: #fafafa;
}
.print-body .section-resources ul { margin: 0.75em 0; }
.print-body .section-learning-objectives {
  padding: 1.25em;
  border-left: 4px solid #4d7dff;
  background: #f8faff;
}
.print-body .section-learning-objectives ol { margin: 0.75em 0; }
.print-body .section-practice-quiz {
  padding: 1.25em;
  border: 2px solid #333;
  background: #fff;
}
.print-body .section-practice-quiz .quiz-question {
  margin: 1.25em 0;
  padding-bottom: 1em;
  border-bottom: 1px dotted #ccc;
}
.print-body .quiz-answer-line {
  border-bottom: 1px solid #999;
  min-height: 1.4em;
  margin-top: 0.5em;
  color: #666;
}
.print-body .section-bibliography {
  padding: 1.25em;
  font-size: 0.95em;
}
.print-body .bibliography-entries {
  list-style: none;
  padding-left: 0;
}
.print-body .bibliography-entries li {
  margin-bottom: 0.75em;
  padding-left: 1.5em;
  text-indent: -1.5em;
}
`;

/** Print-oriented CSS aligned with globals.css print-preview rules */
const PRINT_BODY_CSS = `
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0;
  color: #1a1a1a;
  background: #fff;
}
.print-page {
  page-break-after: always;
  padding: 0;
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
  padding: 0;
}
.cover-page img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
${GUIDEBOOK_EXPORT_CSS.replace(/\.guidebook/g, ".print-body .guidebook")}
${SECTION_PRINT_CSS}
`;

function buildPrintCss(book: Book, options: PrintPdfOptions = {}): string {
  const { preset, margins, showPageNumbers } = resolvePrintPreset(options);
  return `${buildPrintPresetCss(preset, margins, showPageNumbers)}${PRINT_BODY_CSS}${buildPrintBodyThemeCss(book)}`;
}

function sortedChapters(book: Book): Chapter[] {
  return [...book.chapters].sort((a, b) => a.order - b.order);
}

function titledChapters(chapters: Chapter[]): Chapter[] {
  return chapters.filter((ch) => ch.title.trim());
}

/** Computes starting page number per chapter for TOC leaders */
export function computeChapterStartPages(
  book: Book,
  options: PrintPdfOptions = {}
): Map<string, number> {
  const { includeToc } = resolvePrintPreset(options);
  const chapters = sortedChapters(book);
  const titled = titledChapters(chapters);
  let page = 1;
  if (book.metadata.coverImage) page += 1;
  if (includeToc && titled.length > 1) page += 1;

  const starts = new Map<string, number>();
  for (const chapter of chapters) {
    if (chapter.title.trim()) {
      starts.set(chapter.id, page);
      page += 1;
    }
  }
  return starts;
}

function buildTocPageHtml(book: Book, options: PrintPdfOptions = {}): string {
  const { includeToc, showPageNumbers } = resolvePrintPreset(options);
  const chapters = sortedChapters(book);
  const titled = titledChapters(chapters);
  if (!includeToc || titled.length <= 1) return "";

  const pageStarts = computeChapterStartPages(book, options);
  const footer = showPageNumbers ? '<div class="print-page-footer" aria-hidden="true"></div>' : "";
  const entries = titled
    .map((chapter) => {
      const pageNum = pageStarts.get(chapter.id) ?? "";
      return `<li class="print-toc-entry">
  <span class="print-toc-title-text">${escapeHtml(chapter.title.trim())}</span>
  <span class="print-toc-leader" aria-hidden="true"></span>
  <span class="print-toc-page-num">${pageNum}</span>
</li>`;
    })
    .join("\n");

  return `<section class="print-page print-toc-page">
  <nav class="print-toc" aria-label="Table of contents">
    <h1 class="print-toc-title">Contents</h1>
    <ol class="print-toc-list">${entries}</ol>
  </nav>
  ${footer}
</section>`;
}

function pageFooterHtml(showPageNumbers: boolean): string {
  return showPageNumbers ? '<div class="print-page-footer" aria-hidden="true"></div>' : "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Builds a complete print-ready HTML document for PDF export. */
export function buildPrintDocument(
  book: Book,
  assetBlobs?: Map<string, Blob>,
  options: PrintPdfOptions = {}
): string {
  const { showPageNumbers } = resolvePrintPreset(options);
  const mode = getPreviewMode(book);
  const kbpClass = mode === "kbp" ? "print-kbp" : "";
  const coverSrc = book.metadata.coverImage
    ? resolveAssetUrl(book, book.metadata.coverImage, assetBlobs)
    : null;

  const chapters = sortedChapters(book).map((chapter) => ({
    chapter,
    html: resolveHtmlAssets(
      book,
      getPreviewHtml(book, chapter.content, chapter.title),
      assetBlobs
    ),
  }));

  const footer = pageFooterHtml(showPageNumbers);
  const coverPage = coverSrc
    ? `<section class="print-page cover-page"><img src="${coverSrc}" alt="${escapeHtml(book.metadata.title)}"/>${footer}</section>`
    : "";

  const tocPage = buildTocPageHtml(book, options);

  const chapterPages = chapters
    .map(({ chapter, html }, idx) => {
      const masthead =
        !coverSrc && idx === 0 && !tocPage
          ? `<header class="print-masthead">
              <p class="print-publisher">${escapeHtml(book.metadata.publisher || "OpenBook Author")}</p>
              <h2 class="print-book-title">${escapeHtml(book.metadata.title)}</h2>
              ${book.metadata.author ? `<p class="print-author">by ${escapeHtml(book.metadata.author)}</p>` : ""}
            </header>`
          : "";
      return `<section class="print-page ${kbpClass}">${masthead}<div class="print-body">${html}</div>${footer}</section>`;
    })
    .join("\n");

  const printCss = buildPrintCss(book, options);

  return `<!DOCTYPE html>
<html lang="${escapeHtml(book.metadata.language || "en")}">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(book.metadata.title)}</title>
  <style>${printCss}</style>
</head>
<body>
  ${coverPage}
  ${tocPage}
  ${chapterPages}
</body>
</html>`;
}

function openBrowserPrintDialog(html: string): void {
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
  setTimeout(() => {
    if (!printWindow.closed) printWindow.print();
  }, 500);
}

function defaultPdfFilename(book: Book): string {
  const slug =
    book.metadata.title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "book";
  return `${slug}.pdf`;
}

/**
 * Exports the book as PDF.
 * Electron: native save dialog + printToPDF. Web: browser print dialog.
 */
export async function downloadPdf(
  book: Book,
  assetBlobs?: Map<string, Blob>,
  options: PrintPdfOptions = {}
): Promise<void> {
  const html = buildPrintDocument(book, assetBlobs, options);

  if (typeof window !== "undefined" && window.openBook?.printToPdf) {
    const electronOptions = toElectronPrintOptions(options);
    await window.openBook.printToPdf(html, defaultPdfFilename(book), electronOptions);
    return;
  }

  openBrowserPrintDialog(html);
}
