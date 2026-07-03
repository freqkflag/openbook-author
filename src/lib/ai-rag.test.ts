import { describe, expect, it } from "vitest";
import {
  buildBookChunkIndex,
  chunkPlainText,
  formatChunksForPrompt,
  retrieveRelevantChunks,
} from "@/lib/ai-rag";
import type { Chapter } from "@/types/book";

const chapters: Chapter[] = [
  {
    id: "ch-1",
    title: "The Meeting",
    content:
      "<p>Alice met Bob in Seattle on March 3, 2024. Alice was thirty-two years old.</p>",
    order: 0,
  },
  {
    id: "ch-2",
    title: "The Journey",
    content:
      "<p>Allice traveled to Portland the next day. Bob stayed behind; he was forty in this chapter.</p>",
    order: 1,
  },
  {
    id: "ch-3",
    title: "Timeline",
    content: "<p>Two years later, in 2023, they reunited in Seattle again.</p>",
    order: 2,
  },
];

describe("ai-rag", () => {
  it("chunks plain text with overlap", () => {
    const long = "word ".repeat(120).trim();
    const chunks = chunkPlainText(long, "ch-x", "Test");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.chapterId).toBe("ch-x");
  });

  it("indexes all chapters", () => {
    const index = buildBookChunkIndex(chapters);
    expect(index.length).toBeGreaterThanOrEqual(3);
    expect(index.some((c) => c.chapterTitle === "The Meeting")).toBe(true);
  });

  it("retrieves chunks relevant to character and timeline queries", () => {
    const index = buildBookChunkIndex(chapters);
    const picked = retrieveRelevantChunks(index, {
      topK: 5,
      queries: ["Alice character name", "timeline dates years"],
    });
    expect(picked.length).toBeGreaterThan(0);
    const text = formatChunksForPrompt(picked);
    expect(text).toMatch(/Alice|Allice|Seattle|2024|2023/);
  });

  it("formats chunks with chapter titles", () => {
    const index = buildBookChunkIndex(chapters);
    const formatted = formatChunksForPrompt(index.slice(0, 1));
    expect(formatted).toContain("[The Meeting]");
  });
});
