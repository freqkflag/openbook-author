import JSZip from "jszip";
import type { Book } from "@/types/book";
import { exportToEpub } from "@/lib/epub";
import type { ReadinessIssue } from "@/lib/publish-readiness";

export type EpubValidationSeverity = "error" | "warning";

export interface EpubValidationIssue {
  id: string;
  severity: EpubValidationSeverity;
  message: string;
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
  message: string
): EpubValidationIssue {
  return { id, severity, message };
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

/**
 * Validate EPUB zip structure without Java EPUBCheck.
 * Suitable for CI — checks mimetype, container.xml, and OPF presence.
 */
export async function validateEpubBytes(
  bytes: ArrayBuffer | Uint8Array | Blob
): Promise<EpubValidationResult> {
  const issues: EpubValidationIssue[] = [];

  let buffer: ArrayBuffer;
  if (bytes instanceof Blob) {
    buffer = await bytes.arrayBuffer();
  } else if (bytes instanceof Uint8Array) {
    buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } else {
    buffer = bytes;
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return summarize([
      issue("epub-invalid-zip", "error", "EPUB package is not a valid ZIP archive"),
    ]);
  }

  const mimetypeFile = zip.file("mimetype");
  if (!mimetypeFile) {
    issues.push(
      issue("epub-missing-mimetype", "warning", "EPUB is missing root mimetype file")
    );
  } else {
    const mimetype = (await mimetypeFile.async("string")).trim();
    if (mimetype !== MIMETYPE) {
      issues.push(
        issue(
          "epub-invalid-mimetype",
          "warning",
          `mimetype must be exactly "${MIMETYPE}" (found "${mimetype}")`
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
        "EPUB is missing META-INF/container.xml"
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
        "container.xml has no rootfile full-path attribute"
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
        `OPF package file not found at "${opfPath}"`
      )
    );
    const result = summarize(issues);
    result.opfPath = opfPath;
    return result;
  }

  const opf = await opfFile.async("string");
  if (!/<metadata\b/i.test(opf)) {
    issues.push(
      issue("epub-opf-no-metadata", "warning", "OPF package is missing <metadata>")
    );
  }
  if (!/<manifest\b/i.test(opf)) {
    issues.push(
      issue("epub-opf-no-manifest", "warning", "OPF package is missing <manifest>")
    );
  }
  if (!/<spine\b/i.test(opf)) {
    issues.push(
      issue("epub-opf-no-spine", "warning", "OPF package is missing <spine>")
    );
  }

  const navPresent = Boolean(zip.file("nav.xhtml") ?? zip.file("OEBPS/nav.xhtml"));
  if (!navPresent && !/<item\b[^>]*properties="[^"]*nav/i.test(opf)) {
    issues.push(
      issue(
        "epub-missing-nav",
        "warning",
        "EPUB 3 nav document not found (nav.xhtml or manifest nav item)"
      )
    );
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
    message: `EPUB structure: ${item.message}`,
  }));
}

/**
 * Optional external step: install EPUBCheck and run against an exported `.epub` file.
 * Requires Java — not invoked automatically in CI.
 *
 * Example: `epubcheck my-book.epub`
 *
 * @see https://github.com/w3c/epubcheck
 */
export function getEpubCheckCliInstructions(): string {
  return [
    "For full EPUB conformance (beyond structural checks), run W3C EPUBCheck:",
    "  1. Install Java 11+",
    "  2. Download epubcheck from https://github.com/w3c/epubcheck/releases",
    "  3. epubcheck path/to/exported-book.epub",
  ].join("\n");
}
