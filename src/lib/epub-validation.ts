import JSZip from "jszip";
import type { Book } from "@/types/book";
import { exportToEpub } from "@/lib/epub";
import type { ReadinessIssue } from "@/lib/publish-readiness";

export type EpubValidationSeverity = "error" | "warning";

export interface EpubValidationIssue {
  id: string;
  severity: EpubValidationSeverity;
  message: string;
  /** Optional fix hint shown in post-export and readiness UI */
  action?: string;
}

export interface EpubValidationResult {
  issues: EpubValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** True when no structural errors remain (warnings allowed). */
  structurallyValid: boolean;
  opfPath?: string;
  /**
   * Structural checks passed but full EPUB conformance may still need
   * [EPUBCheck](https://github.com/w3c/epubcheck) (requires Java).
   */
  epubCheckRecommended: boolean;
}

const MIMETYPE = "application/epub+zip";

function issue(
  id: string,
  severity: EpubValidationSeverity,
  message: string,
  action?: string
): EpubValidationIssue {
  return { id, severity, message, action };
}

function summarize(issues: EpubValidationIssue[]): EpubValidationResult {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  return {
    issues,
    errorCount,
    warningCount,
    structurallyValid: errorCount === 0,
    epubCheckRecommended: errorCount === 0,
  };
}

function extractContainerRootfile(containerXml: string): string | null {
  const match = containerXml.match(
    /<rootfile\b[^>]*\bfull-path="([^"]*)"[^>]*\/?>/i
  );
  return match?.[1] ?? null;
}

function opfDir(opfPath: string): string {
  const slash = opfPath.lastIndexOf("/");
  return slash >= 0 ? opfPath.slice(0, slash + 1) : "";
}

function resolveOpfHref(opfPath: string, href: string): string {
  const base = opfDir(opfPath);
  if (!href.includes("/")) return `${base}${href}`;
  if (base && href.startsWith(base)) return href;
  return `${base}${href.replace(/^\.\//, "")}`;
}

function parseManifestItems(
  opf: string
): { id: string; href: string; mediaType?: string; properties?: string }[] {
  const items: { id: string; href: string; mediaType?: string; properties?: string }[] =
    [];
  const re = /<item\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(opf)) !== null) {
    const attrs = match[1];
    const id = attrs.match(/\bid="([^"]*)"/i)?.[1];
    const href = attrs.match(/\bhref="([^"]*)"/i)?.[1];
    if (!id || !href) continue;
    items.push({
      id,
      href,
      mediaType: attrs.match(/\bmedia-type="([^"]*)"/i)?.[1],
      properties: attrs.match(/\bproperties="([^"]*)"/i)?.[1],
    });
  }
  return items;
}

function parseSpineIdrefs(opf: string): string[] {
  const ids: string[] = [];
  const re = /<itemref\b[^>]*\bidref="([^"]*)"[^>]*\/?>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(opf)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function checkManifestAndSpine(
  zip: JSZip,
  opfPath: string,
  opf: string,
  issues: EpubValidationIssue[]
): void {
  const manifest = parseManifestItems(opf);
  const manifestIds = new Set(manifest.map((item) => item.id));

  for (const item of manifest) {
    const resolved = resolveOpfHref(opfPath, item.href);
    if (!zip.file(resolved)) {
      issues.push(
        issue(
          `epub-missing-manifest-file-${item.id}`,
          "warning",
          `Manifest item "${item.id}" references missing file "${item.href}"`,
          "Re-export the book or fix broken asset references in the editor"
        )
      );
    }
  }

  for (const idref of parseSpineIdrefs(opf)) {
    if (!manifestIds.has(idref)) {
      issues.push(
        issue(
          `epub-spine-orphan-${idref}`,
          "warning",
          `Spine references manifest id "${idref}" which is not declared`,
          "Re-export — this usually indicates a corrupted package"
        )
      );
    }
  }

  if (manifest.length === 0) {
    issues.push(
      issue(
        "epub-empty-manifest",
        "warning",
        "OPF manifest has no items",
        "Ensure the book has at least one chapter before export"
      )
    );
  }
}

function checkMetadata(opf: string, issues: EpubValidationIssue[]): void {
  if (!/<dc:title\b/i.test(opf)) {
    issues.push(
      issue(
        "epub-missing-dc-title",
        "warning",
        "OPF metadata is missing dc:title",
        "Set the book title in Metadata before export"
      )
    );
  }
  if (!/<dc:identifier\b/i.test(opf)) {
    issues.push(
      issue(
        "epub-missing-dc-identifier",
        "warning",
        "OPF metadata is missing dc:identifier",
        "Re-export — OpenBook assigns a UUID identifier automatically"
      )
    );
  }
  if (!/<dc:language\b/i.test(opf)) {
    issues.push(
      issue(
        "epub-missing-dc-language",
        "warning",
        "OPF metadata is missing dc:language",
        "Set the book language in Metadata"
      )
    );
  }
}

/**
 * Validate EPUB zip structure without Java EPUBCheck.
 * Suitable for CI — checks mimetype, container.xml, OPF, manifest, and spine.
 */
export async function validateEpubBytes(
  bytes: ArrayBuffer | Uint8Array | Blob
): Promise<EpubValidationResult> {
  const issues: EpubValidationIssue[] = [];

  let buffer: ArrayBuffer;
  if (bytes instanceof Blob) {
    buffer = await bytes.arrayBuffer();
  } else if (bytes instanceof Uint8Array) {
    buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
  } else {
    buffer = bytes;
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return summarize([
      issue(
        "epub-invalid-zip",
        "error",
        "EPUB package is not a valid ZIP archive",
        "Re-export the book; if the problem persists, check for disk or browser issues"
      ),
    ]);
  }

  const mimetypeFile = zip.file("mimetype");
  if (!mimetypeFile) {
    issues.push(
      issue(
        "epub-missing-mimetype",
        "warning",
        "EPUB is missing root mimetype file",
        "Re-export — mimetype must be the first uncompressed ZIP entry"
      )
    );
  } else {
    const mimetype = (await mimetypeFile.async("string")).trim();
    if (mimetype !== MIMETYPE) {
      issues.push(
        issue(
          "epub-invalid-mimetype",
          "warning",
          `mimetype must be exactly "${MIMETYPE}" (found "${mimetype}")`,
          "Re-export the EPUB from OpenBook Author"
        )
      );
    }
  }

  const containerFile = zip.file("META-INF/container.xml");
  if (!containerFile) {
    issues.push(
      issue(
        "epub-missing-container",
        "warning",
        "EPUB is missing META-INF/container.xml",
        "Re-export — container.xml is required for all EPUB readers"
      )
    );
    return summarize(issues);
  }

  const containerXml = await containerFile.async("string");
  const opfPath = extractContainerRootfile(containerXml);
  if (!opfPath) {
    issues.push(
      issue(
        "epub-container-no-rootfile",
        "warning",
        "container.xml has no rootfile full-path attribute",
        "Re-export the book"
      )
    );
    return summarize(issues);
  }

  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    issues.push(
      issue(
        "epub-missing-opf",
        "warning",
        `OPF package file not found at "${opfPath}"`,
        "Re-export — the package descriptor is missing from the archive"
      )
    );
    const result = summarize(issues);
    result.opfPath = opfPath;
    return result;
  }

  const opf = await opfFile.async("string");
  if (!/<metadata\b/i.test(opf)) {
    issues.push(
      issue("epub-opf-no-metadata", "warning", "OPF package is missing <metadata>", "Re-export the book")
    );
  } else {
    checkMetadata(opf, issues);
  }
  if (!/<manifest\b/i.test(opf)) {
    issues.push(
      issue("epub-opf-no-manifest", "warning", "OPF package is missing <manifest>", "Re-export the book")
    );
  }
  if (!/<spine\b/i.test(opf)) {
    issues.push(
      issue("epub-opf-no-spine", "warning", "OPF package is missing <spine>", "Re-export the book")
    );
  }

  if (/<manifest\b/i.test(opf)) {
    checkManifestAndSpine(zip, opfPath, opf, issues);
  }

  const navPath =
    parseManifestItems(opf).find((item) => item.properties?.includes("nav"))?.href ??
    "nav.xhtml";
  const resolvedNav = resolveOpfHref(opfPath, navPath);
  const navFile = zip.file(resolvedNav) ?? zip.file("nav.xhtml") ?? zip.file("OEBPS/nav.xhtml");

  if (!navFile) {
    issues.push(
      issue(
        "epub-missing-nav",
        "warning",
        "EPUB 3 nav document not found (nav.xhtml or manifest nav item)",
        "Re-export — navigation document is required for EPUB 3"
      )
    );
  } else {
    const navHtml = await navFile.async("string");
    if (!/epub:type="toc"/i.test(navHtml)) {
      issues.push(
        issue(
          "epub-nav-no-toc",
          "warning",
          "Nav document is missing epub:type=\"toc\" landmark",
          "Re-export — TOC navigation helps readers and store validators"
        )
      );
    }
  }

  const cssPath = parseManifestItems(opf).find((item) => item.href.endsWith(".css"))?.href;
  if (cssPath) {
    const resolvedCss = resolveOpfHref(opfPath, cssPath);
    if (!zip.file(resolvedCss)) {
      issues.push(
        issue(
          "epub-missing-css",
          "warning",
          `Stylesheet "${cssPath}" declared in manifest but missing from archive`,
          "Re-export the book"
        )
      );
    }
  }

  const result = summarize(issues);
  result.opfPath = opfPath;
  return result;
}

/** Export a book and run structural EPUB validation (no Java EPUBCheck). */
export async function validateBookEpubExport(
  book: Book,
  assetBlobs?: Map<string, Blob>
): Promise<EpubValidationResult> {
  const blob = await exportToEpub(book, assetBlobs);
  return validateEpubBytes(blob);
}

/** Map structural validation findings into publish-readiness issues (warnings only). */
export function epubValidationToReadinessIssues(
  result: EpubValidationResult
): ReadinessIssue[] {
  return result.issues.map((item) => ({
    id: item.id,
    severity: "warning" as const,
    message: item.action
      ? `EPUB structure: ${item.message} — ${item.action}`
      : `EPUB structure: ${item.message}`,
  }));
}

/** Human-readable summary for post-export validation dialogs. */
export function formatPostExportValidationMessage(
  result: EpubValidationResult,
  filename: string
): string {
  if (result.issues.length === 0) {
    return [
      `EPUB exported: ${filename}`,
      "",
      "Structural validation passed.",
      result.epubCheckRecommended
        ? "For full store conformance, run EPUBCheck and Kindle Previewer (see Publish Readiness panel)."
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lines = result.issues.slice(0, 6).map((item) => {
    const prefix = item.severity === "error" ? "✗" : "⚠";
    const action = item.action ? `\n   → ${item.action}` : "";
    return `${prefix} ${item.message}${action}`;
  });
  const extra =
    result.issues.length > 6
      ? `\n…and ${result.issues.length - 6} more issue(s)`
      : "";

  return [
    `EPUB exported: ${filename}`,
    "",
    result.structurallyValid
      ? "Structural validation found warnings:"
      : "Structural validation failed:",
    ...lines,
    extra,
    "",
    result.epubCheckRecommended
      ? "Run EPUBCheck locally for full conformance (see Publish Readiness panel)."
      : "Fix structural issues and re-export before running EPUBCheck.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Export EPUB, download, and return post-export validation result.
 * Validation runs on the same bytes written to disk.
 */
export async function downloadEpubWithValidation(
  book: Book,
  assetBlobs?: Map<string, Blob>
): Promise<EpubValidationResult> {
  const blob = await exportToEpub(book, assetBlobs);
  const result = await validateEpubBytes(blob);
  const filename = `${book.metadata.title || "book"}.epub`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  return result;
}

export interface StoreValidatorInstructions {
  platform: "macos" | "electron" | "generic";
  epubCheck: string[];
  kindlePreviewer: string[];
}

/**
 * EPUBCheck CLI steps for macOS / Electron desktop users.
 * Requires Java — not invoked automatically in CI or the browser.
 *
 * @see https://github.com/w3c/epubcheck
 */
export function getStoreValidatorInstructions(
  platform: "macos" | "electron" | "generic" = "generic"
): StoreValidatorInstructions {
  const isMac = platform === "macos" || platform === "electron";

  const epubCheck = isMac
    ? [
        "W3C EPUBCheck (full EPUB conformance — requires Java 11+):",
        "  1. brew install openjdk@17",
        "  2. Download epubcheck-*.zip from github.com/w3c/epubcheck/releases",
        "  3. java -jar epubcheck.jar path/to/exported-book.epub",
        "  Or: brew install epubcheck  (if available on your Mac)",
      ]
    : [
        "W3C EPUBCheck (full EPUB conformance — requires Java 11+):",
        "  1. Install Java 11+ from your OS package manager",
        "  2. Download epubcheck from github.com/w3c/epubcheck/releases",
        "  3. java -jar epubcheck.jar path/to/exported-book.epub",
      ];

  const kindlePreviewer = isMac
    ? [
        "Amazon Kindle Previewer (KDP layout check — macOS):",
        "  1. Download Kindle Previewer 3 from kdp.amazon.com/en/help/topic/G202131170",
        "  2. Open your exported .epub in Kindle Previewer",
        "  3. Review on Desktop / Tablet / Phone profiles before KDP upload",
        "  Electron desktop: export EPUB, then open the saved file in Kindle Previewer",
      ]
    : [
        "Amazon Kindle Previewer (KDP layout check):",
        "  1. Download Kindle Previewer from kdp.amazon.com",
        "  2. Open your exported .epub and review device profiles",
      ];

  return { platform, epubCheck, kindlePreviewer };
}

/** @deprecated Use getStoreValidatorInstructions().epubCheck */
export function getEpubCheckCliInstructions(): string {
  return getStoreValidatorInstructions("generic").epubCheck.join("\n");
}
