import { describe, expect, it } from "vitest";
import { assessPublishReadiness } from "@/lib/publish-readiness";
import type { Book } from "@/types/book";
import { serializeGuidebookBlockToHtml } from "@/lib/guidebook-seed";

function baseBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    metadata: {
      title: "Test Book",
      subtitle: "",
      author: "Test Author",
      publisher: "",
      language: "en",
      description: "",
      coverImage: "assets/cover.jpg",
    },
    template: "guidebook",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: {
      enabled: false,
      firstLineIndent: true,
      dropCaps: false,
      sceneBreakStyle: "asterisks",
      chapterNumbering: true,
    },
    chapters: [
      {
        id: "ch-1",
        title: "Chapter 1",
        content: "<p>Hello world</p>",
        order: 0,
      },
    ],
    assets: [
      {
        id: "asset-cover",
        filename: "cover.jpg",
        mimeType: "image/jpeg",
        size: 1000,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("assessPublishReadiness", () => {
  it("reports ready for a valid minimal book", () => {
    const report = assessPublishReadiness(baseBook());
    expect(report.ready).toBe(true);
    expect(report.errorCount).toBe(0);
  });

  it("flags empty chapters", () => {
    const report = assessPublishReadiness(
      baseBook({
        chapters: [
          { id: "ch-1", title: "Empty", content: "<p></p>", order: 0 },
        ],
      })
    );
    expect(report.ready).toBe(false);
    expect(report.issues.some((i) => i.id.startsWith("empty-chapter"))).toBe(true);
  });

  it("flags missing cover as warning", () => {
    const report = assessPublishReadiness(
      baseBook({
        metadata: {
          ...baseBook().metadata,
          coverImage: undefined,
        },
      })
    );
    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.id === "missing-cover")).toBe(true);
  });

  it("flags broken asset references", () => {
    const report = assessPublishReadiness(
      baseBook({
        chapters: [
          {
            id: "ch-1",
            title: "Chapter 1",
            content: '<p><img src="assets/missing.png" alt="test"/></p>',
            order: 0,
          },
        ],
      })
    );
    expect(report.ready).toBe(false);
    expect(report.issues.some((i) => i.id.startsWith("broken-asset"))).toBe(true);
  });

  it("flags invalid guidebook block payloads", () => {
    const report = assessPublishReadiness(
      baseBook({
        chapters: [
          {
            id: "ch-1",
            title: "Guide",
            content:
              '<aside data-guidebook="trail_stop" data-payload="{not-json}" class="guidebook-block"></aside>',
            order: 0,
          },
        ],
      })
    );
    expect(report.ready).toBe(false);
    expect(report.issues.some((i) => i.id.startsWith("guidebook-parse"))).toBe(true);
  });

  it("warns on guidebook blocks with empty titles", () => {
    const block = serializeGuidebookBlockToHtml("workshop", {
      title: "",
      exercises: [{ id: "ex-1", prompt: "Reflect.", responseType: "long" }],
    });
    const report = assessPublishReadiness(
      baseBook({
        chapters: [{ id: "ch-1", title: "Workshop", content: block, order: 0 }],
      })
    );
    expect(report.issues.some((i) => i.id.startsWith("guidebook-workshop-title"))).toBe(
      true
    );
  });

  it("flags images missing alt text as export errors", () => {
    const report = assessPublishReadiness(
      baseBook({
        chapters: [
          {
            id: "ch-1",
            title: "Chapter 1",
            content: '<p><img src="assets/cover.jpg"/></p>',
            order: 0,
          },
        ],
      })
    );
    expect(report.ready).toBe(false);
    const altIssue = report.issues.find((i) => i.id.startsWith("missing-alt"));
    expect(altIssue?.severity).toBe("error");
  });

  it("warns on skipped heading levels", () => {
    const report = assessPublishReadiness(
      baseBook({
        chapters: [
          {
            id: "ch-1",
            title: "Chapter 1",
            content: "<h1>Title</h1><h3>Skipped H2</h3>",
            order: 0,
          },
        ],
      })
    );
    expect(report.issues.some((i) => i.id.startsWith("heading-skip"))).toBe(true);
  });

  it("warns on multiple H1 headings in one section", () => {
    const report = assessPublishReadiness(
      baseBook({
        chapters: [
          {
            id: "ch-1",
            title: "Chapter 1",
            content: "<h1>One</h1><h1>Two</h1>",
            order: 0,
          },
        ],
      })
    );
    expect(report.issues.some((i) => i.id.startsWith("multiple-h1"))).toBe(true);
  });

  it("warns on duplicate chapter titles", () => {
    const report = assessPublishReadiness(
      baseBook({
        chapters: [
          { id: "ch-1", title: "Introduction", content: "<p>A</p>", order: 0 },
          { id: "ch-2", title: "Introduction", content: "<p>B</p>", order: 1 },
        ],
      })
    );
    expect(report.issues.some((i) => i.id.startsWith("duplicate-title"))).toBe(true);
  });

  it("flags empty TOC when all chapter titles are blank", () => {
    const report = assessPublishReadiness(
      baseBook({
        chapters: [
          { id: "ch-1", title: "   ", content: "<p>Body</p>", order: 0 },
        ],
      })
    );
    expect(report.ready).toBe(false);
    expect(report.issues.some((i) => i.id === "empty-toc")).toBe(true);
  });

  it("warns when KBP chapters lack H1 headings", () => {
    const report = assessPublishReadiness(
      baseBook({
        formatProfile: "kbp",
        kbpSettings: { ...baseBook().kbpSettings, enabled: true },
        chapters: [
          {
            id: "ch-1",
            title: "Chapter 1",
            content: "<p>No heading here</p>",
            order: 0,
          },
        ],
      })
    );
    expect(report.issues.some((i) => i.id.startsWith("missing-h1"))).toBe(true);
  });

  it("warns on KBP store metadata gaps", () => {
    const report = assessPublishReadiness(
      baseBook({
        formatProfile: "kbp",
        metadata: {
          ...baseBook().metadata,
          description: "Too short.",
          isbn: "",
          bisac: [],
          keywords: [],
        },
      })
    );
    expect(report.issues.some((i) => i.id === "kbp-description-short")).toBe(true);
    expect(report.issues.some((i) => i.id === "kbp-missing-isbn")).toBe(true);
    expect(report.issues.some((i) => i.id === "kbp-missing-keywords")).toBe(true);
    expect(report.issues.some((i) => i.id === "kbp-missing-bisac")).toBe(true);
  });

  it("warns when custom export CSS references missing assets", () => {
    const report = assessPublishReadiness(
      baseBook({
        exportTheme: {
          themeId: "classic-serif",
          customCss: '.hero { background: url("assets/missing.png"); }',
        },
      })
    );
    expect(report.issues.some((i) => i.id.startsWith("custom-css-asset"))).toBe(true);
    expect(report.ready).toBe(true);
  });
});
