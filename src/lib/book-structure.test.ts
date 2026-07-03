import { describe, expect, it } from "vitest";
import { assessPublishReadiness } from "@/lib/publish-readiness";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import type { Book } from "@/types/book";

function baseBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "readiness-parts",
    metadata: {
      title: "Test",
      subtitle: "",
      author: "Author",
      publisher: "",
      language: "en",
      description: "Desc",
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [
      { id: "ch-1", title: "Chapter 1", content: "<p>Body</p>", order: 0 },
    ],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("publish readiness — hierarchical parts", () => {
  it("flags empty parts as blocking errors", () => {
    const report = assessPublishReadiness(
      baseBook({
        parts: [
          { id: "part-1", title: "Part I", order: 0, chapterIds: [] },
        ],
      })
    );
    expect(report.ready).toBe(false);
    expect(report.issues.some((i) => i.id === "empty-part-part-1")).toBe(true);
  });

  it("warns when a part has no title", () => {
    const report = assessPublishReadiness(
      baseBook({
        parts: [
          { id: "part-1", title: "  ", order: 0, chapterIds: ["ch-1"] },
        ],
      })
    );
    expect(report.issues.some((i) => i.id === "empty-part-title-part-1")).toBe(true);
    expect(report.ready).toBe(true);
  });
});
