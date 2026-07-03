import JSZip from "jszip";
import type { Book, BookMetadata, Chapter, ChapterSectionType } from "@/types/book";
import type { FixedSpread } from "@/types/fixed-layout";
import type {
  GuidebookBlockType,
  TrailStopPayload,
  WorkshopPayload,
  CheatSheetPayload,
  TrailStopAmenity,
} from "@/types/guidebook";
import { applyKbpToHtml, isKbpEnabled, KBP_CSS } from "@/lib/kbp";
import {
  appendCustomCss,
  buildThemeTypographyCss,
  normalizeExportTheme,
} from "@/lib/export-themes";
import type { ExportThemeSettings } from "@/types/book";
import { getAssetByFilename } from "@/lib/asset-store";
import { transformNotesForEpub, TABLE_EXPORT_CSS } from "@/lib/note-export";
import { buildEpubNavListItems } from "@/lib/book-structure";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeHtmlAttributeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodePayload(raw: string): unknown {
  try {
    return JSON.parse(decodeHtmlAttributeEntities(raw));
  } catch {
    return null;
  }
}

/** Derived schema.org accessibility metadata for EPUB 3.3 package documents */
export interface EpubAccessibilityMetadata {
  accessModes: Array<"textual" | "visual">;
  accessModeSufficient: Array<"textual">;
  features: string[];
  hazards: string[];
  summary: string;
}

const DEFAULT_ACCESSIBILITY_SUMMARY =
  "This reflowable EPUB includes structural navigation, a table of contents, and reading-order markers. Text content is available to assistive technology.";

const VISUAL_ACCESSIBILITY_SUMMARY_SUFFIX =
  " Images include alternative text where provided by the author.";

function chapterHtmlHasImages(html: string): boolean {
  return /<img\b/i.test(html) || /data-widget="gallery"/i.test(html);
}

function imageTagHasAlt(tag: string): boolean {
  const altMatch = tag.match(/\balt="([^"]*)"/i);
  return Boolean(altMatch?.[1]?.trim());
}

/** True when the book includes cover or inline images in chapter content. */
export function bookHasVisualContent(book: Book): boolean {
  if (book.metadata.coverImage?.trim()) return true;
  return book.chapters.some((ch) => chapterHtmlHasImages(ch.content));
}

/** True when every inline image in chapters has non-empty alt text. */
export function bookImagesHaveAltText(book: Book): boolean {
  for (const chapter of book.chapters) {
    const tags = chapter.content.match(/<img\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
      if (!imageTagHasAlt(tag)) return false;
    }
  }
  return true;
}

/** Derive schema.org accessibility metadata from book structure and content. */
export function deriveEpubAccessibilityMetadata(book: Book): EpubAccessibilityMetadata {
  const hasVisual = bookHasVisualContent(book);
  const imagesHaveAlt = !hasVisual || bookImagesHaveAltText(book);

  const features = [
    "structuralNavigation",
    "tableOfContents",
    "readingOrder",
    "displayTransformability",
  ];
  if (hasVisual && imagesHaveAlt) {
    features.push("alternativeText");
  }

  let summary = DEFAULT_ACCESSIBILITY_SUMMARY;
  if (hasVisual) {
    summary += VISUAL_ACCESSIBILITY_SUMMARY_SUFFIX;
  }

  return {
    accessModes: hasVisual ? ["textual", "visual"] : ["textual"],
    accessModeSufficient: ["textual"],
    features,
    hazards: ["noFlashingHazard", "noMotionSimulationHazard", "noSoundHazard"],
    summary,
  };
}

function buildAccessibilityMetadataOpf(
  metadata: BookMetadata,
  derived: EpubAccessibilityMetadata
): string {
  const lines: string[] = [];

  for (const mode of derived.accessModes) {
    lines.push(`<meta property="schema:accessMode">${escapeXml(mode)}</meta>`);
  }
  for (const sufficient of derived.accessModeSufficient) {
    lines.push(
      `<meta property="schema:accessModeSufficient">${escapeXml(sufficient)}</meta>`
    );
  }
  for (const feature of derived.features) {
    lines.push(
      `<meta property="schema:accessibilityFeature">${escapeXml(feature)}</meta>`
    );
  }
  for (const hazard of derived.hazards) {
    lines.push(
      `<meta property="schema:accessibilityHazard">${escapeXml(hazard)}</meta>`
    );
  }

  const summary = metadata.accessibilitySummary?.trim() || derived.summary;
  if (summary) {
    lines.push(
      `<meta property="schema:accessibilitySummary">${escapeXml(summary)}</meta>`
    );
  }

  const certifier = metadata.accessibilityCertifier?.trim();
  if (certifier) {
    lines.push(`<meta property="schema:certifier">${escapeXml(certifier)}</meta>`);
  }

  const claim = metadata.accessibilityClaim?.trim();
  if (claim) {
    lines.push(
      `<meta property="schema:certifierCredential">${escapeXml(claim)}</meta>`
    );
  }

  return lines.length ? `${lines.join("\n    ")}\n    ` : "";
}

function buildStoreMetadataOpf(metadata: BookMetadata): string {
  const lines: string[] = [];
  const isbn = metadata.isbn?.replace(/[\s-]/g, "").trim();
  if (isbn) {
    lines.push(`<dc:identifier id="isbn">urn:isbn:${escapeXml(isbn)}</dc:identifier>`);
  }
  for (const subject of [...(metadata.bisac ?? []), ...(metadata.keywords ?? [])]) {
    const trimmed = subject.trim();
    if (trimmed) {
      lines.push(`<dc:subject>${escapeXml(trimmed)}</dc:subject>`);
    }
  }
  if (metadata.ageRating?.trim()) {
    lines.push(
      `<meta name="age-rating" content="${escapeXml(metadata.ageRating.trim())}"/>`
    );
  }
  if (metadata.series?.trim()) {
    lines.push(`<meta name="series" content="${escapeXml(metadata.series.trim())}"/>`);
    if (metadata.seriesIndex != null && metadata.seriesIndex > 0) {
      lines.push(`<meta name="series-index" content="${metadata.seriesIndex}"/>`);
    }
  }
  return lines.length ? `${lines.join("\n    ")}\n    ` : "";
}

function guidebookHeadingId(blockType: GuidebookBlockType, title: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || blockType.replace("_", "-");
  return `guidebook-title-${blockType.replace("_", "-")}-${slug}`;
}

function serializeGuidebookBlock(blockType: GuidebookBlockType, payloadRaw: string): string {
  const data = decodePayload(payloadRaw);
  const typeClass = `guidebook-${blockType.replace("_", "-")}`;

  if (blockType === "trail_stop") {
    const d = (data || {}) as Partial<TrailStopPayload>;
    const amenities = (d.amenities || [])
      .map((entry) => (typeof entry === "string" ? entry : (entry as TrailStopAmenity).value))
      .filter(Boolean)
      .map((a) => `<li>${escapeHtml(a)}</li>`)
      .join("");
    const amenitiesHtml = amenities
      ? `<ul class="trail-amenities">${amenities}</ul>`
      : "";
    const meta = [d.mileMarker ? `Mile ${escapeHtml(d.mileMarker)}` : "", d.elevation ? escapeHtml(d.elevation) : ""]
      .filter(Boolean)
      .join(" · ");
    const heading = escapeHtml(d.name || "Trail Stop");
    const headingId = guidebookHeadingId(blockType, d.name || "Trail Stop");
    return `<aside class="guidebook-block ${typeClass}" aria-labelledby="${headingId}">
  <header class="guidebook-block-header">Trail Stop</header>
  <div class="guidebook-block-body">
    <h3 id="${headingId}">${heading}</h3>
    ${meta ? `<p class="trail-meta">${meta}</p>` : ""}
    ${d.notes ? `<p>${escapeHtml(d.notes)}</p>` : ""}
    ${amenitiesHtml}
  </div>
</aside>`;
  }

  if (blockType === "workshop") {
    const d = (data || {}) as Partial<WorkshopPayload>;
    const exercises = (d.exercises || [])
      .map(
        (ex, i) =>
          `<div class="workshop-exercise"><strong>${i + 1}.</strong> ${escapeHtml(ex.prompt || "")}<span class="response-hint"> (${ex.responseType === "long" ? "long answer" : "short answer"})</span></div>`
      )
      .join("");
    const heading = escapeHtml(d.title || "Workshop");
    const headingId = guidebookHeadingId(blockType, d.title || "Workshop");
    return `<aside class="guidebook-block ${typeClass}" aria-labelledby="${headingId}">
  <header class="guidebook-block-header">Workshop</header>
  <div class="guidebook-block-body">
    <h3 id="${headingId}">${heading}</h3>
    ${exercises}
  </div>
</aside>`;
  }

  const d = (data || {}) as Partial<CheatSheetPayload>;
  const cols = d.columns === 3 ? 3 : 2;
  const items = (d.items || [])
    .map(
      (item) =>
        `<span class="cheat-label">${escapeHtml(item.label || "")}</span><span>${escapeHtml(item.value || "")}</span>`
    )
    .join("");
  const heading = escapeHtml(d.title || "Quick Reference");
  const headingId = guidebookHeadingId(blockType, d.title || "Quick Reference");
  return `<aside class="guidebook-block ${typeClass}" aria-labelledby="${headingId}">
  <header class="guidebook-block-header">Cheat Sheet</header>
  <div class="guidebook-block-body">
    <h3 id="${headingId}">${heading}</h3>
    <div class="cheat-grid cols-${cols}">${items}</div>
  </div>
</aside>`;
}

function transformWidgetsForEpub(html: string): string {
  let result = html;

  result = result.replace(
    /<div[^>]*data-widget="popup"[^>]*data-title="([^"]*)"[^>]*data-content="([^"]*)"[^>]*><\/div>/gi,
    (_, title, content) =>
      `<details class="popup-widget"><summary>${title}</summary><div>${content}</div></details>`
  );

  result = result.replace(
    /<div[^>]*data-widget="popup"[^>]*><\/div>/gi,
    '<details class="popup-widget"><summary>Tap to reveal</summary><div><p>Content</p></div></details>'
  );

  result = result.replace(
    /<div[^>]*data-widget="gallery"[^>]*data-images="([^"]*)"[^>]*><\/div>/gi,
    (_, imagesJson) => {
      try {
        const images = JSON.parse(
          decodeHtmlAttributeEntities(imagesJson)
        ) as { src: string; caption: string }[];
        const figures = images
          .map(
            (img) => {
              const src = img.src.startsWith("assets/")
                ? `../images/${img.src.replace("assets/", "")}`
                : img.src;
              return `<figure class="gallery-item"><img src="${src}" alt="${escapeXml(img.caption)}"/><figcaption>${escapeXml(img.caption)}</figcaption></figure>`;
            }
          )
          .join("");
        return `<div class="gallery-widget">${figures}</div>`;
      } catch {
        return '<div class="gallery-widget"></div>';
      }
    }
  );

  result = result.replace(
    /<div[^>]*data-widget="media"[^>]*data-kind="([^"]*)"[^>]*data-src="([^"]*)"[^>]*(?:data-title="([^"]*)")?[^>]*><\/div>/gi,
    (_, kind, src, title) => {
      const mediaSrc = src.startsWith("assets/") ? `../images/${src.replace("assets/", "")}` : src;
      const label = escapeXml(title || "");
      if (kind === "video") {
        return `<figure class="media-widget"><video controls src="${mediaSrc}"></video>${label ? `<figcaption>${label}</figcaption>` : ""}</figure>`;
      }
      return `<figure class="media-widget"><audio controls src="${mediaSrc}"></audio>${label ? `<figcaption>${label}</figcaption>` : ""}</figure>`;
    }
  );

  result = result.replace(
    /<div[^>]*data-widget="quiz"[^>]*data-title="([^"]*)"[^>]*data-payload="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
    (_, title, payload) => {
      try {
        const questions = JSON.parse(decodeHtmlAttributeEntities(payload)) as {
          prompt: string;
          choices: string[];
          answerIndex: number;
        }[];
        const items = questions
          .map(
            (q, i) =>
              `<li><p><strong>Q${i + 1}.</strong> ${escapeXml(q.prompt)}</p><ol type="A">${q.choices
                .map(
                  (c, ci) =>
                    `<li${ci === q.answerIndex ? ' class="quiz-answer"' : ""}>${escapeXml(c)}</li>`
                )
                .join("")}</ol></li>`
          )
          .join("");
        return `<section class="quiz-widget"><h3>${escapeXml(title)}</h3><ol>${items}</ol></section>`;
      } catch {
        return `<section class="quiz-widget"><h3>${escapeXml(title)}</h3></section>`;
      }
    }
  );

  result = result.replace(
    /<div[^>]*data-widget="timeline"[^>]*data-title="([^"]*)"[^>]*data-payload="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
    (_, title, payload) => {
      try {
        const events = JSON.parse(decodeHtmlAttributeEntities(payload)) as {
          year: string;
          label: string;
        }[];
        const items = events
          .map((ev) => `<li><time>${escapeXml(ev.year)}</time> ${escapeXml(ev.label)}</li>`)
          .join("");
        return `<section class="timeline-widget"><h3>${escapeXml(title)}</h3><ul>${items}</ul></section>`;
      } catch {
        return `<section class="timeline-widget"><h3>${escapeXml(title)}</h3></section>`;
      }
    }
  );

  result = result.replace(
    /<div[^>]*data-callout="tip"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-tip">$1</div>'
  );
  result = result.replace(
    /<div[^>]*data-callout="warning"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-warning">$1</div>'
  );
  result = result.replace(
    /<div[^>]*data-callout="step"[^>]*data-number="([^"]*)"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-step"><span class="step-number">$1</span>$2</div>'
  );
  result = result.replace(/<hr[^>]*data-kbp="scene-break"[^>]*\/?>/gi, '<p class="scene-break">* * *</p>');

  result = result.replace(
    /<(?:aside|div)[^>]*data-guidebook="(trail_stop|workshop|cheat_sheet)"[^>]*data-payload="([^"]*)"[^>]*>[\s\S]*?<\/(?:aside|div)>/gi,
    (_, blockType, payload) => serializeGuidebookBlock(blockType as GuidebookBlockType, payload)
  );

  result = result.replace(
    /<(?:aside|div)[^>]*data-payload="([^"]*)"[^>]*data-guidebook="(trail_stop|workshop|cheat_sheet)"[^>]*>[\s\S]*?<\/(?:aside|div)>/gi,
    (_, payload, blockType) => serializeGuidebookBlock(blockType as GuidebookBlockType, payload)
  );

  return result;
}

const GUIDEBOOK_EXPORT_ORDER_RE =
  /<aside class="guidebook-block guidebook-(trail-stop|workshop|cheat-sheet)"/g;

const GUIDEBOOK_SLUG_TO_TYPE: Record<string, GuidebookBlockType> = {
  "trail-stop": "trail_stop",
  workshop: "workshop",
  "cheat-sheet": "cheat_sheet",
};

/** Document order of guidebook blocks after EPUB transform (for regression tests). */
export function getGuidebookBlockExportOrder(html: string): GuidebookBlockType[] {
  const transformed = transformWidgetsForEpub(html);
  return [...transformed.matchAll(GUIDEBOOK_EXPORT_ORDER_RE)].map(
    (match) => GUIDEBOOK_SLUG_TO_TYPE[match[1]]
  );
}

function prepareChapterContent(book: Book, content: string): string {
  let result = transformWidgetsForEpub(content);
  result = transformNotesForEpub(result);
  if (isKbpEnabled(book)) {
    result = applyKbpToHtml(result, book.kbpSettings);
  }
  return result;
}

function rewriteAssetPaths(html: string): string {
  return html.replace(/src="assets\/([^"]+)"/g, 'src="../images/$1"');
}

function collectAssetFilenames(book: Book, html: string): Set<string> {
  const filenames = new Set<string>();
  const matches = html.matchAll(/assets\/([^"'\s)]+)/g);
  for (const m of matches) filenames.add(m[1]);

  if (book.metadata.coverImage?.startsWith("assets/")) {
    filenames.add(book.metadata.coverImage.replace("assets/", ""));
  }
  return filenames;
}

async function embedAssets(
  zip: JSZip,
  book: Book,
  assetBlobs: Map<string, Blob> | undefined,
  htmlParts: string[]
): Promise<void> {
  const needed = new Set<string>();
  for (const html of htmlParts) {
    collectAssetFilenames(book, html).forEach((f) => needed.add(f));
  }

  const imagesFolder = zip.folder("images");
  for (const filename of needed) {
    const asset = getAssetByFilename(book, filename);
    if (!asset) continue;
    const blob = assetBlobs?.get(asset.id);
    if (blob) {
      imagesFolder?.file(filename, blob);
    }
  }
}

function coverXhtml(book: Book, coverImageId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <title>${escapeXml(book.metadata.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
  <style>
    body { margin: 0; padding: 0; text-align: center; }
    img { max-width: 100%; max-height: 100vh; }
  </style>
</head>
<body epub:type="cover">
  <img src="../images/${coverImageId}" alt="${escapeXml(book.metadata.title)}"/>
</body>
</html>`;
}

export function hasTitlePage(book: Book): boolean {
  return Boolean(book.metadata.title || book.metadata.author);
}

function titleXhtml(book: Book): string {
  const { title, subtitle, author, publisher } = book.metadata;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(book.metadata.language || "en")}">
<head>
  <title>${escapeXml(title || "Title Page")}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
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
<body epub:type="titlepage">
  ${publisher ? `<p class="title-publisher">${escapeXml(publisher)}</p>` : ""}
  ${title ? `<h1>${escapeXml(title)}</h1>` : ""}
  ${subtitle ? `<p class="subtitle">${escapeXml(subtitle)}</p>` : ""}
  ${author ? `<p class="author">by ${escapeXml(author)}</p>` : ""}
</body>
</html>`;
}

export function getSectionEpubType(sectionType?: ChapterSectionType): string {
  switch (sectionType) {
    case "copyright":
      return "copyright-page";
    case "dedication":
      return "dedication";
    case undefined:
    case "chapter":
    case "indented":
    case "introduction":
    case "appendix":
    case "journal":
    case "workbook":
    case "checklist":
    case "reflection":
    case "quote":
    case "photo-spread":
    case "timeline":
    case "glossary":
    case "interview":
    case "takeaways":
    case "resources":
    case "learning-objectives":
    case "practice-quiz":
    case "bibliography":
      return "chapter";
    default: {
      const _exhaustive: never = sectionType;
      return _exhaustive;
    }
  }
}

function buildFixedSpreadBody(spread: FixedSpread): string {
  const elements = spread.elements
    .map((el) => {
      const style = `position:absolute;left:${el.x}%;top:${el.y}%;width:${el.width}%;height:${el.height}%;`;
      if (el.type === "image") {
        const src = el.content.startsWith("assets/")
          ? `../images/${el.content.replace("assets/", "")}`
          : el.content;
        return `<img src="${src}" style="${style}object-fit:contain;" alt=""/>`;
      }
      return `<p style="${style}font-size:${el.fontSize ?? 16}px;margin:0;">${escapeXml(el.content)}</p>`;
    })
    .join("\n    ");
  return `<div class="fixed-spread" style="position:relative;width:${spread.width}px;height:${spread.height}px;background:${spread.background ?? "#fff"};">${elements}</div>`;
}

function chapterXhtml(book: Book, chapter: Chapter, index: number): string {
  if (chapter.fixedSpread) {
    const body = buildFixedSpreadBody(chapter.fixedSpread);
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <meta name="viewport" content="width=${chapter.fixedSpread.width}, height=${chapter.fixedSpread.height}"/>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
  <style>.fixed-spread { margin: 0 auto; overflow: hidden; }</style>
</head>
<body>
  <section epub:type="chapter" id="chapter-${index}">
    <h1 class="sr-only">${escapeXml(chapter.title)}</h1>
    ${body}
  </section>
</body>
</html>`;
  }

  const content = rewriteAssetPaths(prepareChapterContent(book, chapter.content));
  const epubType = getSectionEpubType(chapter.sectionType);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
</head>
<body>
  <section epub:type="${epubType}" id="chapter-${index}">
    ${content}
  </section>
</body>
</html>`;
}

export { prepareChapterContent, transformWidgetsForEpub };

/** Guidebook block export CSS — kept in sync with print-preview rules in globals.css */
export const GUIDEBOOK_EXPORT_CSS = `
.guidebook-block {
  margin: 1.5em 0;
  border: 1px solid #ccc;
  border-radius: 6px;
  overflow: hidden;
  text-indent: 0;
}
.guidebook-block-header {
  padding: 0.6em 1em;
  font-size: 0.75em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.guidebook-block-body { padding: 1em; }
.guidebook-block-body h3 { margin: 0 0 0.5em; font-size: 1.1em; }
.guidebook-trail-stop {
  border-color: #00a86b;
  border-left-width: 4px;
}
.guidebook-trail-stop .guidebook-block-header { background: #f0faf5; color: #007a4d; }
.guidebook-workshop {
  border-color: #c026d3;
  border-left-width: 4px;
}
.guidebook-workshop .guidebook-block-header { background: #fdf4ff; color: #a21caf; }
.guidebook-cheat-sheet {
  border-color: #0891b2;
  border-left-width: 4px;
}
.guidebook-cheat-sheet .guidebook-block-header { background: #ecfeff; color: #0e7490; }
.cheat-grid { display: grid; gap: 0.35em 1em; }
.cheat-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.cheat-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.cheat-label { font-weight: 600; color: #0e7490; }
.workshop-exercise { margin: 0.6em 0; padding: 0.5em 0.75em; background: #faf5ff; border-radius: 4px; }
.response-hint { font-size: 0.85em; color: #888; font-style: italic; }
.trail-meta { font-size: 0.85em; color: #666; margin: 0.25em 0 0.5em; }
.trail-amenities { margin: 0.5em 0 0; padding-left: 1.25em; font-size: 0.9em; }
`;

const WIDGET_EXPORT_CSS = `/* Interactive widgets */
details.popup-widget {
  margin: 1.5em 0;
  border: 1px solid #00e5ff;
  border-radius: 8px;
  overflow: hidden;
}
details.popup-widget summary {
  padding: 0.75em 1em;
  background: #e8f9fc;
  cursor: pointer;
  font-weight: 600;
  color: #006680;
  list-style: none;
}
details.popup-widget summary::-webkit-details-marker { display: none; }
details.popup-widget[open] summary { border-bottom: 1px solid #00e5ff; }
details.popup-widget > div { padding: 1em; }

.gallery-widget {
  margin: 1.5em 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  justify-content: center;
}
.gallery-widget .gallery-item {
  flex: 1 1 200px;
  max-width: 100%;
  text-align: center;
}
.gallery-widget .gallery-item img {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.gallery-widget figcaption {
  font-size: 0.85em;
  color: #666;
  margin-top: 0.5em;
  font-style: italic;
}
`;

/** Assembled export stylesheet — guidebook CSS is always included (KBP path previously dropped it). */
export function buildExportCss(
  useKbp: boolean,
  theme?: Partial<ExportThemeSettings> | null
): string {
  const normalized = normalizeExportTheme(theme);
  const themeCss = buildThemeTypographyCss(normalized.themeId, useKbp);
  const base = useKbp ? `${KBP_CSS}\n${themeCss}` : themeCss;
  const css = `${base}\n${WIDGET_EXPORT_CSS}\n${TABLE_EXPORT_CSS}\n${GUIDEBOOK_EXPORT_CSS}`;
  return appendCustomCss(css, normalized.customCss);
}

export async function exportToEpub(
  book: Book,
  assetBlobs?: Map<string, Blob>
): Promise<Blob> {
  const zip = new JSZip();
  const { metadata, chapters } = book;
  const isFixed = book.layoutMode === "landscape";
  const useKbp = isKbpEnabled(book);
  const css = buildExportCss(useKbp, book.exportTheme);

  const coverFilename = book.metadata.coverImage?.startsWith("assets/")
    ? book.metadata.coverImage.replace("assets/", "")
    : null;
  const hasCover = Boolean(coverFilename);
  const includeTitlePage = hasTitlePage(book);

  const chapterHtmlParts = chapters.map((ch) => prepareChapterContent(book, ch.content));
  await embedAssets(zip, book, assetBlobs, chapterHtmlParts);

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  const imageManifest = [...new Set(
    chapterHtmlParts.flatMap((html) => [...collectAssetFilenames(book, html)])
  )]
    .map((filename) => {
      const id = `img-${filename.replace(/[^a-z0-9]/gi, "-")}`;
      const coverProps =
        coverFilename === filename ? ' properties="cover-image"' : "";
      return `<item id="${id}" href="images/${filename}" media-type="image/jpeg"${coverProps}/>`;
    })
    .join("\n    ");

  const chapterManifest = chapters
    .map(
      (_, i) =>
        `<item id="chapter${i}" href="text/chapter${i}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join("\n    ");

  const coverManifest = hasCover
    ? `<item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>`
    : "";

  const titleManifest = includeTitlePage
    ? `<item id="titlepage" href="text/title.xhtml" media-type="application/xhtml+xml"/>`
    : "";

  const spineItems = [
    hasCover ? `<itemref idref="cover" linear="no"/>` : "",
    includeTitlePage ? `<itemref idref="titlepage"/>` : "",
    ...chapters.map((_, i) => `<itemref idref="chapter${i}"/>`),
  ]
    .filter(Boolean)
    .join("\n    ");

  const navItems = [
    hasCover ? `<li><a href="text/cover.xhtml">Cover</a></li>` : "",
    includeTitlePage ? `<li><a href="text/title.xhtml">Title Page</a></li>` : "",
    buildEpubNavListItems(book, escapeXml),
  ]
    .filter(Boolean)
    .join("\n        ");

  const landmarkItems = [
    hasCover ? `<li><a epub:type="cover" href="text/cover.xhtml">Cover</a></li>` : "",
    includeTitlePage
      ? `<li><a epub:type="titlepage" href="text/title.xhtml">Title Page</a></li>`
      : "",
    `<li><a epub:type="toc" href="nav.xhtml">Table of Contents</a></li>`,
  ].join("\n        ");

  const coverMeta = hasCover
    ? `<meta name="cover" content="img-${coverFilename!.replace(/[^a-z0-9]/gi, "-")}"/>`
    : "";

  const storeMetadata = buildStoreMetadataOpf(metadata);
  const accessibilityMetadata = buildAccessibilityMetadataOpf(
    metadata,
    deriveEpubAccessibilityMetadata(book)
  );

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" xmlns:opf="http://www.idpf.org/2007/opf" version="3.3" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:${book.id}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    <dc:language>${escapeXml(metadata.language || "en")}</dc:language>
    <dc:description>${escapeXml(metadata.description)}</dc:description>
    <dc:publisher>${escapeXml(metadata.publisher || "OpenBook Author")}</dc:publisher>
    ${storeMetadata}${accessibilityMetadata}<meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
    ${coverMeta}
    ${isFixed ? '<meta property="rendition:layout">pre-paginated</meta>' : '<meta property="rendition:layout">reflowable</meta>'}
  </metadata>
  <manifest>
    <item id="ncx" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="styles/main.css" media-type="text/css"/>
    ${coverManifest}
    ${titleManifest}
    ${imageManifest}
    ${chapterManifest}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`;

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
        ${navItems}
    </ol>
  </nav>
  <nav epub:type="landmarks" hidden=""><ol>
        ${landmarkItems}
    </ol></nav>
</body>
</html>`;

  zip.folder("META-INF")?.file(
    "container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  zip.file("content.opf", opf);
  zip.file("nav.xhtml", nav);
  zip.folder("styles")?.file("main.css", css);

  const textFolder = zip.folder("text");
  if (hasCover && coverFilename) {
    textFolder?.file("cover.xhtml", coverXhtml(book, coverFilename));
  }
  if (includeTitlePage) {
    textFolder?.file("title.xhtml", titleXhtml(book));
  }
  chapters.forEach((chapter, i) => {
    textFolder?.file(`chapter${i}.xhtml`, chapterXhtml(book, chapter, i));
  });

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

export function downloadEpub(book: Book, assetBlobs?: Map<string, Blob>): Promise<void> {
  return exportToEpub(book, assetBlobs).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.metadata.title || "book"}.epub`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function exportBookJson(book: Book): void {
  const blob = new Blob([JSON.stringify(book, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${book.metadata.title || "book"}.openbook.json`;
  a.click();
  URL.revokeObjectURL(url);
}
