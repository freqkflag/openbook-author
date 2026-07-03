import { ungzip } from "pako";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import type { Book, Chapter } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";

export interface IBAImportResult {
  book: Omit<Book, "id" | "createdAt" | "updatedAt">;
  warnings: string[];
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

    if (nodePath && nodeType !== "toc" && nodeType !== "glossary") {
      nodes.push({ guid, parentGuid, title, nodeType, nodePath });
    }
  });

  return nodes;
}

function paragraphsToHtml(sectionDoc: Document, assetMap: Map<string, string>): string {
  const parts: string[] = [];

  const shapes = sectionDoc.querySelectorAll(
    "sf\\:drawable-shape, drawable-shape"
  );

  shapes.forEach((shape) => {
    const tag = shape.getAttribute("sl:tag") || shape.getAttribute("tag") || "";
    const paragraphs = shape.querySelectorAll("sf\\:p, p");

  paragraphs.forEach((p) => {
      const text =
        getTextContent(p.querySelector("sf\\:ghost-text, ghost-text")) ||
        getTextContent(p.querySelector("sf\\:title-name, title-name")) ||
        getTextContent(p);

      if (!text) return;

      if (tag.includes("title") || tag.includes("chapter")) {
        parts.push(`<h1>${escapeHtml(text)}</h1>`);
      } else if (tag.includes("Section")) {
        parts.push(`<h2>${escapeHtml(text)}</h2>`);
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
      }
    });
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

  return parts.join("\n") || "<p><em>No text content extracted from this section.</em></p>";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

export async function importIBAFile(file: File): Promise<IBAImportResult> {
  const warnings: string[] = [];
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
  const contentNodes = extractContentNodes(indexDoc);
  const assetMap = await buildAssetMap(zip);

  if (contentNodes.length === 0) {
    warnings.push("No content sections found — importing as a single blank chapter.");
  }

  const chapters: Chapter[] = [];
  let order = 0;

  for (const node of contentNodes) {
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
      warnings.push(`Could not load section: ${node.title || node.nodePath}`);
      continue;
    }

    const sectionData = await sectionFile.async("uint8array");
    const sectionXml = await gunzipIfNeeded(sectionData, sectionPath);
    const sectionDoc = parser.parseFromString(sectionXml, "text/xml");
    const html = paragraphsToHtml(sectionDoc, assetMap);

    const titleFromContent = sectionDoc.querySelector("sf\\:title-name, title-name");
    const chapterTitle =
      node.title && node.title !== "Untitled"
        ? node.title
        : getTextContent(titleFromContent) ||
          `${node.nodeType.charAt(0).toUpperCase() + node.nodeType.slice(1)} ${order + 1}`;

    chapters.push({
      id: uuidv4(),
      title: chapterTitle,
      content: html,
      order: order++,
      sectionType: "chapter",
    });
  }

  if (chapters.length === 0) {
    chapters.push({
      id: uuidv4(),
      title: "Imported Content",
      content: "<p>Content could not be extracted. The file may use unsupported widgets or layout.</p>",
      order: 0,
      sectionType: "chapter",
    });
  }

  const nodeTypes = contentNodes.map((n) => n.nodeType);
  const template = detectTemplate(nodeTypes);

  warnings.push(
    "Layout and interactive widgets (quizzes, 3D, review cards) are not imported — text and images only."
  );

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
