import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import type { Book, BookAsset, Chapter, ChapterSectionType } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { assetPath, sanitizeFilename } from "@/lib/asset-store";
import { serializeGuidebookBlockToHtml } from "@/lib/guidebook-seed";
import type {
  GuidebookBlockType,
  CheatSheetPayload,
  TrailStopPayload,
  WorkshopPayload,
} from "@/types/guidebook";
import { createListId } from "@/types/guidebook";
import { reverseNotesFromEpub } from "@/lib/note-export";

export interface EpubImportResult {
  book: Omit<Book, "id" | "createdAt" | "updatedAt">;
  assetBlobs: Map<string, Blob>;
  warnings: string[];
}

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties: string;
}

function normalizeZipPath(...segments: string[]): string {
  const parts: string[] = [];
  for (const segment of segments.join("/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

function resolveHref(opfDir: string, href: string): string {
  return normalizeZipPath(opfDir, href);
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractFirstTagContent(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(re);
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function extractMetaValue(opf: string, selector: string): string {
  if (selector.startsWith("dc:")) {
    const tag = selector.slice(3);
    return extractFirstTagContent(opf, `dc:${tag}`) || extractFirstTagContent(opf, tag);
  }
  const propMatch = opf.match(
    new RegExp(`<meta\\s+[^>]*property="${selector}"[^>]*content="([^"]*)"`, "i")
  );
  return propMatch ? decodeXmlEntities(propMatch[1]) : "";
}

function parseManifestItems(opf: string): ManifestItem[] {
  const items: ManifestItem[] = [];
  const re = /<item\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(opf)) !== null) {
    const attrs = match[1];
    const id = attrs.match(/\bid="([^"]*)"/i)?.[1];
    const href = attrs.match(/\bhref="([^"]*)"/i)?.[1];
    const mediaType = attrs.match(/\bmedia-type="([^"]*)"/i)?.[1];
    if (!id || !href || !mediaType) continue;
    const properties = attrs.match(/\bproperties="([^"]*)"/i)?.[1] ?? "";
    items.push({ id, href, mediaType, properties });
  }
  return items;
}

function parseSpineIdrefs(opf: string): string[] {
  const ids: string[] = [];
  const re = /<itemref\b[^>]*\bidref="([^"]*)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(opf)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractBodyHtml(xhtml: string): string {
  const bodyMatch = xhtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return xhtml;
  return bodyMatch[1].trim();
}

function extractBodyEpubType(xhtml: string): string {
  const bodyTag = xhtml.match(/<body\b([^>]*)>/i)?.[1] ?? "";
  return bodyTag.match(/epub:type="([^"]*)"/i)?.[1] ?? "";
}

function extractDocumentEpubType(xhtml: string): string {
  const bodyType = extractBodyEpubType(xhtml);
  if (bodyType) return bodyType;
  return xhtml.match(/<section\b[^>]*epub:type="([^"]*)"/i)?.[1] ?? "";
}

function stripTags(html: string): string {
  return decodeXmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function inferSectionType(
  epubType: string,
  html: string,
  href: string
): ChapterSectionType | undefined {
  const normalized = epubType.toLowerCase();
  if (normalized.includes("copyright")) return "copyright";
  if (normalized.includes("dedication")) return "dedication";
  if (html.includes('class="section-copyright"')) return "copyright";
  if (html.includes('class="section-dedication"')) return "dedication";
  if (href.includes("copyright")) return "copyright";
  if (href.includes("dedication")) return "dedication";
  return "chapter";
}

function inferChapterTitle(html: string, fallback: string): string {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) {
    const title = stripTags(h1);
    if (title) return title;
  }
  return fallback;
}

function shouldSkipSpineItem(item: ManifestItem): boolean {
  const props = item.properties.toLowerCase();
  if (props.includes("nav")) return true;
  const href = item.href.toLowerCase();
  if (href.endsWith("nav.xhtml") || href.endsWith("toc.xhtml")) return true;
  if (props.includes("cover-image")) return true;
  if (href.endsWith("cover.xhtml")) return true;
  if (href.endsWith("title.xhtml")) return true;
  if (!item.mediaType.includes("html")) return true;
  return false;
}

function nextUniqueFilename(existing: Set<string>, original: string): string {
  const base = sanitizeFilename(original.split("/").pop() || original);
  if (!existing.has(base)) {
    existing.add(base);
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  let i = 1;
  while (existing.has(`${stem}-${i}${ext}`)) i++;
  const unique = `${stem}-${i}${ext}`;
  existing.add(unique);
  return unique;
}

function guessMimeType(filename: string, declared?: string): string {
  if (declared && declared !== "application/octet-stream") return declared;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

function rewriteImageSources(
  html: string,
  chapterPath: string,
  hrefToAssetPath: Map<string, string>
): string {
  return html.replace(/\bsrc="([^"]+)"/gi, (full, src: string) => {
    if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("assets/")) {
      return full;
    }
    const resolved = normalizeZipPath(chapterPath, "..", src);
    const assetPathValue = hrefToAssetPath.get(resolved);
    if (!assetPathValue) return full;
    return `src="${assetPathValue}"`;
  });
}

function encodeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

function extractTagInner(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function extractClassBlockInner(html: string, className: string): string {
  const openMatch = html.match(
    new RegExp(`<([a-z]+)\\b[^>]*class="[^"]*${className}[^"]*"[^>]*>`, "i")
  );
  if (!openMatch || openMatch.index === undefined) return "";
  const tag = openMatch[1].toLowerCase();
  const start = openMatch.index + openMatch[0].length;
  if (tag === "div") {
    let depth = 1;
    let i = start;
    while (i < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", i);
      const nextClose = html.indexOf("</div>", i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        i = nextOpen + 4;
      } else {
        depth -= 1;
        if (depth === 0) return html.slice(start, nextClose).trim();
        i = nextClose + 6;
      }
    }
    return "";
  }
  const closeMatch = html.slice(start).match(new RegExp(`<\\/${tag}>`, "i"));
  if (!closeMatch || closeMatch.index === undefined) return "";
  return html.slice(start, start + closeMatch.index).trim();
}

function extractListItemTexts(html: string): string[] {
  const items: string[] = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const text = stripTags(match[1]);
    if (text) items.push(text);
  }
  return items;
}

const GUIDEBOOK_SLUG_TO_TYPE: Record<string, GuidebookBlockType> = {
  "trail-stop": "trail_stop",
  workshop: "workshop",
  "cheat-sheet": "cheat_sheet",
};

function parseTrailStopFromExport(body: string): TrailStopPayload {
  const name = stripTags(extractTagInner(body, "h3")) || "Trail Stop";
  const metaText = stripTags(extractClassBlockInner(body, "trail-meta"));
  let mileMarker = "";
  let elevation = "";
  const mileMatch = metaText.match(/Mile\s+([^·]+)/i);
  if (mileMatch) mileMarker = mileMatch[1].trim();
  if (metaText.includes("·")) {
    elevation = metaText.split("·").slice(1).join("·").trim();
  }
  const notesMatch = body.match(
    /<p\b(?![^>]*class="[^"]*trail-meta)[^>]*>([\s\S]*?)<\/p>/i
  );
  const notes = notesMatch ? stripTags(notesMatch[1]) : "";
  const amenitiesHtml = extractClassBlockInner(body, "trail-amenities");
  const amenities = extractListItemTexts(amenitiesHtml).map((value) => ({
    id: createListId(),
    value,
  }));
  return { name, mileMarker, elevation, notes, amenities };
}

function parseWorkshopFromExport(body: string): WorkshopPayload {
  const title = stripTags(extractTagInner(body, "h3")) || "Workshop";
  const exercises: WorkshopPayload["exercises"] = [];
  const re = /<div[^>]*class="[^"]*workshop-exercise[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const inner = match[1];
    const hintMatch = inner.match(
      /<span[^>]*class="[^"]*response-hint[^"]*"[^>]*>\s*\((short|long)\s+answer\)\s*<\/span>/i
    );
    const responseType = hintMatch?.[1]?.toLowerCase() === "long" ? "long" : "short";
    const prompt = stripTags(
      inner
        .replace(/<span[^>]*class="[^"]*response-hint[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "")
        .replace(/<strong>[\s\S]*?<\/strong>/gi, "")
    );
    exercises.push({ id: createListId(), prompt, responseType });
  }
  return { title, exercises: exercises.length > 0 ? exercises : [{ id: createListId(), prompt: "", responseType: "short" }] };
}

function parseCheatSheetFromExport(body: string): CheatSheetPayload {
  const title = stripTags(extractTagInner(body, "h3")) || "Quick Reference";
  const gridMatch = body.match(
    /<div[^>]*class="([^"]*cheat-grid[^"]*)"[^>]*>([\s\S]*?)<\/div>/i
  );
  const gridHtml = gridMatch?.[2] ?? "";
  const gridClass = gridMatch?.[1] ?? "";
  const columns: 2 | 3 = gridClass.includes("cols-3") ? 3 : 2;
  const items: CheatSheetPayload["items"] = [];
  const pairRe =
    /<span[^>]*class="[^"]*cheat-label[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<span>([\s\S]*?)<\/span>/gi;
  let pairMatch: RegExpExecArray | null;
  while ((pairMatch = pairRe.exec(gridHtml)) !== null) {
    items.push({
      id: createListId(),
      label: stripTags(pairMatch[1]),
      value: stripTags(pairMatch[2]),
    });
  }
  return {
    title,
    columns,
    items: items.length > 0 ? items : [{ id: createListId(), label: "", value: "" }],
  };
}

function reverseGuidebookBlockExportMarkup(html: string): string {
  return html.replace(
    /<aside\b([^>]*class="[^"]*guidebook-block[^"]*guidebook-(trail-stop|workshop|cheat-sheet)[^"]*"[^>]*)>([\s\S]*?)<\/aside>/gi,
    (full, attrs, slug, inner) => {
      if (/\bdata-guidebook="/i.test(attrs) && /\bdata-payload="/i.test(attrs)) {
        return full;
      }
      const blockType = GUIDEBOOK_SLUG_TO_TYPE[slug];
      if (!blockType) return full;
      const body = extractClassBlockInner(inner, "guidebook-block-body") || inner;
      let payload: TrailStopPayload | WorkshopPayload | CheatSheetPayload;
      switch (blockType) {
        case "trail_stop":
          payload = parseTrailStopFromExport(body);
          break;
        case "workshop":
          payload = parseWorkshopFromExport(body);
          break;
        case "cheat_sheet":
          payload = parseCheatSheetFromExport(body);
          break;
        default: {
          const _exhaustive: never = blockType;
          return _exhaustive;
        }
      }
      return serializeGuidebookBlockToHtml(blockType, payload);
    }
  );
}

function reversePopupWidgetExportMarkup(html: string): string {
  return html.replace(
    /<details\b[^>]*class="[^"]*popup-widget[^"]*"[^>]*>([\s\S]*?)<\/details>/gi,
    (_, inner) => {
      const title = stripTags(extractTagInner(inner, "summary")) || "Tap to reveal";
      const content = extractTagInner(inner, "div") || "<p>Hidden content goes here.</p>";
      return `<div data-widget="popup" data-title="${encodeHtmlAttribute(title)}" data-content="${encodeHtmlAttribute(content)}" class="popup-widget"></div>`;
    }
  );
}

function reverseGalleryWidgetExportMarkup(html: string): string {
  return html.replace(
    /<div\b[^>]*class="[^"]*gallery-widget[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    (full, inner) => {
      if (/\bdata-widget="gallery"/i.test(full)) return full;
      const images: { src: string; caption: string }[] = [];
      const figureRe = /<figure[^>]*class="[^"]*gallery-item[^"]*"[^>]*>([\s\S]*?)<\/figure>/gi;
      let figureMatch: RegExpExecArray | null;
      while ((figureMatch = figureRe.exec(inner)) !== null) {
        const figureInner = figureMatch[1];
        const src = figureInner.match(/\bsrc="([^"]+)"/i)?.[1] ?? "";
        const caption =
          stripTags(extractTagInner(figureInner, "figcaption")) ||
          figureInner.match(/\balt="([^"]*)"/i)?.[1] ||
          "";
        if (src) images.push({ src, caption });
      }
      if (images.length === 0) return full;
      const imagesJson = encodeHtmlAttribute(JSON.stringify(images));
      return `<div data-widget="gallery" data-images="${imagesJson}" class="gallery-widget"></div>`;
    }
  );
}

/** Reverse EPUB export widget markup back into TipTap-compatible HTML. */
export function reverseTransformWidgetsFromEpub(html: string): string {
  let result = html;
  result = reverseGuidebookBlockExportMarkup(result);
  result = reversePopupWidgetExportMarkup(result);
  result = reverseGalleryWidgetExportMarkup(result);
  result = reverseNotesFromEpub(result);
  return result;
}

function hasUnresolvedExportWidgetMarkup(html: string): boolean {
  return (
    /<details\b[^>]*class="[^"]*popup-widget/i.test(html) ||
    /<div\b[^>]*class="[^"]*gallery-widget[^"]*"[^>]*>\s*<figure/i.test(html) ||
    /<aside\b[^>]*class="[^"]*guidebook-block[^"]*"[^>]*>\s*<header class="guidebook-block-header"/i.test(
      html
    )
  );
}

export async function importEpubFile(file: File | Blob): Promise<EpubImportResult> {
  const warnings: string[] = [];
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const containerXml = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) throw new Error("Invalid EPUB: missing META-INF/container.xml");

  const opfPath =
    containerXml.match(/full-path="([^"]+)"/i)?.[1] ??
    containerXml.match(/full-path='([^']+)'/i)?.[1];
  if (!opfPath) throw new Error("Invalid EPUB: could not locate package document");

  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const opfContent = await zip.file(opfPath)?.async("string");
  if (!opfContent) throw new Error("Invalid EPUB: missing package document");

  const manifest = parseManifestItems(opfContent);
  const manifestById = new Map(manifest.map((item) => [item.id, item]));
  const spineIds = parseSpineIdrefs(opfContent);

  const metadata = {
    title: extractMetaValue(opfContent, "dc:title") || "Imported EPUB",
    subtitle: "",
    author: extractMetaValue(opfContent, "dc:creator") || "",
    publisher: extractMetaValue(opfContent, "dc:publisher") || "",
    language: extractMetaValue(opfContent, "dc:language") || "en",
    description: extractMetaValue(opfContent, "dc:description") || "",
  };

  const assets: BookAsset[] = [];
  const assetBlobs = new Map<string, Blob>();
  const usedFilenames = new Set<string>();
  const hrefToAssetPath = new Map<string, string>();

  for (const item of manifest) {
    if (!item.mediaType.startsWith("image/")) continue;
    const zipPath = resolveHref(opfDir, item.href);
    const entry = zip.file(zipPath);
    if (!entry) {
      warnings.push(`Missing image asset: ${item.href}`);
      continue;
    }
    const data = await entry.async("arraybuffer");
    const filename = nextUniqueFilename(usedFilenames, item.href);
    const asset: BookAsset = {
      id: uuidv4(),
      filename,
      mimeType: guessMimeType(filename, item.mediaType),
      size: data.byteLength,
      createdAt: new Date().toISOString(),
    };
    assets.push(asset);
    assetBlobs.set(asset.id, new Blob([data], { type: asset.mimeType }));
    hrefToAssetPath.set(zipPath, assetPath(filename));
    hrefToAssetPath.set(item.href, assetPath(filename));
  }

  const coverMeta = opfContent.match(/<meta\s+[^>]*name="cover"\s+content="([^"]+)"/i)?.[1];
  let coverImage: string | undefined;
  if (coverMeta) {
    const coverItem = manifestById.get(coverMeta);
    if (coverItem) {
      const coverPath = resolveHref(opfDir, coverItem.href);
      coverImage = hrefToAssetPath.get(coverPath) ?? hrefToAssetPath.get(coverItem.href);
    }
  }

  const chapters: Chapter[] = [];
  const spineOrder =
    spineIds.length > 0
      ? spineIds
      : manifest.filter((item) => item.mediaType.includes("html")).map((item) => item.id);

  let order = 0;
  for (const idref of spineOrder) {
    const item = manifestById.get(idref);
    if (!item || shouldSkipSpineItem(item)) continue;

    const chapterZipPath = resolveHref(opfDir, item.href);
    const xhtml = await zip.file(chapterZipPath)?.async("string");
    if (!xhtml) {
      warnings.push(`Missing spine document: ${item.href}`);
      continue;
    }

    const bodyHtml = extractBodyHtml(xhtml);
    const epubType = extractDocumentEpubType(xhtml);
    const withAssets = rewriteImageSources(bodyHtml, chapterZipPath, hrefToAssetPath);
    const content = reverseTransformWidgetsFromEpub(withAssets);
    const title = inferChapterTitle(content, item.id.replace(/[-_]/g, " "));
    const sectionType = inferSectionType(epubType, content, item.href);

    if (hasUnresolvedExportWidgetMarkup(content)) {
      warnings.push(
        `Section "${title}" contains widgets or guidebook blocks that could not be fully restored.`
      );
    }

    chapters.push({
      id: uuidv4(),
      title,
      content,
      order,
      sectionType,
    });
    order++;
  }

  if (chapters.length === 0) {
    throw new Error("EPUB contains no importable chapters");
  }

  const book: Omit<Book, "id" | "createdAt" | "updatedAt"> = {
    metadata: {
      ...metadata,
      coverImage,
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters,
    assets,
  };

  return { book, assetBlobs, warnings };
}
