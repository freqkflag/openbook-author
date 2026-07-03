import JSZip from "jszip";
import mammoth from "mammoth";
import { v4 as uuidv4 } from "uuid";
import type { Book, BookAsset, Chapter } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { assetPath, sanitizeFilename } from "@/lib/asset-store";

export interface DocxImportResult {
  book: Omit<Book, "id" | "createdAt" | "updatedAt">;
  assetBlobs: Map<string, Blob>;
  warnings: string[];
}

interface DocxMetadata {
  title: string;
  author: string;
  language: string;
  description: string;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractCoreProperty(xml: string, tag: string): string {
  const dcMatch = xml.match(new RegExp(`<(?:dc:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:dc:)?${tag}>`, "i"));
  if (dcMatch) return decodeXmlEntities(dcMatch[1].trim());
  const cpMatch = xml.match(
    new RegExp(`<(?:cp:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:cp:)?${tag}>`, "i")
  );
  return cpMatch ? decodeXmlEntities(cpMatch[1].trim()) : "";
}

function stripTags(html: string): string {
  return decodeXmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
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

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".jpg";
  }
}

async function extractDocxMetadata(zip: JSZip): Promise<DocxMetadata> {
  const coreXml = await zip.file("docProps/core.xml")?.async("string");
  if (!coreXml) {
    return { title: "", author: "", language: "en", description: "" };
  }
  return {
    title: extractCoreProperty(coreXml, "title"),
    author: extractCoreProperty(coreXml, "creator"),
    language: extractCoreProperty(coreXml, "language") || "en",
    description: extractCoreProperty(coreXml, "description"),
  };
}

function countDocxNoteReferences(documentXml: string): { footnotes: number; endnotes: number } {
  const footnotes = (documentXml.match(/<w:footnoteReference\b/gi) ?? []).length;
  const endnotes = (documentXml.match(/<w:endnoteReference\b/gi) ?? []).length;
  return { footnotes, endnotes };
}

function sanitizeDocumentXmlForMammoth(documentXml: string): string {
  return documentXml
    .replace(/<w:footnoteReference\b[^>]*\/>/gi, "")
    .replace(/<w:endnoteReference\b[^>]*\/>/gi, "");
}

async function bufferForMammoth(zip: JSZip, documentXml: string): Promise<Buffer | ArrayBuffer> {
  const sanitized = sanitizeDocumentXmlForMammoth(documentXml);
  zip.file("word/document.xml", sanitized);
  const output = await zip.generateAsync({ type: "uint8array" });
  if (typeof Buffer !== "undefined") {
    return Buffer.from(output);
  }
  return output.buffer.slice(
    output.byteOffset,
    output.byteOffset + output.byteLength
  ) as ArrayBuffer;
}

function countHtmlElements(html: string, tag: string): number {
  const re = new RegExp(`<${tag}\\b`, "gi");
  return (html.match(re) ?? []).length;
}

function pickSplitHeadingLevel(html: string): "h1" | "h2" | null {
  if (/<h1\b/i.test(html)) return "h1";
  if (/<h2\b/i.test(html)) return "h2";
  return null;
}

function splitHtmlByHeading(
  html: string,
  level: "h1" | "h2"
): { title: string; content: string }[] {
  const re = new RegExp(`<${level}\\b[^>]*>([\\s\\S]*?)<\\/${level}>`, "gi");
  const matches = [...html.matchAll(re)];
  if (matches.length === 0) {
    return [{ title: "", content: html.trim() }];
  }

  const sections: { title: string; content: string }[] = [];
  const firstIndex = matches[0].index ?? 0;
  const preamble = html.slice(0, firstIndex).trim();
  if (preamble) {
    sections.push({ title: "Introduction", content: preamble });
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? html.length) : html.length;
    const title = stripTags(match[1]) || `Section ${sections.length + 1}`;
    const content = html.slice(start, end).trim();
    sections.push({ title, content });
  }

  return sections;
}

function buildImportReport(
  html: string,
  noteCounts: { footnotes: number; endnotes: number },
  mammothMessages: Array<{ type: string; message: string }>
): string[] {
  const warnings: string[] = [];

  for (const message of mammothMessages) {
    if (message.type === "warning") {
      warnings.push(message.message);
    }
  }

  const tableCount = countHtmlElements(html, "table");
  if (tableCount > 0) {
    warnings.push(
      `${tableCount} table(s) imported as HTML — review column layout in the editor.`
    );
  }

  if (noteCounts.footnotes > 0) {
    warnings.push(
      `${noteCounts.footnotes} footnote(s) in the Word document could not be converted — re-add as editor footnotes if needed.`
    );
  }
  if (noteCounts.endnotes > 0) {
    warnings.push(
      `${noteCounts.endnotes} endnote(s) in the Word document could not be converted — re-add as editor endnotes if needed.`
    );
  }

  return warnings;
}

export async function importDocxFile(file: File | Blob): Promise<DocxImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }

  const docMeta = await extractDocxMetadata(zip);
  const noteCounts = countDocxNoteReferences(documentXml);
  const mammothBuffer = await bufferForMammoth(zip, documentXml);

  const assets: BookAsset[] = [];
  const assetBlobs = new Map<string, Blob>();
  const usedFilenames = new Set<string>();
  let imageCounter = 0;

  const mammothInput =
    typeof Buffer !== "undefined"
      ? { buffer: mammothBuffer as Buffer }
      : { arrayBuffer: mammothBuffer as ArrayBuffer };

  const { value: html, messages } = await mammoth.convertToHtml(mammothInput, {
    convertImage: mammoth.images.imgElement(async (image) => {
      const data = await image.readAsArrayBuffer();
      const mimeType = image.contentType || "image/jpeg";
      imageCounter += 1;
      const filename = nextUniqueFilename(
        usedFilenames,
        `imported-image-${imageCounter}${extensionForMime(mimeType)}`
      );
      const asset: BookAsset = {
        id: uuidv4(),
        filename,
        mimeType,
        size: data.byteLength,
        createdAt: new Date().toISOString(),
      };
      assets.push(asset);
      assetBlobs.set(asset.id, new Blob([data], { type: mimeType }));
      return { src: assetPath(filename) };
    }),
  });

  const trimmedHtml = html.trim();
  if (!trimmedHtml) {
    throw new Error("DOCX contains no importable body content");
  }

  const warnings = buildImportReport(trimmedHtml, noteCounts, messages);
  const splitLevel = pickSplitHeadingLevel(trimmedHtml);
  const rawSections = splitLevel
    ? splitHtmlByHeading(trimmedHtml, splitLevel)
    : [{ title: "", content: trimmedHtml }];

  const chapters: Chapter[] = rawSections.map((section, index) => {
    const fallbackTitle =
      index === 0 && docMeta.title && !splitLevel ? docMeta.title : `Chapter ${index + 1}`;
    return {
      id: uuidv4(),
      title: section.title || fallbackTitle,
      content: section.content,
      order: index,
      sectionType: "chapter" as const,
    };
  });

  const book: Omit<Book, "id" | "createdAt" | "updatedAt"> = {
    metadata: {
      title: docMeta.title || chapters[0]?.title || "Imported DOCX",
      subtitle: "",
      author: docMeta.author,
      publisher: "",
      language: docMeta.language,
      description: docMeta.description,
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
