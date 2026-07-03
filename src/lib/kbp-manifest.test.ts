import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { kbpManifest } from "@/lib/kbp";

function createBook(overrides?: Partial<Book>): Book {
  return {
    id: "kbp-test",
    metadata: {
      title: "Neon Dreams",
      subtitle: "",
      author: "Joey King",
      publisher: "Neon Press",
      language: "en",
      description: "A cyberpunk tale.",
      isbn: "9783161484100",
      bisac: ["FIC028000"],
      keywords: ["cyberpunk"],
      ageRating: "17+",
      series: "Neon Saga",
      seriesIndex: 1,
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "kbp",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [
      {
        id: "ch-1",
        title: "Chapter One",
        content: "<h1>Chapter One</h1><p>Body.</p>",
        order: 0,
      },
    ],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("kbpManifest", () => {
  it("includes store metadata fields when set", () => {
    const manifest = kbpManifest(createBook());

    expect(manifest.title).toBe("Neon Dreams");
    expect(manifest.description).toBe("A cyberpunk tale.");
    expect(manifest.store).toEqual({
      isbn: "9783161484100",
      bisac: ["FIC028000"],
      keywords: ["cyberpunk"],
      ageRating: "17+",
      series: "Neon Saga",
      seriesIndex: 1,
    });
  });

  it("omits empty store fields from manifest", () => {
    const manifest = kbpManifest(
      createBook({
        metadata: {
          title: "Minimal",
          subtitle: "",
          author: "Author",
          publisher: "",
          language: "en",
          description: "",
          isbn: "",
          bisac: [],
          keywords: [],
          ageRating: "",
          series: "",
        },
      })
    );

    expect(manifest.store.isbn).toBeUndefined();
    expect(manifest.store.bisac).toBeUndefined();
    expect(manifest.store.keywords).toBeUndefined();
    expect(manifest.store.ageRating).toBeUndefined();
    expect(manifest.store.series).toBeUndefined();
  });
});
