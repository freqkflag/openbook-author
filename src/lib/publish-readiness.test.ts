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

  it("warns on images missing alt text", () => {
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
    expect(report.issues.some((i) => i.id.startsWith("missing-alt"))).toBe(true);
  });
});
