import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { exportToEpub } from "@/lib/epub";
import {
  epubValidationToReadinessIssues,
  getEpubCheckCliInstructions,
  validateBookEpubExport,
  validateEpubBytes,
} from "@/lib/epub-validation";
import { assessPublishReadinessWithEpub } from "@/lib/publish-readiness";

function fixtureBook(): Book {
  return {
    id: "epub-validation-fixture",
    metadata: {
      title: "Validation Fixture",
      subtitle: "",
      author: "Test Author",
      publisher: "OpenBook",
      language: "en",
      description: "Fixture for EPUB structural validation",
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [
      {
        id: "ch-1",
        title: "Chapter One",
        content: "<h1>Chapter One</h1><p>Body text for validation.</p>",
        order: 0,
      },
    ],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function buildMinimalInvalidEpub(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  return zip.generateAsync({ type: "arraybuffer" });
}

async function buildEpubMissingOpf(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.folder("META-INF")?.file(
    "container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="missing.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("validateEpubBytes", () => {
  it("rejects non-zip data", async () => {
    const result = await validateEpubBytes(new TextEncoder().encode("not a zip"));
    expect(result.structurallyValid).toBe(false);
    expect(result.issues.some((i) => i.id === "epub-invalid-zip")).toBe(true);
  });

  it("warns when mimetype, container.xml, or opf are missing", async () => {
    const buffer = await buildMinimalInvalidEpub();
    const result = await validateEpubBytes(buffer);

    expect(result.issues.some((i) => i.id === "epub-missing-container")).toBe(true);
  });

  it("warns when container references a missing OPF", async () => {
    const buffer = await buildEpubMissingOpf();
    const result = await validateEpubBytes(buffer);

    expect(result.issues.some((i) => i.id === "epub-missing-opf")).toBe(true);
    expect(result.opfPath).toBe("missing.opf");
  });
});

describe("validateBookEpubExport", () => {
  it("passes structural checks for an exported fixture book", async () => {
    const book = fixtureBook();
    const blob = await exportToEpub(book);
    const bytes = await blob.arrayBuffer();

    const result = await validateEpubBytes(bytes);

    expect(result.structurallyValid).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.opfPath).toBe("content.opf");
    expect(result.epubCheckRecommended).toBe(true);
  });

  it("validates via validateBookEpubExport helper", async () => {
    const result = await validateBookEpubExport(fixtureBook());
    expect(result.structurallyValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("finds mimetype, container.xml, and opf in exported bytes", async () => {
    const blob = await exportToEpub(fixtureBook());
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect((await zip.file("mimetype")?.async("string"))?.trim()).toBe(
      "application/epub+zip"
    );
    expect(zip.file("META-INF/container.xml")).toBeTruthy();
    expect(zip.file("content.opf")).toBeTruthy();
    expect(zip.file("nav.xhtml")).toBeTruthy();
  });
});

describe("publish-readiness EPUB integration", () => {
  it("maps structural findings to readiness warnings only", () => {
    const readinessIssues = epubValidationToReadinessIssues({
      issues: [
        {
          id: "epub-missing-mimetype",
          severity: "error",
          message: "EPUB is missing root mimetype file",
        },
      ],
      errorCount: 1,
      warningCount: 0,
      structurallyValid: false,
      epubCheckRecommended: false,
    });

    expect(readinessIssues).toHaveLength(1);
    expect(readinessIssues[0].severity).toBe("warning");
    expect(readinessIssues[0].id).toBe("epub-missing-mimetype");
  });

  it("merges EPUB warnings into assessPublishReadinessWithEpub", async () => {
    const report = await assessPublishReadinessWithEpub(fixtureBook());
    expect(report.ready).toBe(true);
    expect(report.issues.every((i) => i.id.startsWith("epub-") === false)).toBe(true);
  });
});

describe("EPUBCheck external step", () => {
  it("documents optional CLI validation", () => {
    const instructions = getEpubCheckCliInstructions();
    expect(instructions).toContain("EPUBCheck");
    expect(instructions).toContain("epubcheck");
  });
});
