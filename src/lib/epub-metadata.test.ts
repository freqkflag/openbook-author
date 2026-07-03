import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import {
  bookHasVisualContent,
  bookImagesHaveAltText,
  deriveEpubAccessibilityMetadata,
  exportToEpub,
} from "@/lib/epub";
import { validateBookEpubExport } from "@/lib/epub-validation";

function fixtureBook(overrides?: Partial<Book>): Book {
  return {
    id: "epub-metadata-fixture",
    metadata: {
      title: "Metadata Fixture",
      subtitle: "",
      author: "Test Author",
      publisher: "OpenBook",
      language: "en",
      description: "Fixture for EPUB 3.3 metadata",
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [
      {
        id: "ch-1",
        title: "Chapter One",
        content: "<h1>Chapter One</h1><p>Body text.</p>",
        order: 0,
      },
    ],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

async function readOpf(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return (await zip.file("content.opf")?.async("string")) ?? "";
}

describe("deriveEpubAccessibilityMetadata", () => {
  it("derives textual-only access modes for text-only books", () => {
    const derived = deriveEpubAccessibilityMetadata(fixtureBook());
    expect(derived.accessModes).toEqual(["textual"]);
    expect(derived.accessModeSufficient).toEqual(["textual"]);
    expect(derived.features).toContain("structuralNavigation");
    expect(derived.features).toContain("tableOfContents");
    expect(derived.features).not.toContain("alternativeText");
    expect(derived.hazards).toContain("noFlashingHazard");
  });

  it("adds visual access mode and alternativeText when images have alt", () => {
    const book = fixtureBook({
      chapters: [
        {
          id: "ch-img",
          title: "Illustrated",
          content:
            '<p>Scene.</p><img src="assets/photo.jpg" alt="Mountain trail at sunrise"/>',
          order: 0,
        },
      ],
    });
    expect(bookHasVisualContent(book)).toBe(true);
    expect(bookImagesHaveAltText(book)).toBe(true);

    const derived = deriveEpubAccessibilityMetadata(book);
    expect(derived.accessModes).toEqual(["textual", "visual"]);
    expect(derived.features).toContain("alternativeText");
  });

  it("omits alternativeText when an image lacks alt text", () => {
    const book = fixtureBook({
      chapters: [
        {
          id: "ch-img",
          title: "Illustrated",
          content: '<p>Scene.</p><img src="assets/photo.jpg"/>',
          order: 0,
        },
      ],
    });
    expect(bookImagesHaveAltText(book)).toBe(false);
    const derived = deriveEpubAccessibilityMetadata(book);
    expect(derived.features).not.toContain("alternativeText");
  });
});

describe("EPUB 3.3 package metadata export", () => {
  it("emits package version 3.3", async () => {
    const opf = await readOpf(await exportToEpub(fixtureBook()));
    expect(opf).toContain('version="3.3"');
    expect(opf).not.toContain('version="3.0"');
  });

  it("includes default schema.org accessibility metadata", async () => {
    const opf = await readOpf(await exportToEpub(fixtureBook()));

    expect(opf).toContain('<meta property="schema:accessMode">textual</meta>');
    expect(opf).toContain(
      '<meta property="schema:accessModeSufficient">textual</meta>'
    );
    expect(opf).toContain(
      '<meta property="schema:accessibilityFeature">structuralNavigation</meta>'
    );
    expect(opf).toContain(
      '<meta property="schema:accessibilityFeature">tableOfContents</meta>'
    );
    expect(opf).toContain(
      '<meta property="schema:accessibilityHazard">noFlashingHazard</meta>'
    );
    expect(opf).toContain('<meta property="schema:accessibilitySummary">');
  });

  it("uses author-provided accessibility summary when set", async () => {
    const book = fixtureBook({
      metadata: {
        ...fixtureBook().metadata,
        accessibilitySummary: "Custom summary for screen reader users.",
      },
    });
    const opf = await readOpf(await exportToEpub(book));
    expect(opf).toContain(
      '<meta property="schema:accessibilitySummary">Custom summary for screen reader users.</meta>'
    );
  });

  it("emits certifier and certifierCredential when claim fields are set", async () => {
    const book = fixtureBook({
      metadata: {
        ...fixtureBook().metadata,
        accessibilityClaim: "EPUB Accessibility 1.1 — WCAG 2.0 Level A",
        accessibilityCertifier: "OpenBook Author",
      },
    });
    const opf = await readOpf(await exportToEpub(book));
    expect(opf).toContain(
      '<meta property="schema:certifierCredential">EPUB Accessibility 1.1 — WCAG 2.0 Level A</meta>'
    );
    expect(opf).toContain(
      '<meta property="schema:certifier">OpenBook Author</meta>'
    );
  });

  it("adds visual access mode when cover image is set", async () => {
    const book = fixtureBook({
      metadata: {
        ...fixtureBook().metadata,
        coverImage: "assets/cover.jpg",
      },
      assets: [
        {
          id: "asset-cover",
          filename: "cover.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const opf = await readOpf(await exportToEpub(book));
    expect(opf).toContain('<meta property="schema:accessMode">visual</meta>');
  });

  it("passes structural validation after metadata upgrade", async () => {
    const result = await validateBookEpubExport(fixtureBook());
    expect(result.structurallyValid).toBe(true);
    expect(result.errorCount).toBe(0);
  });
});
