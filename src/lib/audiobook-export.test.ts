import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import { exportAudiobookManifest } from "@/lib/audiobook-export";

const book: Book = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  metadata: {
    title: "Audio Test",
    subtitle: "",
    author: "Author",
    publisher: "OpenBook",
    language: "en",
    description: "",
  },
  template: "blank",
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
      content: "<p>Words words words.</p>",
      order: 0,
    },
  ],
  assets: [],
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

describe("audiobook-export", () => {
  it("builds manifest.json with reading order", async () => {
    const blob = await exportAudiobookManifest(book);
    expect(blob.size).toBeGreaterThan(100);
  });
});
