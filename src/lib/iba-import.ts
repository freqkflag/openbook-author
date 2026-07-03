import { ungzip } from "pako";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import type { Book, Chapter, ChapterSectionType } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";

export interface IBAHierarchyEntry {
  title: string;
  nodeType: string;
  depth: number;
  children: IBAHierarchyEntry[];
}

export interface IBAImportDiagnostics {
  imported: {
    chapters: number;
    images: number;
    metadataFields: string[];
  };
  skipped: string[];
  lost: {
    widgets: string[];
    layout: string[];
    media: string[];
    unsupportedTags: string[];
  };
  hierarchy: IBAHierarchyEntry[];
  summary: string[];
}

export interface IBAImportResult {
  book: Omit<Book, "id" | "createdAt" | "updatedAt">;
  warnings: string[];
  diagnostics: IBAImportDiagnostics;
}

async function gunzipIfNeeded(data: Uint8Array, filename: string): Promise<string> {
  if (filename.endsWith(".gz")) {
    const decompressed = ungzip(data);
    return new TextDecoder("utf-8").decode(decompressed);
  }
  return new TextDecoder("utf-8").decode(data);
}

function getTextContent(el: Element | null): string {
  if (!el) return "";
  return el.textContent?.trim() || "";
}

function extractMetadata(doc: Document): Partial<Book["metadata"]> {
  const metadata: Partial<Book["metadata"]> = {
    title: "Imported from iBooks Author",
    subtitle: "",
    author: "",
    publisher: "",
    language: "en",
    description: "",
  };

  const titleEl = doc.querySelector("sf\\:title sf\\:string, title string");
  if (titleEl) metadata.title = getTextContent(titleEl) || metadata.title;

  const subtitleEl = doc.querySelector("sf\\:subtitle sf\\:string, subtitle string");
  if (subtitleEl) metadata.subtitle = getTextContent(subtitleEl);

  const authorEl = doc.querySelector("sf\\:authors sf\\:string, authors string");
  if (authorEl) metadata.author = getTextContent(authorEl);

  const langEl = doc.querySelector("sf\\:language, language");
  if (langEl) metadata.language = getTextContent(langEl) || "en";

  const copyrightEl = doc.querySelector("sf\\:copyright, copyright");
  if (copyrightEl) metadata.description = getTextContent(copyrightEl);

  return metadata;
}

interface ContentNode {
  guid: string;
  parentGuid: string;
  title: string;
  nodeType: string;
  nodePath: string;
}

function extractContentNodes(doc: Document): ContentNode[] {
  const nodes: ContentNode[] = [];
  const elements = doc.querySelectorAll(
    "sl\\:content-node, content-node, [sl\\:node-type], [node-type]"
  );

  elements.forEach((el) => {
    const nodeType =
      el.getAttribute("sl:node-type") || el.getAttribute("node-type") || "";
    const nodePath =
      el.getAttribute("sl:node-path") || el.getAttribute("node-path") || "";
    const guid = el.getAttribute("sl:GUID") || el.getAttribute("GUID") || "";
    const parentGuid =
      el.getAttribute("sl:parent-GUID") || el.getAttribute("parent-GUID") || "";
    const title = el.getAttribute("sl:title") || el.getAttribute("title") || "";

    if (nodePath) {
      nodes.push({ guid, parentGuid, title, nodeType, nodePath });
    }
  });

  return nodes;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttribute(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

interface TagMapping {
  pattern: RegExp;
  htmlTag: string;
  className?: string;
}

const TAG_MAPPINGS: TagMapping[] = [
  { pattern: /^(title|chapter|chaptertitle)$/i, htmlTag: "h1" },
  { pattern: /^section$/i, htmlTag: "h2" },
  { pattern: /^(subsection|subheading)$/i, htmlTag: "h3" },
  { pattern: /^heading$/i, htmlTag: "h2" },
  { pattern: /^(pullquote|quote|blockquote)$/i, htmlTag: "blockquote" },
  { pattern: /^(caption|figcaption)$/i, htmlTag: "figcaption" },
  { pattern: /^(listitem|bullet)$/i, htmlTag: "li" },
  {
    pattern: /^(sidebar|aside|note|keytakeaway|tip|warning|callout|objective)$/i,
    htmlTag: "blockquote",
    className: "iba-callout",
  },
  { pattern: /^(code|monospace|preformatted)$/i, htmlTag: "pre" },
  { pattern: /^(body|paragraph|text)$/i, htmlTag: "p" },
];

const WIDGET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /review-?widget|reviewquestion|multiplechoice/i, label: "Review/quiz widget" },
  { pattern: /html-?widget|htmlwidget/i, label: "HTML widget" },
  { pattern: /keynote|slideshow/i, label: "Keynote/slideshow widget" },
  { pattern: /3d-?widget|three-?d/i, label: "3D widget" },
  { pattern: /interactive-?image|image-?hotspot/i, label: "Interactive image widget" },
  { pattern: /scrolling-?sidebar|scrollable/i, label: "Scrolling sidebar widget" },
  { pattern: /popover|pop-?over/i, label: "Popover widget" },
  { pattern: /movie|video-?widget|sf:video/i, label: "Video widget" },
  { pattern: /audio-?widget|sf:audio/i, label: "Audio widget" },
  { pattern: /gallery-?widget|image-?gallery/i, label: "Image gallery widget" },
  { pattern: /widget/i, label: "Interactive widget" },
];

function resolveTagMapping(tag: string): TagMapping | null {
  for (const mapping of TAG_MAPPINGS) {
    if (mapping.pattern.test(tag.trim())) return mapping;
  }
  if (tag.includes("title") || tag.includes("chapter")) {
    return TAG_MAPPINGS[0];
  }
  if (tag.includes("Section")) {
    return TAG_MAPPINGS[1];
  }
  return null;
}

function wrapWithTag(htmlTag: string, text: string, className?: string): string {
  const cls = className ? ` class="${className}"` : "";
  if (htmlTag === "li") {
    return `<ul><li${cls}>${escapeHtml(text)}</li></ul>`;
  }
  if (htmlTag === "blockquote" && className) {
    return `<blockquote${cls}><p>${escapeHtml(text)}</p></blockquote>`;
  }
  return `<${htmlTag}${cls}>${escapeHtml(text)}</${htmlTag}>`;
}

interface ParagraphParseResult {
  html: string[];
  unsupportedTags: string[];
  widgets: string[];
  layoutLost: string[];
  imagesImported: number;
  imagesMissing: number;
}

function paragraphsToHtml(
  sectionDoc: Document,
  assetMap: Map<string, string>
): ParagraphParseResult {
  const parts: string[] = [];
  const unsupportedTags = new Set<string>();
  const widgets = new Set<string>();
  const layoutLost = new Set<string>();
  let imagesImported = 0;
  let imagesMissing = 0;

  const sectionXml = sectionDoc.documentElement?.outerHTML ?? "";
  for (const { pattern, label } of WIDGET_PATTERNS) {
    if (pattern.test(sectionXml)) {
      widgets.add(label);
    }
  }

  const shapes = sectionDoc.querySelectorAll("sf\\:drawable-shape, drawable-shape");

  shapes.forEach((shape) => {
    const tag = shape.getAttribute("sl:tag") || shape.getAttribute("tag") || "";
    const paragraphs = shape.querySelectorAll("sf\\:p, p");

    if (paragraphs.length === 0 && tag && !resolveTagMapping(tag)) {
      layoutLost.add(`Layout shape (${tag || "untagged"})`);
    }

    paragraphs.forEach((p) => {
      const text =
        getTextContent(p.querySelector("sf\\:ghost-text, ghost-text")) ||
        getTextContent(p.querySelector("sf\\:title-name, title-name")) ||
        getTextContent(p);

      if (!text) return;

      const mapping = resolveTagMapping(tag);
      if (mapping) {
        parts.push(wrapWithTag(mapping.htmlTag, text, mapping.className));
      } else if (tag) {
        unsupportedTags.add(tag);
        parts.push(`<p>${escapeHtml(text)}</p>`);
      } else {
        parts.push(`<p>${escapeHtml(text)}</p>`);
      }
    });

    const mediaEls = shape.querySelectorAll(
      "sf\\:media sf\\:image-media, media image-media, SFEData"
    );
    mediaEls.forEach((media) => {
      const path =
        media.getAttribute("sf:path") ||
        media.getAttribute("path") ||
        media.closest("SFEData")?.getAttribute("sf:path") ||
        "";
      if (path && assetMap.has(path)) {
        parts.push(`<img src="${assetMap.get(path)}" alt="" />`);
        imagesImported += 1;
      } else if (path) {
        imagesMissing += 1;
        layoutLost.add(`Missing image: ${path.split("/").pop() || path}`);
      }
    });

    if (/popover|pop-?over/i.test(tag)) {
      const popText = getTextContent(shape);
      if (popText) {
        parts.push(
          `<div data-widget="popup" data-title="${escapeHtmlAttribute("Tap to reveal")}" data-content="${escapeHtmlAttribute(`<p>${escapeHtml(popText)}</p>`)}" class="popup-widget"></div>`
        );
      }
    }
  });

  if (parts.length === 0) {
    const allText = sectionDoc.querySelectorAll("sf\\:ghost-text, ghost-text, sf\\:p, p");
    allText.forEach((el) => {
      const text = getTextContent(el);
      if (text && text.length > 10) {
        parts.push(`<p>${escapeHtml(text)}</p>`);
      }
    });
  }

  return {
    html: parts.length > 0 ? parts : ["<p><em>No text content extracted from this section.</em></p>"],
    unsupportedTags: [...unsupportedTags],
    widgets: [...widgets],
    layoutLost: [...layoutLost],
    imagesImported,
    imagesMissing,
  };
}

async function buildAssetMap(zip: JSZip): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const lower = path.toLowerCase();
    if (!imageExts.some((ext) => lower.endsWith(ext))) continue;

    const basename = path.split("/").pop() || path;
    const data = await file.async("base64");
    const mime = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".gif")
        ? "image/gif"
        : lower.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
    map.set(basename, `data:${mime};base64,${data}`);
    const pathKey = path.replace(/^\.\//, "");
    map.set(pathKey, `data:${mime};base64,${data}`);
  }

  return map;
}

async function findIndexXml(zip: JSZip): Promise<string | null> {
  const candidates = ["index.xml.gz", "index.xml", "index-iso.xml.gz", "index-trad.xml.gz"];

  for (const name of candidates) {
    const file = zip.file(name);
    if (file) {
      const data = await file.async("uint8array");
      return gunzipIfNeeded(data, name);
    }
  }

  for (const path of Object.keys(zip.files)) {
    if (
      !zip.files[path].dir &&
      path.includes("index") &&
      (path.endsWith(".xml") || path.endsWith(".xml.gz"))
    ) {
      const data = await zip.file(path)!.async("uint8array");
      return gunzipIfNeeded(data, path);
    }
  }

  return null;
}

function detectTemplate(nodeTypes: string[]): Book["template"] {
  if (nodeTypes.some((t) => t === "cover" || t === "intro")) return "textbook";
  return "portrait";
}

function mapNodeTypeToSectionType(nodeType: string): ChapterSectionType {
  switch (nodeType.toLowerCase()) {
    case "copyright":
      return "copyright";
    case "dedication":
      return "dedication";
    case "intro":
    case "introduction":
      return "introduction";
    case "glossary":
      return "glossary";
    case "appendix":
      return "appendix";
    default:
      return "chapter";
  }
}

function buildHierarchyTree(
  nodes: ContentNode[],
  parentGuid = "",
  depth = 0
): IBAHierarchyEntry[] {
  return nodes
    .filter((n) => n.parentGuid === parentGuid)
    .map((node) => ({
      title: node.title || node.nodeType || "Untitled",
      nodeType: node.nodeType,
      depth,
      children: buildHierarchyTree(nodes, node.guid, depth + 1),
    }));
}

interface FlatChapter {
  node: ContentNode;
  depth: number;
  ancestorTitles: string[];
}

function flattenHierarchy(nodes: ContentNode[]): FlatChapter[] {
  const result: FlatChapter[] = [];

  function walk(parentGuid: string, depth: number, ancestors: string[]) {
    const children = nodes.filter((n) => n.parentGuid === parentGuid);
    for (const node of children) {
      result.push({ node, depth, ancestorTitles: ancestors });
      walk(node.guid, depth + 1, [...ancestors, node.title || node.nodeType]);
    }
  }

  const roots = nodes.filter((n) => !n.parentGuid || !nodes.some((p) => p.guid === n.parentGuid));
  for (const root of roots) {
    result.push({ node: root, depth: 0, ancestorTitles: [] });
    walk(root.guid, 1, [root.title || root.nodeType]);
  }

  if (result.length === 0) {
    for (const node of nodes) {
      result.push({ node, depth: 0, ancestorTitles: [] });
    }
  }

  return result;
}

function formatChapterTitle(flat: FlatChapter, fallback: string): string {
  const base =
    flat.node.title && flat.node.title !== "Untitled"
      ? flat.node.title
      : fallback;

  if (flat.depth === 0 || flat.ancestorTitles.length === 0) {
    return base;
  }

  return [...flat.ancestorTitles, base].filter(Boolean).join(" › ");
}

function countNestedNodes(entries: IBAHierarchyEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.depth > 0) count += 1;
    count += countNestedNodes(entry.children);
  }
  return count;
}

function buildDiagnosticsSummary(diagnostics: IBAImportDiagnostics): string[] {
  const warnings: string[] = [];
  const { imported, skipped, lost } = diagnostics;

  warnings.push(
    `Imported ${imported.chapters} chapter(s) and ${imported.images} image(s).`
  );

  if (imported.metadataFields.length > 0) {
    warnings.push(`Metadata: ${imported.metadataFields.join(", ")}.`);
  }

  if (diagnostics.hierarchy.length > 0) {
    const nested = countNestedNodes(diagnostics.hierarchy);
    if (nested > 0) {
      warnings.push(
        `Preserved ${nested} nested section(s) in chapter order with hierarchy prefixes.`
      );
    }
  }

  for (const item of skipped) {
    warnings.push(`Skipped: ${item}`);
  }

  for (const widget of lost.widgets) {
    warnings.push(`Not imported — ${widget}`);
  }

  for (const layout of lost.layout) {
    warnings.push(`Layout lost — ${layout}`);
  }

  for (const media of lost.media) {
    warnings.push(`Media not found — ${media}`);
  }

  for (const tag of lost.unsupportedTags) {
    warnings.push(`Unsupported sl:tag "${tag}" — imported as plain paragraph`);
  }

  if (lost.widgets.length === 0 && lost.layout.length === 0) {
    warnings.push(
      "Layout and interactive widgets (quizzes, 3D, review cards) are not imported — text and images only."
    );
  }

  return warnings;
}

export async function importIBAFile(file: File): Promise<IBAImportResult> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const indexXml = await findIndexXml(zip);
  if (!indexXml) {
    throw new Error(
      "Could not find index.xml in this file. Make sure it is a valid .iba or .book file."
    );
  }

  const parser = new DOMParser();
  const indexDoc = parser.parseFromString(indexXml, "text/xml");

  if (indexDoc.querySelector("parsererror")) {
    throw new Error("Failed to parse iBooks Author index XML.");
  }

  const metadata = extractMetadata(indexDoc);
  const allContentNodes = extractContentNodes(indexDoc);
  const assetMap = await buildAssetMap(zip);

  const skippedNodes = allContentNodes.filter(
    (n) => n.nodeType === "toc" || n.nodeType === "glossary"
  );
  const contentNodes = allContentNodes.filter(
    (n) => n.nodeType !== "toc" && n.nodeType !== "glossary"
  );

  const diagnostics: IBAImportDiagnostics = {
    imported: {
      chapters: 0,
      images: 0,
      metadataFields: [],
    },
    skipped: skippedNodes.map(
      (n) => `${n.nodeType}: ${n.title || n.nodePath}`
    ),
    lost: {
      widgets: [],
      layout: [],
      media: [],
      unsupportedTags: [],
    },
    hierarchy: buildHierarchyTree(contentNodes),
    summary: [],
  };

  const metadataFields: string[] = [];
  if (metadata.title) metadataFields.push("title");
  if (metadata.subtitle) metadataFields.push("subtitle");
  if (metadata.author) metadataFields.push("author");
  if (metadata.language) metadataFields.push("language");
  if (metadata.description) metadataFields.push("description");
  diagnostics.imported.metadataFields = metadataFields;

  if (contentNodes.length === 0) {
    diagnostics.skipped.push("No content sections found — importing as a single blank chapter.");
  }

  const chapters: Chapter[] = [];
  let order = 0;
  let totalImages = 0;

  const flatNodes = flattenHierarchy(contentNodes);

  for (const flat of flatNodes) {
    const node = flat.node;
    let sectionPath = node.nodePath;
    if (!sectionPath.endsWith(".gz") && !sectionPath.endsWith(".xml")) {
      sectionPath += ".gz";
    }

    let sectionFile =
      zip.file(sectionPath) ||
      zip.file(sectionPath.replace(".gz", ""));

    if (!sectionFile) {
      const basename = sectionPath.split("/").pop() || sectionPath;
      for (const path of Object.keys(zip.files)) {
        if (path.endsWith(basename) || path.includes(node.guid)) {
          sectionFile = zip.file(path)!;
          break;
        }
      }
    }

    if (!sectionFile) {
      diagnostics.skipped.push(`Could not load section: ${node.title || node.nodePath}`);
      continue;
    }

    const sectionData = await sectionFile.async("uint8array");
    const sectionXml = await gunzipIfNeeded(sectionData, sectionPath);
    const sectionDoc = parser.parseFromString(sectionXml, "text/xml");
    const parsed = paragraphsToHtml(sectionDoc, assetMap);

    totalImages += parsed.imagesImported;
    for (const w of parsed.widgets) {
      if (!diagnostics.lost.widgets.includes(w)) diagnostics.lost.widgets.push(w);
    }
    for (const l of parsed.layoutLost) {
      if (!diagnostics.lost.layout.includes(l)) diagnostics.lost.layout.push(l);
    }
    for (const t of parsed.unsupportedTags) {
      if (!diagnostics.lost.unsupportedTags.includes(t)) {
        diagnostics.lost.unsupportedTags.push(t);
      }
    }
    if (parsed.imagesMissing > 0) {
      diagnostics.lost.media.push(
        `${parsed.imagesMissing} image reference(s) in "${node.title || node.nodePath}"`
      );
    }

    const titleFromContent = sectionDoc.querySelector("sf\\:title-name, title-name");
    const fallbackTitle =
      getTextContent(titleFromContent) ||
      `${node.nodeType.charAt(0).toUpperCase() + node.nodeType.slice(1)} ${order + 1}`;

    chapters.push({
      id: uuidv4(),
      title: formatChapterTitle(flat, fallbackTitle),
      content: parsed.html.join("\n"),
      order: order++,
      sectionType: mapNodeTypeToSectionType(node.nodeType),
    });
  }

  if (chapters.length === 0) {
    chapters.push({
      id: uuidv4(),
      title: "Imported Content",
      content:
        "<p>Content could not be extracted. The file may use unsupported widgets or layout.</p>",
      order: 0,
      sectionType: "chapter",
    });
  }

  diagnostics.imported.chapters = chapters.length;
  diagnostics.imported.images = totalImages;

  const nodeTypes = contentNodes.map((n) => n.nodeType);
  const template = detectTemplate(nodeTypes);

  const warnings = buildDiagnosticsSummary(diagnostics);
  diagnostics.summary = warnings;

  return {
    book: {
      metadata: {
        title: metadata.title || file.name.replace(/\.(iba|book)$/i, ""),
        subtitle: metadata.subtitle || "",
        author: metadata.author || "",
        publisher: metadata.publisher || "Imported from iBooks Author",
        language: metadata.language || "en",
        description: metadata.description || "",
      },
      template,
      layoutMode: template === "landscape" ? "landscape" : "portrait",
      formatProfile: "standard",
      kbpSettings: { ...DEFAULT_KBP_SETTINGS },
      assets: [],
      chapters,
    },
    warnings,
    diagnostics,
  };
}

export async function importIBAFromDirectory(files: FileList): Promise<IBAImportResult> {
  const zip = new JSZip();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = file.webkitRelativePath || file.name;
    zip.file(path, file);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const packaged = new File([blob], "bundle.iba", { type: "application/octet-stream" });
  return importIBAFile(packaged);
}
